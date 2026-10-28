"""Emission factors used by the calculator, with their sources.

Formula used everywhere in this project:
    emissions (kg CO2e) = activity data x emission factor

Every factor below carries its source, publication year and unit.
Factors that are NOT taken directly from a published table are marked
is_illustrative = 1 and the UI labels them as assumptions.

These values are copied into the `emission_factors` table on startup,
and the calculator always reads them back from the database.
"""
from db import get_conn

FACTORS = [
    {
        "activity_type": "electricity_grid_india",
        "label": "Grid electricity (India)",
        "factor_value": 0.727,
        "unit": "kg CO2 per kWh",
        "source_name": "Central Electricity Authority (CEA), CO2 Baseline Database for the Indian Power Sector, Version 20.0 - weighted average emission factor, FY 2023-24",
        "source_url": "https://cea.nic.in/cdm-co2-baseline-database/",
        "publication_year": 2024,
        "is_illustrative": 0,
        "notes": "Published as 0.727 tCO2/MWh (= 0.727 kg CO2/kWh). CO2 only; other greenhouse gases not included. Newer CEA versions may have been released since - check the CEA page.",
    },
    {
        "activity_type": "car_petrol",
        "label": "Car, petrol (average size)",
        "factor_value": 0.1645,
        "unit": "kg CO2e per vehicle-km",
        "source_name": "UK DESNZ Greenhouse gas reporting: conversion factors 2024 - Passenger vehicles, Average car, Petrol",
        "source_url": "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024",
        "publication_year": 2024,
        "is_illustrative": 0,
        "notes": "UK fleet average used as a proxy; Indian cars may differ. Per vehicle-km, so the whole trip is counted even if shared.",
    },
    {
        "activity_type": "car_diesel",
        "label": "Car, diesel (average size)",
        "factor_value": 0.16984,
        "unit": "kg CO2e per vehicle-km",
        "source_name": "UK DESNZ/DEFRA Greenhouse gas reporting: conversion factors 2023 - Passenger vehicles, Average car, Diesel",
        "source_url": "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
        "publication_year": 2023,
        "is_illustrative": 0,
        "notes": "UK fleet average used as a proxy for Indian conditions.",
    },
    {
        "activity_type": "ev_kwh_per_km",
        "label": "Electric car energy use",
        "factor_value": 0.15,
        "unit": "kWh per km",
        "source_name": "Illustrative assumption (typical small/medium electric car efficiency)",
        "source_url": None,
        "publication_year": None,
        "is_illustrative": 1,
        "notes": "Not an official factor. Electric car emissions = km x 0.15 kWh/km x Indian grid factor. Charging losses ignored.",
    },
    {
        "activity_type": "two_wheeler",
        "label": "Motorbike / scooter (average)",
        "factor_value": 0.11367,
        "unit": "kg CO2e per km",
        "source_name": "UK DESNZ Greenhouse gas reporting: conversion factors 2024 - Passenger vehicles, Motorbike, Average",
        "source_url": "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024",
        "publication_year": 2024,
        "is_illustrative": 0,
        "notes": "Published as 0.18293 kg CO2e/mile = 0.11367 kg CO2e/km. UK average motorbike; Indian commuter two-wheelers are often smaller, so this may overestimate.",
    },
    {
        "activity_type": "bus",
        "label": "Bus (average local bus)",
        "factor_value": 0.10846,
        "unit": "kg CO2e per passenger-km",
        "source_name": "UK DESNZ/DEFRA Greenhouse gas reporting: conversion factors 2023 - Business travel (land), Average local bus",
        "source_url": "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
        "publication_year": 2023,
        "is_illustrative": 0,
        "notes": "UK average occupancy. Crowded Indian city buses carry more people per bus, so real per-passenger emissions are likely lower.",
    },
    {
        "activity_type": "rail",
        "label": "Rail / metro (national rail)",
        "factor_value": 0.03546,
        "unit": "kg CO2e per passenger-km",
        "source_name": "UK DESNZ/DEFRA Greenhouse gas reporting: conversion factors 2023 - Business travel (land), National rail",
        "source_url": "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
        "publication_year": 2023,
        "is_illustrative": 0,
        "notes": "UK national rail used as a proxy for train/metro travel.",
    },
    {
        "activity_type": "lpg",
        "label": "LPG (cooking)",
        "factor_value": 2.985,
        "unit": "kg CO2 per kg LPG",
        "source_name": "Derived from IPCC 2006 Guidelines for National GHG Inventories, Vol. 2, Ch. 1 - default CO2 factor 63,100 kg/TJ and net calorific value 47.3 TJ/Gg for LPG",
        "source_url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html",
        "publication_year": 2006,
        "is_illustrative": 0,
        "notes": "63.1 kg CO2/GJ x 0.0473 GJ/kg = 2.985 kg CO2/kg. CO2 only (CH4 and N2O are very small for LPG). A standard Indian domestic cylinder holds 14.2 kg.",
    },
]


def seed_factors() -> None:
    """Insert or update every factor in the database (safe to run many times)."""
    cols = ["activity_type", "label", "factor_value", "unit", "source_name",
            "source_url", "publication_year", "is_illustrative", "notes"]
    sql = f"""
        INSERT INTO emission_factors ({", ".join(cols)})
        VALUES ({", ".join("?" for _ in cols)})
        ON CONFLICT(activity_type) DO UPDATE SET
        {", ".join(f"{c} = excluded.{c}" for c in cols[1:])}
    """
    with get_conn() as conn:
        conn.executemany(sql, [tuple(f[c] for c in cols) for f in FACTORS])


def load_factor_values() -> dict:
    """Return {activity_type: factor_value} read from the database."""
    with get_conn() as conn:
        rows = conn.execute("SELECT activity_type, factor_value FROM emission_factors").fetchall()
    values = {r["activity_type"]: r["factor_value"] for r in rows}
    if not values:  # database not seeded yet
        values = default_factor_values()
    return values


def default_factor_values() -> dict:
    """Factor values straight from the config above (used for synthetic ML data)."""
    return {f["activity_type"]: f["factor_value"] for f in FACTORS}
