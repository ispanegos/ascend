import copy
import tomllib

import pytest

from ascend_engine import ASCEND_ENGINE_VERSION
from ascend_engine.config import ATTRIBUTES, ConfigError, config_path, load_config, parse_config


@pytest.fixture()
def raw():
    with config_path("0.1.1").open("rb") as handle:
        return tomllib.load(handle)


def test_version_and_status(cfg):
    assert ASCEND_ENGINE_VERSION == "0.1.1"
    assert cfg.engine_version == "0.1.1"
    assert cfg.calibration_status == "provisional"
    assert "not population norms" in cfg.raw["calibration_note"].lower()


def test_hash_is_stable(cfg):
    assert load_config("0.1.1").config_hash == cfg.config_hash
    assert len(cfg.config_hash) == 64


def test_spec_values(cfg):
    assert cfg.verified_threshold == 0.70
    assert cfg.confidence_weights == {"coverage": 0.45, "recency": 0.25, "repeatability": 0.15, "quality": 0.15}
    assert cfg.default_repeatability == 0.5
    assert cfg.update_caps == {"workout": 1.0, "verified_workout": 2.0, "assessment": 5.0, "boss": 8.0}
    assert cfg.overall_weights == {
        "endurance": 0.18, "strength": 0.18, "power": 0.12, "core": 0.14,
        "mobility": 0.12, "agility": 0.12, "recovery": 0.14,
    }
    assert set(cfg.overall_required) == {"endurance", "strength", "core", "mobility", "agility"}
    assert cfg.evidence_weights["boss"] == 1.0 and cfg.evidence_weights["spawn_test"] == 0.9
    assert cfg.initial_calibration_cap == 0.69 < cfg.verified_threshold
    assert cfg.independent_observation_min_hours == 24
    assert "spawn_test" in cfg.baseline_sources and "spawn_test" not in cfg.qualifying_sources
    assert cfg.required_any_subdomain["recovery"] == ("workload_response", "sleep_recovery")
    assert all(0 < prior < 100 for prior in cfg.missing_prior.values())


def test_brief_subdomains(cfg):
    names = {a: [sd.name for sd in cfg.attributes[a]] for a in ATTRIBUTES}
    assert names == {
        "endurance": ["sustained_locomotion", "cardiovascular_response", "pace_distance"],
        "strength": ["push", "pull", "knee_dominant", "hinge", "carry_grip"],
        "power": ["explosive_lower_body", "explosive_hinge", "explosive_upper_body"],
        "core": ["anti_extension_control", "bracing", "loaded_stability"],
        "mobility": ["ankle", "squat_pattern", "shoulder", "posterior_chain"],
        "agility": ["balance_control", "change_of_direction", "movement_accuracy"],
        "recovery": ["acute_hr_recovery", "workload_response", "sleep_recovery"],
    }


def test_every_curve_is_used(cfg):
    used = {s.curve for sds in cfg.attributes.values() for sd in sds for s in sd.sources}
    assert used == set(cfg.curves)


def test_no_curve_uses_demographics(raw):
    for curve in raw["curves"].values():
        assert not {"age", "sex", "height", "age_band", "sex_mode"} & set(curve)


def test_rejects_weights_not_summing_to_one(raw):
    broken = copy.deepcopy(raw)
    broken["attributes"]["mobility"]["subdomains"]["ankle"]["weight"] = 0.5
    with pytest.raises(ConfigError, match="sum to 1"):
        parse_config(broken)


def test_rejects_unknown_curve_reference(raw):
    broken = copy.deepcopy(raw)
    broken["attributes"]["mobility"]["subdomains"]["ankle"]["sources"] = [{"curve": "nope", "weight": 1.0}]
    with pytest.raises(ConfigError, match="unknown curve"):
        parse_config(broken)


def test_rejects_non_monotonic_curve(raw):
    broken = copy.deepcopy(raw)
    broken["curves"]["M02_ankle_mean_cm"]["points"] = [[0, 10], [4, 30], [8, 20]]
    with pytest.raises(ConfigError):
        parse_config(broken)


def test_rejects_missing_decay_rule(raw):
    broken = copy.deepcopy(raw)
    del broken["decay"]["recovery"]
    with pytest.raises(ConfigError, match="decay.recovery"):
        parse_config(broken)


def test_rejects_unknown_cap(raw):
    broken = copy.deepcopy(raw)
    broken["update"]["cap_for_source"]["boss"] = "legendary"
    with pytest.raises(ConfigError):
        parse_config(broken)


def test_rejects_bad_status(raw):
    broken = copy.deepcopy(raw)
    broken["calibration_status"] = "scientific"
    with pytest.raises(ConfigError):
        parse_config(broken)


def test_unknown_version():
    with pytest.raises(ConfigError):
        load_config("9.9.9")


def test_cap_must_stay_below_verification(raw):
    broken = copy.deepcopy(raw)
    broken["confidence"]["initial_calibration_cap"] = 0.70
    with pytest.raises(ConfigError, match="Spawn alone must not verify"):
        parse_config(broken)


def test_every_curve_documents_rationale_and_weakness(raw):
    broken = copy.deepcopy(raw)
    del broken["curves"]["M05_sit_reach_cm"]["weakness"]
    with pytest.raises(ConfigError, match="weakness"):
        parse_config(broken)


def test_missing_prior_is_never_zero(raw):
    broken = copy.deepcopy(raw)
    broken["estimation"]["missing_prior"]["strength"] = 0.0
    with pytest.raises(ConfigError):
        parse_config(broken)


def test_spawn_cannot_be_a_qualifying_source(raw):
    broken = copy.deepcopy(raw)
    broken["verification"]["qualifying_sources"].append("spawn_test")
    with pytest.raises(ConfigError):
        parse_config(broken)


def test_normalization_is_documented_as_provisional(raw):
    text = config_path("0.1.1").read_text()
    assert "PROVISIONAL" in text and "not validated standards" in text
