"""Train the Random Forest that predicts NEXT month's emissions.

Steps:
  1. Generate the synthetic dataset (see synthetic.py).
  2. Split by TIME, not randomly: examples whose target month is before the
     cut-off are used for training, the last 6 target months are held out
     for testing. This mimics real use - learn from the past, predict the future.
  3. Train scikit-learn's RandomForestRegressor.
  4. Report MAE and RMSE on the held-out months, next to a simple
     "next month = this month" baseline so the numbers mean something.
  5. Save the model and its metadata.

IMPORTANT: these scores are measured on synthetic data only. They show the
pipeline works; they do NOT prove real-world accuracy.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ml import synthetic  # noqa: E402

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "emission_forecaster.joblib"
META_PATH = MODEL_DIR / "model_meta.json"
MODEL_VERSION = "rf-1.0"
TEST_FROM_TARGET_MONTH = "2025-07"  # last 6 target months are the test set


def _metrics(y_true, y_pred):
    return {
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 2),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 2),
        "r2": round(float(r2_score(y_true, y_pred)), 3),
    }


def train():
    raw = synthetic.generate_raw()
    data = synthetic.build_supervised(raw)
    synthetic.DATA_DIR.mkdir(parents=True, exist_ok=True)
    raw.to_csv(synthetic.RAW_PATH, index=False)
    data.to_csv(synthetic.SUPERVISED_PATH, index=False)

    train_df = data[data["target_month"] < TEST_FROM_TARGET_MONTH]
    test_df = data[data["target_month"] >= TEST_FROM_TARGET_MONTH]
    X_train, y_train = train_df[synthetic.FEATURES], train_df[synthetic.TARGET]
    X_test, y_test = test_df[synthetic.FEATURES], test_df[synthetic.TARGET]

    model = RandomForestRegressor(
        n_estimators=300, max_depth=14, min_samples_leaf=3,
        random_state=synthetic.SEED, n_jobs=-1,
    )
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    model_scores = _metrics(y_test, pred)
    baseline_scores = _metrics(y_test, test_df["current_emissions"])  # "same as this month"

    importances = sorted(
        ({"feature": f, "importance": round(float(i), 4)}
         for f, i in zip(synthetic.FEATURES, model.feature_importances_)),
        key=lambda d: d["importance"], reverse=True)

    meta = {
        "model_version": MODEL_VERSION,
        "algorithm": "RandomForestRegressor (scikit-learn)",
        "hyperparameters": {"n_estimators": 300, "max_depth": 14, "min_samples_leaf": 3,
                            "random_state": synthetic.SEED},
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data": {
            "type": "synthetic",
            "seed": synthetic.SEED,
            "synthetic_users": synthetic.N_USERS,
            "months_per_user": synthetic.N_MONTHS,
            "monthly_records": int(len(raw)),
            "supervised_rows": int(len(data)),
            "train_rows": int(len(train_df)),
            "test_rows": int(len(test_df)),
            "train_target_months": f"{train_df['target_month'].min()} to {train_df['target_month'].max()}",
            "test_target_months": f"{test_df['target_month'].min()} to {test_df['target_month'].max()}",
            "split": "chronological (by target month), not random",
        },
        "features": synthetic.FEATURES,
        "target": "total emissions of the following month (kg CO2e)",
        "metrics": {"model": model_scores, "baseline_same_as_this_month": baseline_scores},
        "feature_importances": importances,
        "disclaimer": "Trained and evaluated on synthetic data only. Test scores show the pipeline "
                      "works but do not prove real-world prediction accuracy.",
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    META_PATH.write_text(json.dumps(meta, indent=2))
    return meta


def main():
    meta = train()
    d, m = meta["data"], meta["metrics"]
    print(f"Synthetic records: {d['monthly_records']:,} | training rows: {d['train_rows']:,} | test rows: {d['test_rows']:,}")
    print(f"Test months: {d['test_target_months']} (chronological hold-out)")
    print(f"Random Forest  -> MAE {m['model']['mae']} | RMSE {m['model']['rmse']} | R2 {m['model']['r2']}  (kg CO2e)")
    print(f"Naive baseline -> MAE {m['baseline_same_as_this_month']['mae']} | RMSE {m['baseline_same_as_this_month']['rmse']}")
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
