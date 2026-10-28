"""Generate a reproducible SYNTHETIC dataset for training the prediction model.

The synthetic data is saved as CSV files in backend/ml/data/ and is kept
completely separate from the real activity records in ecotrack.db.

How the data is made (simple version):
  * 60 imaginary people, each followed for 24 months (1,440 monthly records).
  * Each person gets a personal "baseline" lifestyle (car owner or not,
    household size, how much electricity they use, ...).
  * Every month that baseline is changed by:
      - seasons (Indian summers push AC use up in April-June),
      - a slow personal trend (some people improve, some get worse),
      - random month-to-month noise that partly carries over (AR(1)),
      - occasional one-off events (a road trip, guests staying over).
  * Emissions are calculated from those activities with the real emission factors.

Then each row is turned into a learning example:
  "this month's activities + this month's and last month's emissions"
      ->  "NEXT month's total emissions" (the target).
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from calculator import calculate  # noqa: E402
from factors import default_factor_values  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent / "data"
RAW_PATH = DATA_DIR / "synthetic_monthly_records.csv"
SUPERVISED_PATH = DATA_DIR / "synthetic_training_dataset.csv"

SEED = 42
N_USERS = 60
N_MONTHS = 24
START = pd.Period("2024-01", freq="M")

# Seasonal multipliers by calendar month (index 0 = January)
ELECTRICITY_SEASON = [0.88, 0.90, 1.02, 1.22, 1.35, 1.30, 1.08, 1.05, 1.06, 1.00, 0.92, 0.88]
TRAVEL_SEASON = [0.98, 0.97, 1.00, 1.00, 1.04, 1.02, 0.94, 0.93, 0.97, 1.08, 1.10, 1.05]
LPG_SEASON = [1.08, 1.05, 1.00, 0.96, 0.95, 0.95, 0.98, 0.98, 1.00, 1.04, 1.06, 1.08]

FEATURES = [
    "electricity_kwh", "car_km", "two_wheeler_km", "public_transport_km", "lpg_kg",
    "household_members", "renewable_pct",
    "electricity_emissions", "transport_emissions", "cooking_emissions",
    "current_emissions", "previous_emissions",
    "target_month_sin", "target_month_cos",
]
TARGET = "next_month_emissions"


def _ar1_noise(rng, n, sd, rho=0.5):
    noise = np.zeros(n)
    for t in range(n):
        noise[t] = (rho * noise[t - 1] if t else 0) + rng.normal(0, sd)
    return noise


def generate_raw(seed=SEED):
    rng = np.random.default_rng(seed)
    factors = default_factor_values()
    rows = []
    for user in range(1, N_USERS + 1):
        members = int(rng.choice([1, 2, 3, 4, 5], p=[0.15, 0.25, 0.3, 0.2, 0.1]))
        base_kwh = rng.uniform(60, 120) * members ** 0.8
        has_car = rng.random() < 0.55
        fuel = rng.choice(["petrol", "diesel", "electric"], p=[0.68, 0.27, 0.05]) if has_car else None
        base_car = rng.uniform(150, 1400) if has_car else 0.0
        base_tw = rng.uniform(120, 900) if rng.random() < 0.55 else 0.0
        base_pt = rng.uniform(0, 650)
        pt_mode = "rail" if rng.random() < 0.35 else "bus"
        base_lpg = rng.uniform(6, 15)
        renewable = float(rng.choice([0, 0, 0, 0, 10, 25, 40]))
        trend = rng.normal(0.0, 0.008)  # slow change per month (about +/-10% per year)

        noise = {k: _ar1_noise(rng, N_MONTHS, sd) for k, sd in
                 [("kwh", 0.07), ("car", 0.12), ("tw", 0.10), ("pt", 0.12), ("lpg", 0.06)]}

        for t in range(N_MONTHS):
            period = START + t
            m = period.month - 1
            drift = (1 + trend) ** t
            trip = 1.6 if (has_car and rng.random() < 0.05) else 1.0
            guests = 1.25 if rng.random() < 0.04 else 1.0

            activity = {
                "vehicle_type": "car" if has_car else "none",
                "fuel_type": fuel,
                "electricity_kwh": max(base_kwh * ELECTRICITY_SEASON[m] * drift * guests * (1 + noise["kwh"][t]), 0),
                "renewable_pct": renewable,
                "household_members": members,
                "car_km": max(base_car * TRAVEL_SEASON[m] * drift * trip * (1 + noise["car"][t]), 0),
                "two_wheeler_km": max(base_tw * TRAVEL_SEASON[m] * drift * (1 + noise["tw"][t]), 0),
                "public_transport_km": max(base_pt * TRAVEL_SEASON[m] * (1 + noise["pt"][t]), 0),
                "public_transport_mode": pt_mode,
                "lpg_kg": max(base_lpg * LPG_SEASON[m] * guests * (1 + noise["lpg"][t]), 0),
            }
            res = calculate(activity, factors)
            rows.append({
                "user_id": f"synthetic_{user:03d}",
                "month": str(period),
                **{k: (round(v, 2) if isinstance(v, float) else v) for k, v in activity.items()},
                "electricity_emissions": res["electricity_emissions"],
                "transport_emissions": res["transport_emissions"],
                "cooking_emissions": res["cooking_emissions"],
                "total_emissions": res["total_emissions"],
            })
    return pd.DataFrame(rows)


def month_angle(month_str):
    month = int(month_str[5:7])
    angle = 2 * np.pi * (month - 1) / 12
    return np.sin(angle), np.cos(angle)


def next_month(month_str):
    return str(pd.Period(month_str, freq="M") + 1)


def build_supervised(raw: pd.DataFrame) -> pd.DataFrame:
    """Turn monthly records into (features at month t) -> (emissions at month t+1).

    Only information known at the end of month t is used as input, so the
    model never sees the answer (no target leakage).
    """
    raw = raw.sort_values(["user_id", "month"]).copy()
    raw["previous_emissions"] = raw.groupby("user_id")["total_emissions"].shift(1)
    raw[TARGET] = raw.groupby("user_id")["total_emissions"].shift(-1)
    raw["target_month"] = raw["month"].map(next_month)
    sincos = raw["target_month"].map(month_angle)
    raw["target_month_sin"] = [s for s, _ in sincos]
    raw["target_month_cos"] = [c for _, c in sincos]
    raw = raw.rename(columns={"total_emissions": "current_emissions"})
    sup = raw.dropna(subset=["previous_emissions", TARGET]).reset_index(drop=True)
    cols = ["user_id", "month", "target_month"] + FEATURES + [TARGET]
    return sup[cols]


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    raw = generate_raw()
    sup = build_supervised(raw)
    raw.to_csv(RAW_PATH, index=False)
    sup.to_csv(SUPERVISED_PATH, index=False)
    print(f"Synthetic monthly records : {len(raw):,}  -> {RAW_PATH.name}")
    print(f"Supervised training rows  : {len(sup):,}  -> {SUPERVISED_PATH.name}")


if __name__ == "__main__":
    main()
