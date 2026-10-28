"""EcoTrack AI - Flask REST API.

Local demo application: there is no login. All data belongs to one local
demo user (id = 1) stored in ecotrack.db next to this file.

Run:  python app.py   ->  http://127.0.0.1:5000/api/health
"""
import csv
import io
import os

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

import repository as repo
from advisor import build_recommendations, potential_savings, simulate
from calculator import CALCULATION_VERSION, calculate, validate_activity
from db import DB_PATH, DEMO_USER_ID
from factors import load_factor_values
from init_all import bootstrap
from insights import build_insights, categories_of, month_comparison
from ml.predictor import ModelNotReady, forecast, load_model
from seed_demo import seed_demo_records

ACTIVITY_FIELDS = ["month", "vehicle_type", "fuel_type", "electricity_kwh", "renewable_pct",
                   "household_members", "car_km", "two_wheeler_km", "public_transport_km",
                   "public_transport_mode", "lpg_kg"]


def error(message, status=400, details=None):
    body = {"error": message}
    if details:
        body["details"] = details
    return jsonify(body), status


def json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def record_to_activity(record):
    return {k: record[k] for k in ACTIVITY_FIELDS}


def safe_forecast(records):
    """Run the model; return (forecast_or_None, error_message_or_None)."""
    if not records:
        return None, "No saved months yet - add a calculation to get a forecast."
    try:
        return forecast(records), None
    except ModelNotReady as exc:
        return None, str(exc)


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    bootstrap(train_if_missing=True)

    # ---------- errors: always JSON ----------
    @app.errorhandler(HTTPException)
    def handle_http(exc):
        return error(exc.description or exc.name, exc.code)

    @app.errorhandler(Exception)
    def handle_unexpected(exc):  # pragma: no cover - safety net
        app.logger.exception("Unhandled error")
        return error("Internal server error. Check the backend terminal for details.", 500)

    # ---------- health ----------
    @app.get("/api/health")
    def health():
        try:
            _, meta = load_model()
            model = {"ready": True, "version": meta["model_version"]}
        except ModelNotReady:
            model = {"ready": False, "version": None}
        return jsonify({"status": "ok", "database": DB_PATH.name, "model": model,
                        "mode": "local-demo", "authentication": "none (single local demo user)"})

    # ---------- dashboard ----------
    @app.get("/api/dashboard")
    def dashboard():
        user = repo.get_user()
        records = repo.list_records()
        if not records:
            return jsonify({"user": user, "has_data": False, "records": [], "is_demo_data": False})

        latest = records[-1]
        previous = records[-2] if len(records) > 1 else None
        last12 = records[-12:]
        annual = sum(r["total_emissions"] for r in last12) / len(last12) * 12
        fc, fc_error = safe_forecast(records)
        factors = load_factor_values()
        recs = build_recommendations(record_to_activity(latest), factors)
        savings = potential_savings(recs)
        cats = categories_of(latest)
        largest = max(cats, key=lambda c: c["value"])

        recent = sorted(records, key=lambda r: (r["created_at"], r["id"]), reverse=True)[:4]
        activity_feed = [{"type": "record", "title": f"Footprint saved for {r['month']}",
                          "detail": f"{r['total_emissions']:.1f} kg CO2e", "is_demo": bool(r["is_demo"]),
                          "timestamp": r["created_at"]} for r in recent]
        for p in repo.list_predictions(limit=3):
            activity_feed.append({"type": "prediction", "title": f"Forecast generated for {p['predicted_month']}",
                                  "detail": f"{p['predicted_emissions']:.1f} kg CO2e", "is_demo": False,
                                  "timestamp": p["created_at"]})
        activity_feed.sort(key=lambda e: e["timestamp"], reverse=True)

        return jsonify({
            "user": user,
            "has_data": True,
            "is_demo_data": any(r["is_demo"] for r in records),
            "records": records,
            "latest": latest,
            "previous": previous,
            "kpis": {
                "monthly_total": latest["total_emissions"],
                "monthly_month": latest["month"],
                "monthly_change_pct": round((latest["total_emissions"] - previous["total_emissions"])
                                            / previous["total_emissions"] * 100, 1)
                if previous and previous["total_emissions"] else None,
                "annual_estimate": round(annual, 2),
                "annual_method": f"Average of your last {len(last12)} saved month(s) x 12",
                "predicted_next": fc["predicted_emissions"] if fc else None,
                "predicted_month": fc["predicted_month"] if fc else None,
                "predicted_change_pct": fc["change_pct"] if fc else None,
                "prediction_error": fc_error,
                "potential_savings": savings,
                "potential_savings_pct": round(savings / latest["total_emissions"] * 100, 1)
                if latest["total_emissions"] else 0,
            },
            "breakdown": cats,
            "largest_contributor": largest,
            "comparison": month_comparison(latest, previous),
            "insights": build_insights(records),
            "recent_activity": activity_feed[:6],
            "recommendations": recs[:3],
            "actual_vs_predicted": fc["backtest"] if fc else [],
            "forecast": fc,
        })

    # ---------- calculator ----------
    @app.post("/api/calculate")
    def calculate_endpoint():
        clean, errors = validate_activity(json_body())
        if errors:
            return error("Some inputs are invalid.", 422, errors)
        factors = load_factor_values()
        result = calculate(clean, factors)
        return jsonify({"input": clean, "result": result,
                        "recommendations": build_recommendations(clean, factors)[:4]})

    # ---------- activities ----------
    @app.post("/api/activities")
    def create_activity():
        body = json_body()
        clean, errors = validate_activity(body, require_month=True)
        if errors:
            return error("Some inputs are invalid.", 422, errors)
        replace = bool(body.get("replace"))
        try:
            record_id = repo.save_activity(clean, replace=replace)
        except repo.DuplicateMonth:
            return error(f"You already saved a record for {clean['month']}. Replace it or choose another month.",
                         409, {"month": "duplicate"})
        return jsonify({"message": "Saved", "record": repo.get_record(record_id)}), 201

    @app.delete("/api/activities/<int:record_id>")
    def delete_activity(record_id):
        if not repo.delete_record(record_id):
            return error("Record not found.", 404)
        return jsonify({"message": "Deleted", "id": record_id})

    @app.post("/api/demo/reset")
    def reset_demo():
        count = seed_demo_records(reset=True)
        return jsonify({"message": f"Demo data restored ({count} months)."})

    # ---------- history ----------
    @app.get("/api/history")
    def history():
        month = request.args.get("month") or None
        start = request.args.get("from") or None
        end = request.args.get("to") or None
        for name, val in (("month", month), ("from", start), ("to", end)):
            if val and not validate_activity({"month": val})[0].get("month"):
                return error(f"'{name}' must use the format YYYY-MM.", 400)
        records = repo.list_records(month=month, start=start, end=end)
        all_months = [r["month"] for r in repo.list_records()]
        totals = {}
        for r in records:
            for c in categories_of(r):
                totals[c["key"]] = totals.get(c["key"], 0) + c["value"]
        highest = None
        if records and sum(totals.values()) > 0:
            key = max(totals, key=totals.get)
            label = next(c["label"] for c in categories_of(records[0]) if c["key"] == key)
            highest = {"key": key, "label": label, "value": round(totals[key], 2),
                       "share": round(totals[key] / sum(totals.values()) * 100, 1)}
        return jsonify({
            "records": records,
            "available_months": all_months,
            "summary": {
                "count": len(records),
                "total": round(sum(r["total_emissions"] for r in records), 2),
                "average": round(sum(r["total_emissions"] for r in records) / len(records), 2) if records else 0,
                "highest_category": highest,
                "category_totals": {k: round(v, 2) for k, v in totals.items()},
            },
        })

    @app.get("/api/export")
    def export_csv():
        records = repo.list_records()
        buf = io.StringIO()
        cols = ["month", "vehicle_type", "fuel_type", "car_km", "two_wheeler_km", "public_transport_km",
                "public_transport_mode", "electricity_kwh", "renewable_pct", "household_members", "lpg_kg",
                "electricity_emissions", "car_emissions", "two_wheeler_emissions", "public_transport_emissions",
                "transport_emissions", "cooking_emissions", "total_emissions", "calculation_version", "is_demo"]
        writer = csv.writer(buf)
        writer.writerow(cols)
        for r in records:
            writer.writerow([r[c] for c in cols])
        return Response(buf.getvalue(), mimetype="text/csv",
                        headers={"Content-Disposition": "attachment; filename=ecotrack_records.csv"})

    # ---------- predictions (real ML) ----------
    @app.get("/api/predictions")
    def predictions():
        try:
            _, meta = load_model()
        except ModelNotReady as exc:
            return error(str(exc), 503)
        records = repo.list_records()
        fc, fc_error = safe_forecast(records)
        history_series = [{"month": r["month"], "actual": r["total_emissions"]} for r in records]
        return jsonify({"model": meta, "forecast": fc, "forecast_error": fc_error,
                        "history": history_series, "saved_predictions": repo.list_predictions()})

    @app.post("/api/predict")
    def predict():
        records = repo.list_records()
        if not records:
            return error("Save at least one month of activity before requesting a prediction.", 409)
        try:
            fc = forecast(records)
        except ModelNotReady as exc:
            return error(str(exc), 503)
        pid = repo.save_prediction(fc)
        return jsonify({"prediction_id": pid, "forecast": fc}), 201

    # ---------- advisor ----------
    @app.get("/api/recommendations")
    def recommendations():
        records = repo.list_records()
        if not records:
            return jsonify({"has_data": False, "recommendations": [], "baseline": None})
        latest = records[-1]
        factors = load_factor_values()
        activity = record_to_activity(latest)
        recs = build_recommendations(activity, factors)
        repo.replace_recommendations(recs)
        return jsonify({
            "has_data": True,
            "baseline": latest,
            "breakdown": categories_of(latest),
            "recommendations": recs,
            "potential_savings": potential_savings(recs),
            "method": "Rule-based and explainable: each saving = activity change x published emission factor.",
        })

    @app.post("/api/simulate")
    def simulate_endpoint():
        body = json_body()
        if body is None:
            return error("Request body must be a JSON object.", 400)
        if body.get("activity"):
            activity, errors = validate_activity(body["activity"])
            if errors:
                return error("Some inputs are invalid.", 422, errors)
        else:
            records = repo.list_records()
            if not records:
                return error("No saved records to simulate. Save a calculation first.", 409)
            activity = record_to_activity(records[-1])
        levers = {}
        for key in ("car_reduction_pct", "pt_substitution_pct", "electricity_reduction_pct",
                    "lpg_reduction_pct", "renewable_pct"):
            val = body.get(key)
            if val is None or val == "":
                continue
            try:
                num = float(val)
            except (TypeError, ValueError):
                return error(f"'{key}' must be a number between 0 and 100.", 422)
            if not 0 <= num <= 100:
                return error(f"'{key}' must be between 0 and 100.", 422)
            levers[key] = num
        return jsonify(simulate(activity, load_factor_values(), **levers))

    # ---------- methodology ----------
    @app.get("/api/emission-factors")
    def emission_factors():
        return jsonify({"factors": repo.list_factors(), "calculation_version": CALCULATION_VERSION,
                        "formula": "Emissions (kg CO2e) = Activity data x Emission factor"})

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"EcoTrack AI API running on http://127.0.0.1:{port}  (demo user id {DEMO_USER_ID})")
    app.run(host="127.0.0.1", port=port, debug=False)
