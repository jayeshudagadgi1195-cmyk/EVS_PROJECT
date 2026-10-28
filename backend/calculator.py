"""Carbon footprint calculator.

    emissions (kg CO2e) = activity data x emission factor

Electricity and LPG are household-level activities. They are divided equally
between `household_members`, so every result is ONE PERSON'S allocated share.
(With household_members = 1 the result equals the whole household's emissions.)
Transport distances are entered per person, so they are not divided.
"""
import re

CALCULATION_VERSION = "1.0"

MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")

# (field name, maximum sensible monthly value) - used for validation
NUMERIC_LIMITS = {
    "electricity_kwh": 20000,
    "car_km": 20000,
    "two_wheeler_km": 20000,
    "public_transport_km": 20000,
    "lpg_kg": 500,
    "renewable_pct": 100,
    "household_members": 50,
}

CATEGORY_LABELS = {
    "electricity": "Electricity",
    "car": "Car travel",
    "two_wheeler": "Two-wheeler",
    "public_transport": "Public transport",
    "cooking": "Cooking (LPG)",
}


def _to_number(value, field, errors, default=0.0):
    if value is None or value == "":
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        errors[field] = "Must be a number."
        return default
    if number != number or number in (float("inf"), float("-inf")):  # NaN / inf
        errors[field] = "Must be a finite number."
        return default
    if number < 0:
        errors[field] = "Cannot be negative."
        return default
    limit = NUMERIC_LIMITS.get(field)
    if limit is not None and number > limit:
        errors[field] = f"Must be at most {limit}."
        return default
    return number


def validate_activity(payload, require_month=False):
    """Clean user input. Returns (clean_dict, errors_dict)."""
    if not isinstance(payload, dict):
        return None, {"body": "Request body must be a JSON object."}
    errors = {}
    clean = {}

    month = payload.get("month")
    if month is None or month == "":
        if require_month:
            errors["month"] = "Month is required (format YYYY-MM)."
        clean["month"] = None
    elif not isinstance(month, str) or not MONTH_RE.match(month):
        errors["month"] = "Month must use the format YYYY-MM, e.g. 2026-10."
    else:
        clean["month"] = month

    vehicle_type = (payload.get("vehicle_type") or "none").lower()
    if vehicle_type not in ("none", "car"):
        errors["vehicle_type"] = "Vehicle type must be 'none' or 'car'."
        vehicle_type = "none"
    clean["vehicle_type"] = vehicle_type

    fuel_type = payload.get("fuel_type")
    fuel_type = fuel_type.lower() if isinstance(fuel_type, str) and fuel_type else None
    if vehicle_type == "car":
        if fuel_type not in ("petrol", "diesel", "electric"):
            errors["fuel_type"] = "Choose petrol, diesel or electric for a car."
            fuel_type = "petrol"
    else:
        fuel_type = None
    clean["fuel_type"] = fuel_type

    for field in ("electricity_kwh", "car_km", "two_wheeler_km", "public_transport_km", "lpg_kg", "renewable_pct"):
        clean[field] = _to_number(payload.get(field), field, errors)

    members = _to_number(payload.get("household_members"), "household_members", errors, default=1)
    if members < 1 or members != int(members):
        errors["household_members"] = "Household members must be a whole number of at least 1."
        members = 1
    clean["household_members"] = int(members)

    if vehicle_type == "none":
        clean["car_km"] = 0.0  # no car selected, so car distance is ignored

    mode = (payload.get("public_transport_mode") or "bus").lower()
    if mode not in ("bus", "rail"):
        errors["public_transport_mode"] = "Public transport mode must be 'bus' or 'rail'."
        mode = "bus"
    clean["public_transport_mode"] = mode

    return clean, errors


def car_factor(fuel_type, factors):
    """kg CO2e per km for the selected car fuel."""
    if fuel_type == "diesel":
        return factors["car_diesel"]
    if fuel_type == "electric":
        return factors["ev_kwh_per_km"] * factors["electricity_grid_india"]
    return factors["car_petrol"]


def public_transport_factor(mode, factors):
    return factors["rail"] if mode == "rail" else factors["bus"]


def calculate(activity, factors):
    """Return the emission breakdown (kg CO2e per month, one person's share)."""
    members = max(int(activity.get("household_members") or 1), 1)
    renewable_share = (activity.get("renewable_pct") or 0) / 100

    grid_kwh = activity["electricity_kwh"] * (1 - renewable_share)
    electricity = grid_kwh * factors["electricity_grid_india"] / members

    car = 0.0
    if activity.get("vehicle_type") == "car":
        car = activity["car_km"] * car_factor(activity.get("fuel_type"), factors)
    two_wheeler = activity["two_wheeler_km"] * factors["two_wheeler"]
    public_transport = activity["public_transport_km"] * public_transport_factor(
        activity.get("public_transport_mode", "bus"), factors)
    transport = car + two_wheeler + public_transport

    cooking = activity["lpg_kg"] * factors["lpg"] / members
    total = electricity + transport + cooking

    categories = {
        "electricity": electricity,
        "car": car,
        "two_wheeler": two_wheeler,
        "public_transport": public_transport,
        "cooking": cooking,
    }
    highest_key = max(categories, key=categories.get) if total > 0 else None

    return {
        "electricity_emissions": round(electricity, 3),
        "car_emissions": round(car, 3),
        "two_wheeler_emissions": round(two_wheeler, 3),
        "public_transport_emissions": round(public_transport, 3),
        "transport_emissions": round(transport, 3),
        "cooking_emissions": round(cooking, 3),
        "total_emissions": round(total, 3),
        "annual_estimate": round(total * 12, 3),
        "highest_category": highest_key,
        "highest_category_label": CATEGORY_LABELS.get(highest_key) if highest_key else None,
        "categories": [
            {"key": k, "label": CATEGORY_LABELS[k], "value": round(v, 3),
             "share": round(v / total * 100, 1) if total > 0 else 0.0}
            for k, v in categories.items()
        ],
        "allocation_note": (
            f"Electricity and LPG are divided between {members} household member(s); "
            "results show one person's allocated share."
            if members > 1 else
            "Household size is 1, so electricity and LPG results equal the whole household's emissions."
        ),
        "calculation_version": CALCULATION_VERSION,
    }
