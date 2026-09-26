"""Path suggestions (ADR-041): advisory, deterministic, isolated from scoring."""

import copy
import json
import subprocess
import sys
import threading
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

import pytest

from ascend_engine import calculate
from ascend_engine.paths import PATH_RULES_VERSION, PathInputError, suggest_paths
from ascend_engine.server import Handler
from fixtures.athletes import athlete_b

ENGINE = Path(__file__).resolve().parents[1]


def stats(**overrides):
    base = {
        "endurance": (52, 0.68),
        "strength": (44, 0.68),
        "power": (None, 0.0),
        "core": (51, 0.67),
        "mobility": (50, 0.66),
        "agility": (56, 0.65),
        "recovery": (57, 0.48),
    }
    base.update(overrides)
    return {
        "stats": {
            a: {"current": c, "confidence": conf, "status": "unranked" if c is None else "provisional"}
            for a, (c, conf) in base.items()
        }
    }


def by_priority(result, priority):
    return [s["attribute"] for s in result["suggestions"] if s["priority"] == priority]


def test_primary_is_the_least_developed_comparable_attribute():
    result = suggest_paths(stats())
    assert result["rules_version"] == PATH_RULES_VERSION
    assert by_priority(result, "primary") == ["strength"]
    reason = result["suggestions"][0]["reason"]
    assert "Strength (44)" in reason and "7 points below the middle" in reason


def test_low_confidence_attributes_are_named_not_compared():
    result = suggest_paths(stats(recovery=(20, 0.48)))
    assert "recovery" not in by_priority(result, "primary")
    assert any("Recovery is not compared" in note for note in result["notes"])


def test_second_attribute_only_when_notably_low():
    assert by_priority(suggest_paths(stats()), "secondary") == ["power"]  # Core 51 is not 5 below the middle
    result = suggest_paths(stats(core=(40, 0.67)))
    assert by_priority(result, "primary") == ["core"]
    assert by_priority(result, "secondary") == ["strength", "power"]


def test_balanced_profile_says_so():
    result = suggest_paths(stats(endurance=(50, 0.7), strength=(49, 0.7), core=(51, 0.7), mobility=(50, 0.7), agility=(52, 0.7)))
    assert by_priority(result, "primary") == ["strength"]
    assert "close together" in result["suggestions"][0]["reason"]


def test_unranked_is_suggested_honestly_and_never_ranked():
    power = next(s for s in suggest_paths(stats())["suggestions"] if s["attribute"] == "power")
    assert power["priority"] == "secondary"
    assert "no evidence for Power yet" in power["reason"] and "does not rank it" in power["reason"]
    assert power["basis"]["current"] is None


def test_too_few_comparable_attributes_gives_no_suggestion():
    thin = stats(endurance=(None, 0), strength=(None, 0), core=(None, 0), mobility=(40, 0.6), agility=(45, 0.6))
    result = suggest_paths(thin)
    assert result["suggestions"] == []
    assert any("needs at least 3" in note for note in result["notes"])


@pytest.mark.parametrize("seed", range(50))
def test_suggestions_always_form_a_valid_configuration(seed):
    import random

    rng = random.Random(seed)
    payload = stats(
        **{
            a: ((None, 0.0) if rng.random() < 0.2 else (rng.uniform(10, 90), rng.uniform(0.3, 0.9)))
            for a in ("endurance", "strength", "power", "core", "mobility", "agility", "recovery")
        }
    )
    result = suggest_paths(payload)
    attributes = [s["attribute"] for s in result["suggestions"]]
    assert len(attributes) == len(set(attributes)) <= 3
    assert len(by_priority(result, "secondary")) <= 2
    assert len(by_priority(result, "primary")) == (1 if attributes else 0)


def test_deterministic_and_never_mutates_the_input():
    payload = stats()
    before = copy.deepcopy(payload)
    assert suggest_paths(payload) == suggest_paths(payload)
    assert payload == before


def test_suggesting_never_changes_stats():
    engine_input = athlete_b().payload()
    before = calculate(engine_input)
    attributes = before["attributes"]
    suggest_paths(
        {"stats": {a: {"current": v["current"], "confidence": v["confidence"], "status": v["status"]} for a, v in attributes.items()}}
    )
    assert calculate(engine_input) == before


@pytest.mark.parametrize(
    "payload",
    [None, {}, {"stats": {}}, stats(strength=(140, 0.5)), stats(strength=(40, 1.5))],
)
def test_rejects_malformed_input(payload):
    with pytest.raises(PathInputError):
        suggest_paths(payload)


def test_cli_round_trip_and_error_code():
    ok = subprocess.run([sys.executable, "-m", "ascend_engine", "suggest-paths"], input=json.dumps(stats()),
                        capture_output=True, text=True, cwd=ENGINE)
    assert ok.returncode == 0, ok.stderr
    assert json.loads(ok.stdout)["suggestions"][0]["attribute"] == "strength"
    bad = subprocess.run([sys.executable, "-m", "ascend_engine", "suggest-paths"], input="{}",
                         capture_output=True, text=True, cwd=ENGINE)
    assert bad.returncode == 2


def test_http_endpoint():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        body = json.dumps(stats()).encode()
        request = urllib.request.Request(f"http://127.0.0.1:{server.server_port}/v1/suggest-paths", data=body,
                                         headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(request) as response:
            assert json.loads(response.read())["rules_version"] == PATH_RULES_VERSION
    finally:
        server.shutdown()
