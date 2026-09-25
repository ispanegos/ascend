"""Milestone 3.1 semantics: calibration cap, temporal repeatability,
verification, missing-domain estimation and Peak."""

import random
from datetime import datetime, timedelta, timezone

import pytest

from ascend_engine import calculate
from ascend_engine.aggregation.attributes import (
    calibration_phase_confidence,
    conservative_estimate,
    independent_scores,
    spawn_confidence_reference,
)
from ascend_engine.config import ATTRIBUTES
from fixtures.athletes import athlete_b, athlete_h, athlete_i, athlete_j, athlete_k, athlete_l, sets
from fixtures.builder import attempt as a

T0 = datetime(2026, 9, 20, 9, tzinfo=timezone.utc)


def run(spawn):
    return calculate(spawn.payload())["attributes"]


# ---------------------------------------------------------------------------
# 1. Spawn never verifies
# ---------------------------------------------------------------------------


def test_spawn_alone_never_verifies_any_attribute():
    out = run(athlete_j())
    for attribute in ATTRIBUTES:
        stat = out[attribute]
        assert stat["status"] != "verified"
        assert stat["confidence"] <= 0.69
        assert stat["verified_peak"] is None


def test_calibration_phase_confidence_is_monotonic_and_capped(cfg):
    previous = -1.0
    for step in range(0, 101):
        value = calibration_phase_confidence(step / 100, cfg)
        assert value <= cfg.initial_calibration_cap
        assert value >= previous
        previous = value
    assert calibration_phase_confidence(spawn_confidence_reference(cfg), cfg) == pytest.approx(0.69)


def test_one_qualifying_later_event_can_verify_that_attribute_only():
    out = run(athlete_k())
    assert out["strength"]["status"] == "verified"
    assert out["strength"]["confidence"] >= 0.70
    assert out["strength"]["verified_peak"] == out["strength"]["current"]
    for attribute in ("endurance", "core", "mobility", "agility", "recovery"):
        assert out[attribute]["status"] == "provisional"


def test_same_day_repeat_does_not_verify_or_repeat():
    j, l = run(athlete_j()), run(athlete_l())
    assert l["strength"]["status"] == "provisional"
    assert l["strength"]["confidence"] == pytest.approx(j["strength"]["confidence"])
    knee = l["strength"]["trace"]["subdomain_scores"]["knee_dominant"]
    assert knee["independent_observations"] == 1
    assert knee["repeatability"] == 0.5


def test_later_workout_is_not_a_verification_event():
    s = athlete_b()
    s.test("F02", sets([(24, 10, 8, "clean")]), days_after=10, source_type="workout")
    assert run(s)["strength"]["status"] == "provisional"


def test_qualifying_event_during_spawn_period_does_not_count():
    # A reassessment 3 hours after Frame Spawn: still inside the baseline window.
    s = athlete_b()
    s.test("F06", [a(1, duration_s=95, rpe=8, limiting_factor="technique")], hours_after=3, source_type="reassessment")
    assert run(s)["core"]["status"] == "provisional"


def test_recovery_needs_workload_or_sleep_evidence_to_verify():
    s = athlete_b()
    s.test("E03", [a(1, data={"hr_stop_bpm": 150, "hr_1min_bpm": 122})], days_after=14, source_type="reassessment")
    recovery = run(s)["recovery"]
    assert recovery["status"] == "provisional"
    assert "workload_response" in recovery["trace"]["longitudinal"]["reason"]


# ---------------------------------------------------------------------------
# 2. Temporal repeatability
# ---------------------------------------------------------------------------


def test_independent_scores_collapses_same_day_observations():
    timed = [(T0, 40.0), (T0 + timedelta(hours=3), 42.0), (T0 + timedelta(hours=23), 41.0)]
    assert independent_scores(timed, 24) == [41.0]
    timed.append((T0 + timedelta(hours=30), 44.0))
    assert independent_scores(timed, 24) == [41.0, 44.0]


def test_repeatability_rises_only_with_independent_comparable_evidence():
    k = run(athlete_k())["strength"]["trace"]["subdomain_scores"]["knee_dominant"]
    assert k["independent_observations"] == 2
    assert k["repeatability"] == 1.0  # same performance two weeks apart


def test_time_passing_alone_never_raises_confidence():
    base = athlete_b().payload()
    later = athlete_b().payload(as_of="2026-12-31T00:00:00Z")
    for attribute in ATTRIBUTES:
        assert calculate(later)["attributes"][attribute]["confidence"] <= calculate(base)["attributes"][attribute]["confidence"]


# ---------------------------------------------------------------------------
# 4. Missing-domain estimation
# ---------------------------------------------------------------------------


def test_h_missing_best_subdomain_is_lower():
    assert run(athlete_h())["strength"]["current"] < run(athlete_b())["strength"]["current"]


def test_i_missing_worst_subdomain_is_not_higher():
    assert run(athlete_i())["strength"]["current"] <= run(athlete_b())["strength"]["current"]


def test_missing_evidence_lowers_confidence():
    b = run(athlete_b())
    for spawn in (athlete_h(), athlete_i()):
        assert run(spawn)["strength"]["confidence"] < b["strength"]["confidence"]


def test_estimator_never_uses_zero():
    estimate = conservative_estimate(observed=50.0, coverage=0.0, prior=20.0)
    assert estimate.value == 20.0


