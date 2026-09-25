import pytest

from ascend_engine.aggregation.overall import calculate_overall
from ascend_engine.confidence.confidence import combine, recency_factor, repeatability, status_for


def test_spec_formula_and_components(cfg):
    breakdown = combine(coverage=0.8, recency=1.0, repeat=0.5, quality=0.85, cfg=cfg)
    assert breakdown.value == pytest.approx(0.45 * 0.8 + 0.25 * 1.0 + 0.15 * 0.5 + 0.15 * 0.85)
    assert breakdown.as_dict()["coverage"] == 0.8


def test_clamped(cfg):
    assert combine(2.0, 2.0, 2.0, 2.0, cfg).value == 1.0
    assert combine(-1.0, -1.0, -1.0, -1.0, cfg).value == 0.0


def test_repeatability_defaults_until_two_observations(cfg):
    assert repeatability([], cfg) == 0.5
    assert repeatability([40.0], cfg) == 0.5
    assert repeatability([40.0, 40.0], cfg) == 1.0
    assert repeatability([40.0, 20.0], cfg) < repeatability([40.0, 38.0], cfg)


def test_recency_grace_then_linear_to_floor(cfg):
    assert recency_factor(0, 14, cfg) == 1.0
    assert recency_factor(14, 14, cfg) == 1.0
    assert recency_factor(44, 14, cfg) == pytest.approx(1.0 - 0.5 * 0.8)
    assert recency_factor(1000, 14, cfg) == pytest.approx(0.2)


def test_status(cfg):
    assert status_for(None, 0.99, cfg) == "unranked"
    assert status_for(30.0, 0.69, cfg) == "provisional"
    assert status_for(30.0, 0.70, cfg) == "verified"


FULL = {
    "endurance": (30.0, 0.9), "strength": (40.0, 0.9), "power": (None, 0.0), "core": (35.0, 0.9),
    "mobility": (50.0, 0.9), "agility": (45.0, 0.9), "recovery": (25.0, 0.6),
}


def test_overall_formula_with_missing_power_renormalized(cfg):
    result = calculate_overall(FULL, cfg)
    available = {a: v for a, v in FULL.items() if v[0] is not None}
    total = sum(cfg.overall_weights[a] for a in available)
    weighted = sum(v[0] * cfg.overall_weights[a] / total for a, v in available.items())
    lowest = sorted(v[0] for v in available.values())[:3]
    assert result.score == pytest.approx(0.8 * weighted + 0.2 * sum(lowest) / 3)
    assert "power" not in result.participating
    assert set(result.lowest_three_attributes) == {"recovery", "endurance", "core"}


def test_missing_power_is_not_zero(cfg):
    with_zero_power = dict(FULL, power=(0.0, 0.9))
    assert calculate_overall(FULL, cfg).score > calculate_overall(with_zero_power, cfg).score


def test_overall_unranked_until_required_stats_exist(cfg):
    for required in cfg.overall_required:
        missing = dict(FULL, **{required: (None, 0.0)})
        result = calculate_overall(missing, cfg)
        assert result.score is None and result.status == "unranked"
        assert required in result.missing_required
    # Recovery is not required.
    assert calculate_overall(dict(FULL, recovery=(None, 0.0)), cfg).score is not None


def test_overall_confidence_is_weighted_mean(cfg):
    result = calculate_overall(FULL, cfg)
    available = {a: v for a, v in FULL.items() if v[0] is not None}
    total = sum(cfg.overall_weights[a] for a in available)
    assert result.confidence == pytest.approx(sum(v[1] * cfg.overall_weights[a] / total for a, v in available.items()))
