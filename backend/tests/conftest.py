"""Test setup: use a throw-away database so tests never touch ecotrack.db."""
import os
import sys
import tempfile
from pathlib import Path

import pytest

TMP_DIR = tempfile.mkdtemp(prefix="ecotrack_test_")
os.environ["ECOTRACK_DB"] = str(Path(TMP_DIR) / "test.db")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture(scope="session")
def client():
    from app import app
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c
