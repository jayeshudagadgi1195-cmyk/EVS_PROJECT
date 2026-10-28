"""Load the trained model and use it on the user's saved records."""
import json
import sys
from pathlib import Path

import joblib
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ml.synthetic import FEATURES, month_angle, next_month  # noqa: E402
from ml.train import META_PATH, MODEL_PATH  # noqa: E402

_cache = {"model": None, "meta": None, "mtime": None}


class ModelNotReady(Exception):
    pass


def load_model():
    if not MODEL_PATH.exists() or not META_PATH.exists():
        raise ModelNotReady("The prediction model has not been trained yet. Run setup.ps1 or 'python init_all.py'.")
    mtime = MODEL_PATH.stat().st_mtime
    if _cache["model"] is None or _cache["mtime"] != mtime:
        _cache["model"] = joblib.load(MODEL_PATH)
        _cache["meta"] = json.loads(META_PATH.read_text())
        _cache["mtime"] = mtime
    return _cache["model"], _cache["meta"]


def _feature_row(current, previous):
    """Features known at the end of `current` month, used to predict the month after it."""
    sin, cos = month_angle(next_month(current["month"]))
    return {
        "electricity_kwh": current["electricity_kwh"],
        "car_km": current["car_km"],
        "two_wheeler_km": current["two_wheeler_km"],
        "public_transport_km": current["public_transport_km"],
        "lpg_kg": current["lpg_kg"],
        "household_members": current["household_members"],
        "renewable_pct": current["renewable_pct"],
        "electricity_emissions": current["electricity_emissions"],
        "transport_emissions": current["transport_emissions"],
        "cooking_emissions": current["cooking_emissions"],
        "current_emissions": current["total_emissions"],
        "previous_emissions": previous["total_emissions"] if previous else current["total_emissions"],
        "target_month_sin": sin,
        "target_month_cos": cos,
    }


def forecast(records):
    """records: user's monthly records (with emission results), sorted by month.

    Returns the next-month prediction plus a back-test (what the model would have
    predicted for each past month using only the months before it).
    """
    if not records:
        return None
    model, meta = load_model()
    records = sorted(records, key=lambda r: r["month"])

    rows, months = [], []
    for i, rec in enumerate(records):
        rows.append(_feature_row(rec, records[i - 1] if i > 0 else None))
        months.append(next_month(rec["month"]))
    preds = model.predict(pd.DataFrame(rows, columns=FEATURES))

    by_month = {r["month"]: r["total_emissions"] for r in records}
    backtest = []
    for i, month in enumerate(months[:-1]):
        # Only months that directly follow a saved month can be checked.
        if month in by_month:
            backtest.append({"month": month, "actual": round(by_month[month], 2),
                             "predicted": round(float(preds[i]), 2)})

    latest = records[-1]
    predicted = round(max(float(preds[-1]), 0.0), 2)
    current = latest["total_emissions"]
    change = predicted - current
    history = len(records)

    if history >= 3:
        basis = "personal"
        note = (f"Based on your {history} saved months. The model itself was trained on synthetic data, "
                "so treat this as an estimate, not a guarantee.")
    else:
        basis = "synthetic_demo"
        note = (f"You only have {history} saved month(s). The forecast mostly reflects patterns the model "
                "learned from synthetic demo users rather than your personal history. "
                "Save at least 3 consecutive months for a more personal forecast.")

    errors = [abs(b["actual"] - b["predicted"]) for b in backtest]
    return {
        "predicted_month": months[-1],
        "based_on_month": latest["month"],
        "predicted_emissions": predicted,
        "current_emissions": round(current, 2),
        "change": round(change, 2),
        "change_pct": round(change / current * 100, 1) if current > 0 else None,
        "history_months": history,
        "basis": basis,
        "note": note,
        "backtest": backtest,
        "backtest_mae": round(sum(errors) / len(errors), 2) if errors else None,
        "model_version": meta["model_version"],
    }
