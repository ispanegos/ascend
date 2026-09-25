import json
import subprocess
import sys
from pathlib import Path

from fixtures.athletes import athlete_b

ENGINE = Path(__file__).resolve().parents[1]


def run(args, stdin=""):
    return subprocess.run([sys.executable, "-m", "ascend_engine", *args], input=stdin, capture_output=True, text=True, cwd=ENGINE)


def test_calculate_round_trip():
    result = run(["calculate"], json.dumps(athlete_b().payload()))
    assert result.returncode == 0, result.stderr
    out = json.loads(result.stdout)
    assert out["engine_version"] == "0.1.0"
    assert out["attributes"]["strength"]["current"] is not None


def test_invalid_input_exit_code():
    result = run(["calculate"], "{not json")
    assert result.returncode == 2
    assert json.loads(result.stderr)["error"] == "invalid_input"


def test_validate_config():
    result = run(["validate-config"])
    assert result.returncode == 0 and result.stdout.startswith("ok 0.1.0")


def test_config_dump_is_provisional():
    out = json.loads(run(["config"]).stdout)
    assert out["calibration_status"] == "provisional"
    assert out["config"]["curves"]
