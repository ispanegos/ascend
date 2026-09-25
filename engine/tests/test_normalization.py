import pytest

from ascend_engine.scoring.normalization import NormalizationError, normalize


def test_none_and_absolute_ignore_body_mass():
    assert normalize(32.0, "none", None, 0.67).value == 32.0
    assert normalize(32.0, "absolute", 90.0, 0.67).value == 32.0


def test_relative():
    result = normalize(40.0, "relative", 80.0, 0.67)
    assert result.value == pytest.approx(0.5)
    assert result.raw == 40.0 and result.body_mass_kg == 80.0


def test_mixed_is_allometric_not_plain_division():
    mixed = normalize(24.0, "mixed", 96.0, 0.67).value
    assert mixed == pytest.approx(24.0 / 96.0**0.67)
    assert mixed != pytest.approx(24.0 / 96.0)


def test_mixed_favours_the_heavier_athlete_less_than_absolute_and_more_than_relative():
    light, heavy = 60.0, 120.0
    load = 32.0
    ratio_mixed = normalize(load, "mixed", light, 0.67).value / normalize(load, "mixed", heavy, 0.67).value
    ratio_relative = normalize(load, "relative", light, 0.67).value / normalize(load, "relative", heavy, 0.67).value
    assert 1.0 < ratio_mixed < ratio_relative


@pytest.mark.parametrize("mass", [None, 0.0, -5.0])
def test_body_mass_required(mass):
    with pytest.raises(NormalizationError):
        normalize(10.0, "relative", mass, 0.67)


def test_unknown_mode():
    with pytest.raises(NormalizationError):
        normalize(10.0, "height", 80.0, 0.67)
