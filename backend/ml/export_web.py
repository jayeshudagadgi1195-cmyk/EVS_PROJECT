"""Export everything the static (GitHub Pages) version of EcoTrack AI needs.

The browser version cannot run Python, so this script writes JSON files into
frontend/public/data/:

  model.json        the trained Random Forest's trees (thresholds, splits, leaf
                    values) + its metrics. The browser walks these trees itself,
                    so predictions come from the SAME trained model.
  factors.json      the emission factors with their sources
  demo.json         the 12 labelled demo records
  check.json        a few Python predictions, used to verify the JS version

Run from the backend folder:  python -m ml.export_web
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from factors import FACTORS  # noqa: E402
from ml import synthetic  # noqa: E402
from ml.predictor import _feature_row, load_model  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "data"


def export_trees(model):
    trees = []
    for est in model.estimators_:
        t = est.tree_
        trees.append({
            "f": t.feature.tolist(),                                   # feature index (-2 = leaf)
            "t": [round(float(x), 6) for x in t.threshold],            # go left if x <= t
            "l": t.children_left.tolist(),
            "r": t.children_right.tolist(),
            "v": [round(float(x), 4) for x in t.value[:, 0, 0]],       # leaf prediction
        })
    return trees


def main():
    from init_all import bootstrap
    from repository import list_records
    from seed_demo import seed_demo_records

    bootstrap(train_if_missing=True)
    seed_demo_records(reset=True)
    model, meta = load_model()
    OUT.mkdir(parents=True, exist_ok=True)

    (OUT / "model.json").write_text(json.dumps(
        {"meta": meta, "features": synthetic.FEATURES, "trees": export_trees(model)}, separators=(",", ":")))

    (OUT / "factors.json").write_text(json.dumps(
        [{"id": i + 1, **f} for i, f in enumerate(FACTORS)], indent=1))

    keep = ["month", "vehicle_type", "fuel_type", "electricity_kwh", "renewable_pct", "household_members",
            "car_km", "two_wheeler_km", "public_transport_km", "public_transport_mode", "lpg_kg"]
    records = list_records()
    (OUT / "demo.json").write_text(json.dumps([{k: r[k] for k in keep} for r in records], indent=1))

    # Reference predictions so the JavaScript tree walker can be checked against scikit-learn
    rows = [_feature_row(r, records[i - 1] if i else None) for i, r in enumerate(records)]
    X = pd.DataFrame(rows, columns=synthetic.FEATURES)
    (OUT / "check.json").write_text(json.dumps(
        {"rows": X.values.tolist(), "predictions": [float(p) for p in model.predict(X)]}))

    size = (OUT / "model.json").stat().st_size / 1e6
    print(f"Exported {len(model.estimators_)} trees ({size:.1f} MB), {len(records)} demo records -> {OUT}")


if __name__ == "__main__":
    main()
