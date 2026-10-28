"""SQLite connection helpers and schema for EcoTrack AI.

The database file (ecotrack.db) is created automatically the first time
the app or the setup script runs. Nothing needs to be created by hand.
"""
import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("ECOTRACK_DB", BASE_DIR / "ecotrack.db"))

# This prototype has no login system: every record belongs to one local demo user.
DEMO_USER_ID = 1

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name  TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_records (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month                  TEXT    NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
    vehicle_type           TEXT    NOT NULL DEFAULT 'none' CHECK (vehicle_type IN ('none', 'car')),
    fuel_type              TEXT    CHECK (fuel_type IS NULL OR fuel_type IN ('petrol', 'diesel', 'electric')),
    electricity_kwh        REAL    NOT NULL DEFAULT 0 CHECK (electricity_kwh >= 0),
    renewable_pct          REAL    NOT NULL DEFAULT 0 CHECK (renewable_pct BETWEEN 0 AND 100),
    household_members      INTEGER NOT NULL DEFAULT 1 CHECK (household_members >= 1),
    car_km                 REAL    NOT NULL DEFAULT 0 CHECK (car_km >= 0),
    two_wheeler_km         REAL    NOT NULL DEFAULT 0 CHECK (two_wheeler_km >= 0),
    public_transport_km    REAL    NOT NULL DEFAULT 0 CHECK (public_transport_km >= 0),
    public_transport_mode  TEXT    NOT NULL DEFAULT 'bus' CHECK (public_transport_mode IN ('bus', 'rail')),
    lpg_kg                 REAL    NOT NULL DEFAULT 0 CHECK (lpg_kg >= 0),
    is_demo                INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
    created_at             TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, month)
);

CREATE TABLE IF NOT EXISTS emission_results (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_record_id          INTEGER NOT NULL UNIQUE REFERENCES activity_records(id) ON DELETE CASCADE,
    electricity_emissions       REAL    NOT NULL CHECK (electricity_emissions >= 0),
    car_emissions               REAL    NOT NULL DEFAULT 0 CHECK (car_emissions >= 0),
    two_wheeler_emissions       REAL    NOT NULL DEFAULT 0 CHECK (two_wheeler_emissions >= 0),
    public_transport_emissions  REAL    NOT NULL DEFAULT 0 CHECK (public_transport_emissions >= 0),
    transport_emissions         REAL    NOT NULL CHECK (transport_emissions >= 0),
    cooking_emissions           REAL    NOT NULL CHECK (cooking_emissions >= 0),
    total_emissions             REAL    NOT NULL CHECK (total_emissions >= 0),
    calculation_version         TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS emission_factors (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type     TEXT    NOT NULL UNIQUE,
    label             TEXT    NOT NULL,
    factor_value      REAL    NOT NULL CHECK (factor_value >= 0),
    unit              TEXT    NOT NULL,
    source_name       TEXT    NOT NULL,
    source_url        TEXT,
    publication_year  INTEGER,
    is_illustrative   INTEGER NOT NULL DEFAULT 0 CHECK (is_illustrative IN (0, 1)),
    notes             TEXT
);

CREATE TABLE IF NOT EXISTS predictions (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    predicted_month      TEXT    NOT NULL,
    based_on_month       TEXT    NOT NULL,
    predicted_emissions  REAL    NOT NULL CHECK (predicted_emissions >= 0),
    history_months       INTEGER NOT NULL,
    model_version        TEXT    NOT NULL,
    created_at           TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendations (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category             TEXT    NOT NULL,
    title                TEXT    NOT NULL,
    recommendation_text  TEXT    NOT NULL,
    assumption           TEXT,
    estimated_savings    REAL    NOT NULL DEFAULT 0 CHECK (estimated_savings >= 0),
    priority             TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    created_at           TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_user_month ON activity_records(user_id, month);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id, created_at);
"""


def get_conn() -> sqlite3.Connection:
    """Open a connection with dict-like rows and foreign keys switched on."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Create all tables if they don't exist yet."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.executescript(SCHEMA)


def rows_to_dicts(rows):
    return [dict(r) for r in rows]
