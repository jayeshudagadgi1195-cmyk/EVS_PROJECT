"""All database reads/writes for activity records. Every query is parameterized."""
from calculator import calculate
from db import DEMO_USER_ID, get_conn
from factors import load_factor_values

RECORD_SELECT = """
    SELECT a.id, a.user_id, a.month, a.vehicle_type, a.fuel_type, a.electricity_kwh,
           a.renewable_pct, a.household_members, a.car_km, a.two_wheeler_km,
           a.public_transport_km, a.public_transport_mode, a.lpg_kg, a.is_demo, a.created_at,
           r.electricity_emissions, r.car_emissions, r.two_wheeler_emissions,
           r.public_transport_emissions, r.transport_emissions, r.cooking_emissions,
           r.total_emissions, r.calculation_version
    FROM activity_records a
    JOIN emission_results r ON r.activity_record_id = a.id
"""


class DuplicateMonth(Exception):
    pass


def ensure_demo_user(conn):
    row = conn.execute("SELECT id FROM users WHERE id = ?", (DEMO_USER_ID,)).fetchone()
    if row is None:
        conn.execute("INSERT INTO users (id, display_name) VALUES (?, ?)", (DEMO_USER_ID, "Demo User"))


def get_user(user_id=DEMO_USER_ID):
    with get_conn() as conn:
        ensure_demo_user(conn)
        return dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())


def save_activity(activity, user_id=DEMO_USER_ID, replace=False, is_demo=False, conn=None):
    """Calculate and store one month. Raises DuplicateMonth if the month exists and replace=False."""
    own_conn = conn is None
    conn = conn or get_conn()
    try:
        factors = load_factor_values()
        result = calculate(activity, factors)
        existing = conn.execute(
            "SELECT id FROM activity_records WHERE user_id = ? AND month = ?",
            (user_id, activity["month"])).fetchone()
        if existing:
            if not replace:
                raise DuplicateMonth(activity["month"])
            conn.execute("DELETE FROM activity_records WHERE id = ?", (existing["id"],))

        cur = conn.execute(
            """INSERT INTO activity_records
               (user_id, month, vehicle_type, fuel_type, electricity_kwh, renewable_pct,
                household_members, car_km, two_wheeler_km, public_transport_km,
                public_transport_mode, lpg_kg, is_demo)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, activity["month"], activity["vehicle_type"], activity["fuel_type"],
             activity["electricity_kwh"], activity["renewable_pct"], activity["household_members"],
             activity["car_km"], activity["two_wheeler_km"], activity["public_transport_km"],
             activity["public_transport_mode"], activity["lpg_kg"], 1 if is_demo else 0))
        record_id = cur.lastrowid
        conn.execute(
            """INSERT INTO emission_results
               (activity_record_id, electricity_emissions, car_emissions, two_wheeler_emissions,
                public_transport_emissions, transport_emissions, cooking_emissions,
                total_emissions, calculation_version)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (record_id, result["electricity_emissions"], result["car_emissions"],
             result["two_wheeler_emissions"], result["public_transport_emissions"],
             result["transport_emissions"], result["cooking_emissions"],
             result["total_emissions"], result["calculation_version"]))
        if own_conn:
            conn.commit()
        return record_id
    finally:
        if own_conn:
            conn.close()


def get_record(record_id, user_id=DEMO_USER_ID):
    with get_conn() as conn:
        row = conn.execute(RECORD_SELECT + " WHERE a.id = ? AND a.user_id = ?", (record_id, user_id)).fetchone()
    return dict(row) if row else None


def list_records(user_id=DEMO_USER_ID, month=None, start=None, end=None):
    sql = RECORD_SELECT + " WHERE a.user_id = ?"
    params = [user_id]
    if month:
        sql += " AND a.month = ?"
        params.append(month)
    if start:
        sql += " AND a.month >= ?"
        params.append(start)
    if end:
        sql += " AND a.month <= ?"
        params.append(end)
    sql += " ORDER BY a.month ASC"
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]


def delete_record(record_id, user_id=DEMO_USER_ID):
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM activity_records WHERE id = ? AND user_id = ?", (record_id, user_id))
        return cur.rowcount > 0


def save_prediction(fc, user_id=DEMO_USER_ID):
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO predictions (user_id, predicted_month, based_on_month, predicted_emissions,
                                        history_months, model_version)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, fc["predicted_month"], fc["based_on_month"], fc["predicted_emissions"],
             fc["history_months"], fc["model_version"]))
        return cur.lastrowid


def list_predictions(user_id=DEMO_USER_ID, limit=10):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM predictions WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit)).fetchall()
    return [dict(r) for r in rows]


def replace_recommendations(recs, user_id=DEMO_USER_ID):
    with get_conn() as conn:
        conn.execute("DELETE FROM recommendations WHERE user_id = ?", (user_id,))
        conn.executemany(
            """INSERT INTO recommendations (user_id, category, title, recommendation_text, assumption,
                                            estimated_savings, priority)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            [(user_id, r["category"], r["title"], r["recommendation_text"], r["assumption"],
              r["estimated_savings"], r["priority"]) for r in recs])


def list_factors():
    with get_conn() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM emission_factors ORDER BY id").fetchall()]
