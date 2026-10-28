"""Plain-language insights computed from the user's saved records (rule-based)."""
from calculator import CATEGORY_LABELS

CATEGORY_FIELDS = {
    "electricity": "electricity_emissions",
    "car": "car_emissions",
    "two_wheeler": "two_wheeler_emissions",
    "public_transport": "public_transport_emissions",
    "cooking": "cooking_emissions",
}


def categories_of(record):
    total = record["total_emissions"] or 0
    return [
        {"key": k, "label": CATEGORY_LABELS[k], "value": round(record[f], 2),
         "share": round(record[f] / total * 100, 1) if total > 0 else 0.0}
        for k, f in CATEGORY_FIELDS.items()
    ]


def pct_change(new, old):
    if old is None or old == 0:
        return None
    return round((new - old) / old * 100, 1)


def month_comparison(latest, previous):
    if not latest:
        return []
    rows = []
    for k, f in CATEGORY_FIELDS.items():
        cur = latest[f]
        prev = previous[f] if previous else None
        rows.append({"key": k, "label": CATEGORY_LABELS[k], "current": round(cur, 2),
                     "previous": round(prev, 2) if prev is not None else None,
                     "change_pct": pct_change(cur, prev)})
    rows.append({"key": "total", "label": "Total", "current": round(latest["total_emissions"], 2),
                 "previous": round(previous["total_emissions"], 2) if previous else None,
                 "change_pct": pct_change(latest["total_emissions"], previous["total_emissions"] if previous else None)})
    return rows


def build_insights(records):
    """Return a short list of {tone, title, text} based only on the data."""
    if not records:
        return []
    out = []
    latest = records[-1]
    cats = sorted(categories_of(latest), key=lambda c: c["value"], reverse=True)
    top = cats[0]
    if top["value"] > 0:
        out.append({"tone": "info", "title": f"{top['label']} leads your footprint",
                    "text": f"It made up {top['share']}% of your emissions in {latest['month']}."})

    if len(records) >= 2:
        prev = records[-2]
        change = pct_change(latest["total_emissions"], prev["total_emissions"])
        if change is not None:
            if change > 0:
                out.append({"tone": "warning", "title": f"Up {change}% from last month",
                            "text": f"Total emissions rose from {prev['total_emissions']:.0f} to {latest['total_emissions']:.0f} kg CO2e."})
            else:
                out.append({"tone": "positive", "title": f"Down {abs(change)}% from last month",
                            "text": f"Total emissions fell from {prev['total_emissions']:.0f} to {latest['total_emissions']:.0f} kg CO2e."})
        # biggest single-category move
        moves = []
        for k, f in CATEGORY_FIELDS.items():
            diff = latest[f] - prev[f]
            moves.append((abs(diff), diff, k))
        _, diff, key = max(moves)
        if abs(diff) >= 1:
            verb = "increased" if diff > 0 else "decreased"
            out.append({"tone": "warning" if diff > 0 else "positive",
                        "title": f"{CATEGORY_LABELS[key]} {verb} the most",
                        "text": f"A change of {diff:+.1f} kg CO2e compared with {prev['month']}."})

    if len(records) >= 3:
        best = min(records, key=lambda r: r["total_emissions"])
        worst = max(records, key=lambda r: r["total_emissions"])
        out.append({"tone": "positive", "title": f"Lowest month: {best['month']}",
                    "text": f"{best['total_emissions']:.0f} kg CO2e. Your highest was {worst['month']} at {worst['total_emissions']:.0f} kg."})
        last3 = sum(r["total_emissions"] for r in records[-3:]) / 3
        if len(records) >= 6:
            prior3 = sum(r["total_emissions"] for r in records[-6:-3]) / 3
            change = pct_change(last3, prior3)
            if change is not None:
                tone = "warning" if change > 0 else "positive"
                out.append({"tone": tone, "title": "3-month trend",
                            "text": f"Your recent 3-month average is {abs(change)}% {'higher' if change > 0 else 'lower'} than the 3 months before."})
    return out[:5]
