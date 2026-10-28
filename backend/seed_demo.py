"""Create clearly-labelled demo records for the single local demo user.

The demo user gets 12 months of activity ending last month, so the dashboard,
history and prediction pages have something to show on first launch.
Demo records are marked is_demo = 1 and shown with a "Demo" badge in the UI.
"""
from datetime import date

import numpy as np

from db import DEMO_USER_ID, get_conn
from ml.synthetic import ELECTRICITY_SEASON, LPG_SEASON, TRAVEL_SEASON
from repository import ensure_demo_user, save_activity

DEMO_MONTHS = 12


def demo_months(today=None):
    today = today or date.today()
    y, m = today.year, today.month
    months = []
    for _ in range(DEMO_MONTHS):
        m -= 1
        if m == 0:
            y, m = y - 1, 12
        months.append(f"{y:04d}-{m:02d}")
    return list(reversed(months))


def seed_demo_records(reset=False):
    """Add demo data. With reset=True all of the demo user's records are replaced."""
    rng = np.random.default_rng(7)
    with get_conn() as conn:
        ensure_demo_user(conn)
        if reset:
            conn.execute("DELETE FROM activity_records WHERE user_id = ?", (DEMO_USER_ID,))
            conn.execute("DELETE FROM predictions WHERE user_id = ?", (DEMO_USER_ID,))
            conn.execute("DELETE FROM recommendations WHERE user_id = ?", (DEMO_USER_ID,))
        elif conn.execute("SELECT COUNT(*) FROM activity_records WHERE user_id = ?",
                          (DEMO_USER_ID,)).fetchone()[0] > 0:
            return 0

        count = 0
        for i, month in enumerate(demo_months()):
            mi = int(month[5:]) - 1
            drift = 1 + 0.006 * i
            activity = {
                "month": month,
                "vehicle_type": "car",
                "fuel_type": "petrol",
                "electricity_kwh": round(270 * ELECTRICITY_SEASON[mi] * drift * rng.normal(1, 0.05), 1),
                "renewable_pct": 0.0,
                "household_members": 3,
                "car_km": round(560 * TRAVEL_SEASON[mi] * drift * rng.normal(1, 0.08), 1),
                "two_wheeler_km": round(190 * TRAVEL_SEASON[mi] * rng.normal(1, 0.08), 1),
                "public_transport_km": round(150 * rng.normal(1, 0.1), 1),
                "public_transport_mode": "bus",
                "lpg_kg": round(13.5 * LPG_SEASON[mi] * rng.normal(1, 0.04), 2),
            }
            save_activity(activity, replace=True, is_demo=True, conn=conn)
            count += 1
        conn.commit()
        return count


if __name__ == "__main__":
    print(f"Inserted {seed_demo_records(reset=True)} demo records.")
