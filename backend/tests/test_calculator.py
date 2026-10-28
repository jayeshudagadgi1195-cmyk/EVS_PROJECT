"""Hand-checkable tests for the carbon formulas (emissions = activity x factor)."""
import pytest

from advisor import simulate
from calculator import calculate, validate_activity
from factors import default_factor_values

F = default_factor_values()


def base(**overrides):
    activity = {"vehicle_type": "none", "fuel_type": None, "electricity_kwh": 0, "renewable_pct": 0,
                "household_members": 1, "car_km": 0, "two_wheeler_km": 0, "public_transport_km": 0,
                "public_transport_mode": "bus", "lpg_kg": 0}
    activity.update(overrides)
    return activity


def test_electricity_uses_grid_factor():
    r = calculate(base(electricity_kwh=100), F)
    assert r["electricity_emissions"] == pytest.approx(72.7)


def test_renewable_share_and_household_split():
    # 300 kWh, 50% renewable, 3 people -> 300 * 0.5 * 0.727 / 3 = 36.35
    r = calculate(base(electricity_kwh=300, renewable_pct=50, household_members=3), F)
    assert r["electricity_emissions"] == pytest.approx(36.35)


def test_petrol_diesel_electric_car():
    assert calculate(base(vehicle_type="car", fuel_type="petrol", car_km=100), F)["car_emissions"] == pytest.approx(16.45)
    assert calculate(base(vehicle_type="car", fuel_type="diesel", car_km=100), F)["car_emissions"] == pytest.approx(16.984)
    # 100 km x 0.15 kWh/km x 0.727 = 10.905
    assert calculate(base(vehicle_type="car", fuel_type="electric", car_km=100), F)["car_emissions"] == pytest.approx(10.905)


def test_transport_modes_and_lpg():
    r = calculate(base(two_wheeler_km=100, public_transport_km=100, lpg_kg=14.2), F)
    assert r["two_wheeler_emissions"] == pytest.approx(11.367)
    assert r["public_transport_emissions"] == pytest.approx(10.846)
    assert r["cooking_emissions"] == pytest.approx(14.2 * 2.985, rel=1e-4)
    rail = calculate(base(public_transport_km=100, public_transport_mode="rail"), F)
    assert rail["public_transport_emissions"] == pytest.approx(3.546)


def test_total_is_sum_and_zero_is_safe():
    r = calculate(base(electricity_kwh=200, vehicle_type="car", fuel_type="petrol", car_km=300, lpg_kg=10), F)
    parts = r["electricity_emissions"] + r["transport_emissions"] + r["cooking_emissions"]
    assert r["total_emissions"] == pytest.approx(parts, abs=0.01)
    zero = calculate(base(), F)
    assert zero["total_emissions"] == 0 and zero["highest_category"] is None


def test_validation_rejects_bad_input():
    _, errors = validate_activity({"month": "2026-13", "electricity_kwh": -5, "car_km": "abc",
                                   "vehicle_type": "car", "fuel_type": "hydrogen"}, require_month=True)
    assert {"month", "electricity_kwh", "car_km", "fuel_type"} <= set(errors)


def test_no_car_ignores_car_km():
    clean, errors = validate_activity({"vehicle_type": "none", "car_km": 500})
    assert not errors and clean["car_km"] == 0


def test_simulator_math():
    activity = base(vehicle_type="car", fuel_type="petrol", car_km=1000, electricity_kwh=200)
    s = simulate(activity, F, car_reduction_pct=20, pt_substitution_pct=30, electricity_reduction_pct=10)
    # car 1000 -> 500 km, bus +300 km, electricity 200 -> 180 kWh
    expected = 500 * 0.1645 + 300 * 0.10846 + 180 * 0.727
    assert s["scenario"]["total_emissions"] == pytest.approx(expected, abs=0.01)
    assert s["monthly_savings"] == pytest.approx(s["current"]["total_emissions"] - expected, abs=0.02)
    # combined car levers are capped at 100%
    capped = simulate(activity, F, car_reduction_pct=80, pt_substitution_pct=80)
    assert capped["inputs"]["pt_substitution_pct"] == 20
