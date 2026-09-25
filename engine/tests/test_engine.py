import copy
import json
import random

import pytest

from ascend_engine import ASCEND_ENGINE_VERSION, calculate
from ascend_engine.config import ATTRIBUTES
from ascend_engine.evidence.parsing import EvidenceError
from fixtures.athletes import FIXTURES, athlete_b
from fixtures.builder import Spawn, attempt as a


def stats(payload):
    return calculate(payload)["attributes"]


def replace_test(spawn: Spawn, test_key: str, **kwargs) -> Spawn:
    spawn.evidence = [e for e in spawn.evidence if e["test_key"] != test_key]
    return spawn.test(test_key, **kwargs)


class TestCompleteSpawn:
    def test_initialized_athlete(self):
        out = calculate(athlete_b().payload())
        assert out["engine_version"] == ASCEND_ENGINE_VERSION == "0.1.1"
        assert out["calibration_status"] == "provisional"
        for attribute in ("endurance", "strength", "core", "mobility", "agility"):
            assert out["attributes"][attribute]["current"] is not None
            # Spawn alone never verifies (Milestone 3.1 §1).
            assert out["attributes"][attribute]["status"] == "provisional"
            assert out["attributes"][attribute]["confidence"] <= 0.69
        assert out["attributes"]["power"]["status"] == "unranked"
        assert out["attributes"]["power"]["current"] is None
        assert out["attributes"]["recovery"]["status"] == "provisional"
        assert out["overall"]["current"] is not None
        assert "power" not in out["overall"]["participating"]

    def test_every_derived_value_carries_engine_version(self):
        out = calculate(athlete_b().payload())
        for stat in out["attributes"].values():
            assert stat["trace"]["engine_version"] == "0.1.1"
            assert stat["trace"]["config_hash"] == out["config_hash"]
        assert out["overall"]["trace"]["engine_version"] == "0.1.1"

    def test_scores_and_confidence_in_range_for_all_fixtures(self):
        for build in FIXTURES.values():
            out = calculate(build().payload())
            for stat in out["attributes"].values():
                assert stat["current"] is None or 0 <= stat["current"] <= 100
                assert 0 <= stat["confidence"] <= 1


class TestTrace:
    def test_why_is_my_endurance(self):
        endurance = stats(athlete_b().payload())["endurance"]
        trace = endurance["trace"]
        assert {i["test_key"] for i in trace["inputs"]} >= {"E02", "E04"}
        assert trace["features"]["E04"]["values"]["run_walk_speed_m_per_min"] == 195.0
        sub = trace["subdomain_scores"]
        assert set(sub) == {"sustained_locomotion", "cardiovascular_response", "pace_distance"}
        assert sub["pace_distance"]["sources"][0]["curve"] == "E04_speed"
        assert set(trace["confidence"]) >= {"coverage", "recency", "repeatability", "quality", "value"}
        # The score is reproducible from the trace alone.
        rebuilt = sum(sub[n]["score"] * trace["weights"]["renormalized"][n] for n in trace["weights"]["renormalized"])
        assert rebuilt == pytest.approx(trace["estimate"]["observed"], abs=1e-3)
        assert trace["estimate"]["value"] == pytest.approx(endurance["current"], abs=1e-3)
        assert trace["longitudinal"]["verification_eligible"] is False

    def test_trace_records_body_mass_used_for_normalization(self):
        strength = stats(athlete_b().payload())["strength"]["trace"]
        source = strength["subdomain_scores"]["knee_dominant"]["sources"][0]
        assert source["body_mass_mode"] == "mixed" and source["body_mass_kg"] == 78.0
        assert source["raw"] == 24.0 and source["normalized"] != source["raw"]

    def test_evidence_ids_link_to_inputs(self):
        spawn = athlete_b()
        endurance = stats(spawn.payload())["endurance"]
        ids = {e["id"] for e in spawn.evidence if e["test_key"] in ("E01", "E02", "E04")}
        assert set(endurance["evidence_ids"]) == ids  # E01 via heart-rate efficiency


