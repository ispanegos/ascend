"""Relationships the synthetic athletes must respect (brief §19)."""

from ascend_engine import calculate
from ascend_engine.config import ATTRIBUTES
from fixtures.athletes import FIXTURES


def results():
    return {key: calculate(build().payload()) for key, build in FIXTURES.items()}


R = results()


def cur(key, attribute):
    return R[key]["attributes"][attribute]["current"]


def conf(key, attribute):
    return R[key]["attributes"][attribute]["confidence"]


def test_strong_athlete_out_lifts_endurance_athlete():
    assert cur("C", "strength") > cur("D", "strength")


def test_endurance_athlete_out_runs_strong_athlete():
    assert cur("D", "endurance") > cur("C", "endurance")


def test_detrained_beginner_below_recreational_everywhere_measured():
    for attribute in ("endurance", "strength", "core", "mobility", "agility", "recovery"):
        assert cur("A", attribute) < cur("B", attribute)


def test_missing_tests_lower_confidence_and_never_raise_capability():
    for attribute in ("endurance", "strength", "core"):
        assert conf("E", attribute) < conf("B", attribute)
        assert cur("E", attribute) <= cur("B", attribute)
    assert R["E"]["attributes"]["recovery"]["status"] == "unranked"
    assert R["E"]["overall"]["current"] is not None


def test_asymmetric_mobility_is_visible_in_the_trace():
    trace = R["F"]["attributes"]["mobility"]["trace"]
    assert trace["features"]["M02"]["values"]["ankle_asymmetry_cm"] == 9.0
    assert cur("F", "mobility") < cur("B", "mobility")


def test_power_unranked_for_everyone_and_not_zero_in_overall():
    for key in R:
        assert R[key]["attributes"]["power"]["current"] is None
        assert "power" not in R[key]["overall"]["participating"]


def test_all_values_in_range():
    for out in R.values():
        for attribute in ATTRIBUTES:
            value = out["attributes"][attribute]["current"]
            assert value is None or 0 <= value <= 100


def test_milestone_3_1_invariants():
    assert cur("H", "strength") <= cur("B", "strength")
    assert cur("I", "strength") <= cur("B", "strength")
    assert R["J"]["attributes"]["strength"]["status"] == "provisional"
    assert R["K"]["attributes"]["strength"]["status"] == "verified"
    assert R["L"]["attributes"]["strength"]["status"] == "provisional"
    for key in R:
        for attribute in ATTRIBUTES:
            assert R[key]["attributes"][attribute]["status"] != "verified" or key == "K"
