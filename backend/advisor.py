"""Rule-based carbon reduction advisor and scenario simulator.

This is NOT machine learning. Every saving is a transparent calculation:
    saving = (activity removed or changed) x emission factor
The assumed reduction percentages are shown to the user next to each tip.
"""
from calculator import calculate, car_factor, public_transport_factor


def _rec(category, title, text, assumption, saving, current_total):
    saving = max(round(saving, 2), 0.0)
    share = saving / current_total if current_total > 0 else 0
    priority = "high" if share >= 0.08 else "medium" if share >= 0.03 else "low"
    return {
        "category": category,
        "title": title,
        "recommendation_text": text,
        "assumption": assumption,
        "estimated_savings": saving,
        "annual_savings": round(saving * 12, 2),
        "priority": priority,
    }


def build_recommendations(activity, factors):
    """Return recommendations sorted by estimated monthly saving (kg CO2e)."""
    result = calculate(activity, factors)
    total = result["total_emissions"]
    members = max(activity.get("household_members", 1), 1)
    recs = []

    car_km = activity.get("car_km", 0) if activity.get("vehicle_type") == "car" else 0
    if car_km > 0:
        cf = car_factor(activity.get("fuel_type"), factors)
        bus = factors["bus"]
        shift = 0.30 * car_km
        recs.append(_rec(
            "transport", "Move 30% of car trips to bus or metro",
            f"Taking public transport for about {shift:.0f} km of your {car_km:.0f} km monthly driving "
            "cuts emissions because each passenger shares the vehicle's footprint.",
            f"Saving = {shift:.0f} km x ({cf:.4f} car - {bus:.4f} bus) kg CO2e/km",
            shift * (cf - bus), total))
        cut = 0.15 * car_km
        recs.append(_rec(
            "transport", "Combine errands and skip short drives",
            f"Planning trips together and walking or cycling for short distances can remove around {cut:.0f} km of driving a month.",
            f"Assumes 15% less driving. Saving = {cut:.0f} km x {cf:.4f} kg CO2e/km",
            cut * cf, total))

    tw_km = activity.get("two_wheeler_km", 0)
    if tw_km > 0:
        shift = 0.20 * tw_km
        pt = public_transport_factor("rail", factors)
        recs.append(_rec(
            "transport", "Use metro or cycle for some two-wheeler rides",
            f"Replacing about {shift:.0f} km of two-wheeler travel with metro, walking or cycling reduces fuel burned.",
            f"Assumes 20% shifted to metro. Saving = {shift:.0f} km x ({factors['two_wheeler']:.4f} - {pt:.4f}) kg CO2e/km",
            shift * (factors["two_wheeler"] - pt), total))

    kwh = activity.get("electricity_kwh", 0)
    renewable = activity.get("renewable_pct", 0) / 100
    grid = factors["electricity_grid_india"]
    if kwh > 0:
        cut_kwh = 0.15 * kwh
        recs.append(_rec(
            "electricity", "Upgrade to efficient appliances",
            "Switching to LED lighting, star-rated fans, ACs and fridges, and unplugging idle devices, typically trims household electricity use.",
            f"Assumes 15% less electricity. Saving = {cut_kwh:.0f} kWh x (1 - {renewable:.0%} renewable) x {grid} / {members} people",
            cut_kwh * (1 - renewable) * grid / members, total))
        if kwh / members > 80:
            ac_kwh = 0.10 * kwh
            recs.append(_rec(
                "electricity", "Run the AC at 24-26°C and use timers",
                "A higher thermostat setting and timer/sleep modes reduce compressor run-time, the biggest electricity load in many Indian homes.",
                f"Illustrative 10% reduction. Saving = {ac_kwh:.0f} kWh x (1 - {renewable:.0%}) x {grid} / {members}",
                ac_kwh * (1 - renewable) * grid / members, total))
        if renewable < 0.5:
            extra = 0.5 - renewable
            recs.append(_rec(
                "electricity", "Cover half your power with renewables",
                "Rooftop solar (PM Surya Ghar scheme) or a green-power tariff from your electricity provider can replace grid electricity.",
                f"Raise renewable share from {renewable:.0%} to 50%. Saving = {kwh:.0f} kWh x {extra:.0%} x {grid} / {members}",
                kwh * extra * grid / members, total))

    lpg = activity.get("lpg_kg", 0)
    if lpg > 0:
        cut = 0.10 * lpg
        recs.append(_rec(
            "cooking", "Cook smarter with lids and pressure cookers",
            "Covering pans, using a pressure cooker and soaking grains and lentils shortens cooking time and saves gas.",
            f"Illustrative 10% less LPG. Saving = {cut:.2f} kg x {factors['lpg']} / {members} people",
            cut * factors["lpg"] / members, total))

    recs = [r for r in recs if r["estimated_savings"] > 0]
    recs.sort(key=lambda r: r["estimated_savings"], reverse=True)
    return recs


def potential_savings(recs):
    """Sum of the best tip in each category (tips in one category overlap, so only one is counted)."""
    best = {}
    for r in recs:
        if r["category"] not in best or r["estimated_savings"] > best[r["category"]]["estimated_savings"]:
            best[r["category"]] = r
    return round(sum(r["estimated_savings"] for r in best.values()), 2)


def simulate(activity, factors, car_reduction_pct=0, pt_substitution_pct=0,
             electricity_reduction_pct=0, lpg_reduction_pct=0, renewable_pct=None):
    """What-if scenario. Percentages are 0-100.

    car_reduction_pct    : share of car km removed completely
    pt_substitution_pct  : share of car km moved to public transport
    (the two together cannot exceed 100% of car km)
    """
    def clamp(v):
        return min(max(float(v or 0), 0.0), 100.0)

    car_red, pt_sub = clamp(car_reduction_pct), clamp(pt_substitution_pct)
    if car_red + pt_sub > 100:
        pt_sub = 100 - car_red
    elec_red, lpg_red = clamp(electricity_reduction_pct), clamp(lpg_reduction_pct)

    current = calculate(activity, factors)
    scenario_activity = dict(activity)
    car_km = activity["car_km"] if activity.get("vehicle_type") == "car" else 0
    moved_km = car_km * pt_sub / 100
    scenario_activity["car_km"] = car_km * (1 - (car_red + pt_sub) / 100)
    scenario_activity["public_transport_km"] = activity["public_transport_km"] + moved_km
    scenario_activity["electricity_kwh"] = activity["electricity_kwh"] * (1 - elec_red / 100)
    scenario_activity["lpg_kg"] = activity["lpg_kg"] * (1 - lpg_red / 100)
    if renewable_pct is not None:
        scenario_activity["renewable_pct"] = clamp(renewable_pct)
    scenario = calculate(scenario_activity, factors)

    saving = current["total_emissions"] - scenario["total_emissions"]
    pct = saving / current["total_emissions"] * 100 if current["total_emissions"] > 0 else 0
    return {
        "inputs": {
            "car_reduction_pct": car_red, "pt_substitution_pct": pt_sub,
            "electricity_reduction_pct": elec_red, "lpg_reduction_pct": lpg_red,
            "renewable_pct": scenario_activity["renewable_pct"],
        },
        "current": current,
        "scenario": scenario,
        "scenario_activity": {k: round(v, 2) if isinstance(v, float) else v for k, v in scenario_activity.items()},
        "monthly_savings": round(saving, 2),
        "annual_savings": round(saving * 12, 2),
        "percent_reduction": round(pct, 1),
        "method": "Scenario activity values are recalculated with the same emission factors "
                  "(emissions = activity x factor). This is arithmetic, not machine learning.",
    }