class TestUnknownIsNotZero:
    def test_missing_tests_reduce_confidence_and_never_raise_the_score(self):
        full = stats(athlete_b().payload())
        spawn = athlete_b()
        spawn.evidence = [e for e in spawn.evidence if e["test_key"] != "F04"]
        spawn.gap("F04", "skipped", "missing_equipment")
        partial = stats(spawn.payload())
        assert partial["strength"]["uncapped_confidence"] < full["strength"]["uncapped_confidence"]
        assert partial["strength"]["coverage"] == pytest.approx(0.8)
        assert partial["strength"]["current"] <= full["strength"]["current"]
        # Not zero: well above what a zero for Pull would give.
        other = [full["strength"]["trace"]["subdomain_scores"][n]["score"] for n in ("push", "knee_dominant", "hinge", "carry_grip")]
        assert partial["strength"]["current"] > 0.8 * sum(other) / 4
        assert partial["strength"]["trace"]["gaps"] == [{"test_key": "F04", "status": "skipped", "reason_code": "missing_equipment"}]

    def test_no_evidence_is_unranked(self):
        out = calculate(Spawn("empty", 80.0).payload())
        for attribute in ATTRIBUTES:
            assert out["attributes"][attribute]["current"] is None
            assert out["attributes"][attribute]["status"] == "unranked"
            assert out["attributes"][attribute]["confidence"] == 0.0
        assert out["overall"]["status"] == "unranked"

    def test_pain_is_not_poor_performance(self):
        spawn = athlete_b()
        replace_test(spawn, "F06", attempts=[a(1, duration_s=95, rpe=8, limiting_factor="pain")])
        painful = stats(spawn.payload())
        clean = stats(athlete_b().payload())
        bracing = lambda s: s["core"]["trace"]["subdomain_scores"]["bracing"]["score"]  # noqa: E731
        assert bracing(painful) == pytest.approx(bracing(clean))
        assert painful["core"]["confidence"] < clean["core"]["confidence"]
        assert painful["core"]["current"] == pytest.approx(clean["core"]["current"])

    def test_stopped_for_pain_is_a_gap_not_zero(self):
        spawn = athlete_b()
        spawn.evidence = [e for e in spawn.evidence if e["test_key"] != "F06"]
        spawn.gap("F06", "aborted", "pain")
        core = stats(spawn.payload())["core"]
        assert core["trace"]["subdomain_scores"]["bracing"]["observed"] is False
        assert core["current"] is not None and core["current"] > 0

    def test_power_stays_unranked(self):
        assert stats(athlete_b().payload())["power"]["current"] is None

    def test_body_mass_missing_leaves_normalized_tests_unknown(self):
        spawn = athlete_b()
        spawn.body_mass_kg = None
        strength = stats(spawn.payload())["strength"]
        sub = strength["trace"]["subdomain_scores"]
        assert sub["knee_dominant"]["observed"] is False
        assert "body mass" in sub["knee_dominant"]["missing"][0]["reason"]
        assert sub["push"]["observed"] is True


class TestMonotonicRelationships:
    def test_stronger_squat_never_lowers_strength(self):
        previous = -1.0
        for load in (8, 12, 16, 20, 24, 32, 40):
            spawn = athlete_b()
            replace_test(spawn, "F02", attempts=[a(1, load_kg=load, reps=10, rpe=7, technique="clean")], data={"stop_reason": "muscular_fatigue"})
            value = stats(spawn.payload())["strength"]["current"]
            assert value >= previous
            previous = value

    def test_better_run_never_lowers_endurance(self):
        previous = -1.0
        for distance in (1500, 2000, 2500, 3000, 3500, 4000, 5000):
            spawn = athlete_b()
            replace_test(spawn, "E04", attempts=[a(1, distance_m=distance, duration_s=1200, avg_hr_bpm=158, data={"run_time_s": 1200, "walk_time_s": 0})])
            value = stats(spawn.payload())["endurance"]["current"]
            assert value >= previous
            previous = value

    def test_faster_agility_never_lowers_agility(self):
        previous = -1.0
        for time in (16.0, 13.0, 11.0, 9.5, 8.0, 7.0):
            spawn = athlete_b()
            replace_test(spawn, "M07", attempts=[a(i, duration_s=time, data={"errors": 0, "balance_loss": "no"}) for i in (1, 2, 3)])
            value = stats(spawn.payload())["agility"]["current"]
            assert value >= previous
            previous = value

    def test_demographics_do_not_change_scores(self):
        base = calculate(athlete_b().payload())
        payload = athlete_b().payload()
        payload["athlete"].update({"height_cm": 201.0, "age_years": 71, "sex": "female", "training_experience": "competitive", "recent_inactivity": "over_12_months"})
        other = calculate(payload)
        for attribute in ATTRIBUTES:
            assert other["attributes"][attribute]["current"] == base["attributes"][attribute]["current"]


class TestDeterminism:
    def test_same_input_same_output(self):
        payload = athlete_b().payload()
        assert json.dumps(calculate(payload), sort_keys=True) == json.dumps(calculate(copy.deepcopy(payload)), sort_keys=True)

    def test_evidence_order_does_not_matter(self):
        payload = athlete_b().payload()
        shuffled = copy.deepcopy(payload)
        random.Random(7).shuffle(shuffled["evidence"])
        assert calculate(shuffled) == calculate(payload)

    def test_input_hash_changes_with_evidence(self):
        base = calculate(athlete_b().payload())["input_hash"]
        spawn = athlete_b()
        replace_test(spawn, "F06", attempts=[a(1, duration_s=96, rpe=8, limiting_factor="technique")])
        assert calculate(spawn.payload())["input_hash"] != base

    def test_as_of_defaults_to_newest_evidence_not_the_clock(self):
        out = calculate(athlete_b().payload())
        newest = max(e["occurred_at"] for e in athlete_b().evidence)
        assert out["as_of"] == newest

    def test_recalculation_with_previous_peaks_never_lowers_them(self):
        first = calculate(athlete_b().payload())
        previous = {"attributes": {a: {"verified_peak": 99.0, "provisional_peak": 99.5} for a in ATTRIBUTES}}
        second = calculate(athlete_b().payload(previous=previous))
        for attribute in ("strength", "mobility"):
            assert second["attributes"][attribute]["verified_peak"] == 99.0
            assert second["attributes"][attribute]["provisional_peak"] == 99.5
            assert second["attributes"][attribute]["current"] == first["attributes"][attribute]["current"]


class TestInputValidation:
    def test_bad_schema_version(self):
        with pytest.raises(EvidenceError):
            calculate({"schema_version": 2, "athlete": {"id": "x"}})

    def test_bad_timestamp(self):
        payload = athlete_b().payload()
        payload["evidence"][0]["occurred_at"] = "yesterday"
        with pytest.raises(EvidenceError):
            calculate(payload)

    def test_missing_athlete(self):
        with pytest.raises(EvidenceError):
            calculate({"schema_version": 1, "evidence": []})
