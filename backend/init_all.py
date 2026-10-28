"""One-step setup: create the database, load emission factors, add demo data,
generate the synthetic dataset and train the ML model.

Run:  python init_all.py            (keeps existing records)
      python init_all.py --reset    (rebuilds the demo records from scratch)
"""
import sys

from db import DB_PATH, init_db
from factors import seed_factors
from seed_demo import seed_demo_records


def bootstrap(train_if_missing=True, reset_demo=False, verbose=False):
    init_db()
    seed_factors()
    added = seed_demo_records(reset=reset_demo)
    meta = None
    from ml.train import MODEL_PATH, train
    if train_if_missing and not MODEL_PATH.exists():
        meta = train()
    if verbose:
        print(f"Database ready: {DB_PATH}")
        print(f"Demo records added: {added}")
    return meta


def main():
    reset = "--reset" in sys.argv
    print("[1/3] Creating database and loading emission factors...")
    bootstrap(train_if_missing=False, reset_demo=reset, verbose=True)
    print("[2/3] Generating synthetic training data and training the Random Forest...")
    from ml import train as train_module
    train_module.main()
    print("[3/3] Done. Start the API with:  python app.py")


if __name__ == "__main__":
    main()
