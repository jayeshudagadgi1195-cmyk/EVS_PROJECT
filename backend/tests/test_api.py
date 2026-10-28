"""End-to-end tests of every API route against a temporary database."""
import pandas as pd

from ml import synthetic
from ml.train import TEST_FROM_TARGET_MONTH

GOOD = {"month": "2030-01", "vehicle_type": "car", "fuel_type": "petrol", "car_km": 400,
        "two_wheeler_km": 50, "public_transport_km": 100, "public_transport_mode": "bus",
        "electricity_kwh": 250, "renewable_pct": 0, "household_members": 2, "lpg_kg": 12}


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json()["model"]["ready"] is True


def test_database_seeded_with_demo_data(client):
    data = client.get("/api/dashboard").get_json()
    assert data["has_data"] and data["is_demo_data"]
    assert len(data["records"]) == 12
    k = data["kpis"]
    assert k["monthly_total"] > 0 and k["annual_estimate"] > 0 and k["predicted_next"] > 0
    assert len(data["breakdown"]) == 5 and data["actual_vs_predicted"]


def test_calculate_does_not_save(client):
    before = len(client.get("/api/history").get_json()["records"])
    r = client.post("/api/calculate", json=GOOD)
    assert r.status_code == 200 and r.get_json()["result"]["total_emissions"] > 0
    assert len(client.get("/api/history").get_json()["records"]) == before


def test_validation_errors(client):
    r = client.post("/api/calculate", json={"electricity_kwh": -1})
    assert r.status_code == 422 and "electricity_kwh" in r.get_json()["details"]
    assert client.post("/api/activities", json={"electricity_kwh": 10}).status_code == 422  # month missing
    assert client.post("/api/calculate", data="not json", content_type="text/plain").status_code == 422


def test_crud_cycle(client):
    r = client.post("/api/activities", json=GOOD)
    assert r.status_code == 201
    rid = r.get_json()["record"]["id"]
    assert client.post("/api/activities", json=GOOD).status_code == 409          # duplicate month
    assert client.post("/api/activities", json={**GOOD, "replace": True, "car_km": 10}).status_code == 201
    hist = client.get("/api/history?month=2030-01").get_json()
    assert hist["summary"]["count"] == 1 and hist["records"][0]["car_km"] == 10
    new_id = hist["records"][0]["id"]
    assert new_id != rid
    assert client.delete(f"/api/activities/{new_id}").status_code == 200
    assert client.delete(f"/api/activities/{new_id}").status_code == 404
    assert client.get("/api/history?month=bad").status_code == 400


def test_predictions(client):
    r = client.get("/api/predictions")
    assert r.status_code == 200
    body = r.get_json()
    assert body["model"]["data"]["type"] == "synthetic"
    assert body["model"]["metrics"]["model"]["mae"] > 0
    assert body["forecast"]["basis"] == "personal"
    p = client.post("/api/predict")
    assert p.status_code == 201
    assert client.get("/api/predictions").get_json()["saved_predictions"]


def test_recommendations_and_simulator(client):
    recs = client.get("/api/recommendations").get_json()
    assert recs["has_data"] and recs["recommendations"]
    savings = [x["estimated_savings"] for x in recs["recommendations"]]
    assert savings == sorted(savings, reverse=True)
    s = client.post("/api/simulate", json={"car_reduction_pct": 25, "electricity_reduction_pct": 10})
    assert s.status_code == 200 and s.get_json()["monthly_savings"] > 0
    assert client.post("/api/simulate", json={"car_reduction_pct": 150}).status_code == 422


def test_factors_and_export(client):
    f = client.get("/api/emission-factors").get_json()["factors"]
    assert all(x["source_name"] for x in f)
    e = client.get("/api/export")
    assert e.status_code == 200 and e.mimetype == "text/csv"
    assert e.data.decode().splitlines()[0].startswith("month,")


def test_empty_state_and_reset(client):
    for r in client.get("/api/history").get_json()["records"]:
        client.delete(f"/api/activities/{r['id']}")
    assert client.get("/api/dashboard").get_json()["has_data"] is False
    assert client.post("/api/predict").status_code == 409
    assert client.get("/api/predictions").get_json()["forecast"] is None
    assert client.post("/api/demo/reset").status_code == 200
    assert len(client.get("/api/history").get_json()["records"]) == 12


def test_unknown_route_is_json(client):
    r = client.get("/api/nope")
    assert r.status_code == 404 and "error" in r.get_json()


def test_ml_split_is_chronological_and_leak_free():
    raw = synthetic.generate_raw()
    sup = synthetic.build_supervised(raw)
    assert len(raw) >= 1000
    train = sup[sup["target_month"] < TEST_FROM_TARGET_MONTH]
    test = sup[sup["target_month"] >= TEST_FROM_TARGET_MONTH]
    assert train["target_month"].max() < test["target_month"].min()
    assert synthetic.TARGET not in synthetic.FEATURES
    # target really is the following month's total
    row = sup.iloc[0]
    nxt = raw[(raw.user_id == row.user_id) & (raw.month == row.target_month)].iloc[0]
    assert row[synthetic.TARGET] == nxt.total_emissions
    # deterministic seed
    pd.testing.assert_frame_equal(raw, synthetic.generate_raw())
