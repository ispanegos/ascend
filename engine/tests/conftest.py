import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ascend_engine.config import load_config  # noqa: E402


@pytest.fixture(scope="session")
def cfg():
    return load_config("0.1.0")