@pytest.mark.parametrize("seed", range(200))
def test_property_removing_a_subdomain_never_raises_the_estimate(seed, cfg):
    """For any subdomain scores at or above the prior, removing any one of
    them never raises the conservative estimate; removing the best always
    lowers it."""
    rng = random.Random(seed)
    prior = cfg.missing_prior["strength"]
    n = rng.randint(2, 5)
    weights = [rng.uniform(0.05, 1.0) for _ in range(n)]
    total = sum(weights)
    weights = [w / total for w in weights]
    scores = [rng.uniform(prior, 100.0) for _ in range(n)]

    def estimate(keep: list[int]) -> float:
        observed_weight = sum(weights[i] for i in keep)
        observed = sum(scores[i] * weights[i] for i in keep) / observed_weight
        return conservative_estimate(observed, observed_weight, prior).value

    full = estimate(list(range(n)))
    for removed in range(n):
        assert estimate([i for i in range(n) if i != removed]) <= full + 1e-9
    best = max(range(n), key=lambda i: scores[i])
    if len(set(scores)) > 1:
        assert estimate([i for i in range(n) if i != best]) < full


@pytest.mark.parametrize("test_key", ["F01", "F02", "F03", "F04", "F05"])
def test_removing_any_strength_test_never_raises_strength(test_key):
    base = run(athlete_b())["strength"]["current"]
    s = athlete_b()
    s.evidence = [e for e in s.evidence if e["test_key"] != test_key]
    assert run(s)["strength"]["current"] <= base


@pytest.mark.parametrize("test_key", ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "F01", "F02", "F03", "F04", "F05", "F06", "E01", "E02", "E03", "E04"])
def test_removing_any_test_never_raises_any_attribute(test_key):
    base = run(athlete_b())
    s = athlete_b()
    s.evidence = [e for e in s.evidence if e["test_key"] != test_key]
    out = run(s)
    for attribute in ATTRIBUTES:
        if base[attribute]["current"] is not None and out[attribute]["current"] is not None:
            assert out[attribute]["current"] <= base[attribute]["current"] + 1e-9, attribute


def test_unmeasurable_subdomains_do_not_pull_the_estimate_down():
    recovery = run(athlete_b())["recovery"]
    assert recovery["trace"]["estimate"]["missing_domain_adjustment"] == 0.0
    assert recovery["coverage"] == pytest.approx(0.4)  # …but they do lower Confidence


# ---------------------------------------------------------------------------
# 5. Peak
# ---------------------------------------------------------------------------


def test_after_spawn_only_a_provisional_peak_exists():
    strength = run(athlete_j())["strength"]
    assert strength["provisional_peak"] == strength["current"]
    assert strength["verified_peak"] is None


def test_peaks_never_decrease_on_weaker_later_evidence():
    first = run(athlete_k())["strength"]
    s = athlete_k()
    s.test("F02", sets([(12, 10, 8, "clean")]), days_after=30, source_type="reassessment")
    previous = {"attributes": {"strength": {"verified_peak": first["verified_peak"], "provisional_peak": first["provisional_peak"]}}}
    later = calculate(s.payload(previous=previous))["attributes"]["strength"]
    assert later["current"] < first["current"]
    assert later["verified_peak"] == first["verified_peak"]
    assert later["provisional_peak"] == first["provisional_peak"]


# ---------------------------------------------------------------------------
# 17. Decay: Spawn inactivity context never lowers measured capability
# ---------------------------------------------------------------------------


def test_profile_inactivity_context_never_lowers_spawn_capability():
    """Onboarding context ("inactive for a year") is not evidence: the engine
    ignores it, and measured Spawn capability is not decayed at initialization."""
    base = calculate(athlete_b().payload())["attributes"]
    s = athlete_b()
    payload = s.payload()
    payload["athlete"] = {**payload["athlete"], "activity_level": "inactive", "months_since_regular_training": 12}
    with_context = calculate(payload)["attributes"]
    for attribute in ATTRIBUTES:
        assert with_context[attribute]["current"] == base[attribute]["current"]
        assert with_context[attribute]["confidence"] == base[attribute]["confidence"]
        if base[attribute]["score"] is not None:
            assert base[attribute]["current"] == base[attribute]["score"]  # no decay applied at Spawn


# ---------------------------------------------------------------------------
# Event type vs entry source (ADR-036)
# ---------------------------------------------------------------------------


def test_verified_workout_is_a_qualifying_event_type():
    s = athlete_b()
    s.test("F02", sets([(24, 10, 8, "clean")]), days_after=10, source_type="verified_workout")
    assert run(s)["strength"]["status"] == "verified"


def test_wearable_entry_is_not_verified_workout_evidence():
    # Values entered from a wearable during an ordinary workout: better quality, still not verification.
    s = athlete_b()
    s.test("F02", sets([(24, 10, 8, "clean")]), days_after=10, source="wearable", source_type="workout")
    assert run(s)["strength"]["status"] == "provisional"
    # The legacy `wearable` event value does not verify either.
    s = athlete_b()
    s.test("F02", sets([(24, 10, 8, "clean")]), days_after=10, source="wearable", source_type="wearable")
    assert run(s)["strength"]["status"] == "provisional"


def test_wearable_event_moves_like_a_workout_not_a_verified_workout(cfg):
    assert cfg.cap_for_source["wearable"] == "workout"
    assert cfg.cap_for_source["verified_workout"] == "verified_workout"
    assert "wearable" not in cfg.qualifying_sources and "workout" not in cfg.qualifying_sources
