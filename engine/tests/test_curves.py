import pytest

from ascend_engine.scoring.curves import CurveError, build_curve, interpolate

SCALE = (0.0, 100.0)


def numeric(points, direction="increasing", mode="none"):
    return build_curve("c", {"test": "X01", "feature": "f", "direction": direction, "body_mass_mode": mode, "points": points}, SCALE)


class TestInterpolation:
    def test_exact_points(self):
        curve = numeric([[0, 10], [10, 50], [20, 60]])
        assert curve.score(0) == 10
        assert curve.score(10) == 50
        assert curve.score(20) == 60

    def test_linear_between_points(self):
        curve = numeric([[0, 10], [10, 50]])
        assert curve.score(2.5) == pytest.approx(20.0)

    def test_holds_end_values_instead_of_extrapolating(self):
        curve = numeric([[0, 10], [10, 50]])
        assert curve.score(-100) == 10
        assert curve.score(1000) == 50

    def test_decreasing_curve(self):
        curve = numeric([[6, 80], [20, 10]], direction="decreasing")
        assert curve.score(6) == 80
        assert curve.score(13) == pytest.approx(45.0)
        assert curve.score(30) == 10

    def test_monotonic_everywhere(self):
        curve = numeric([[0, 5], [3, 5], [6, 40], [9, 90]])
        previous = -1.0
        for i in range(-20, 120):
            value = curve.score(i / 10)
            assert value >= previous
            previous = value

    def test_interpolate_rejects_empty(self):
        with pytest.raises(CurveError):
            interpolate((), 1.0)


class TestMalformedCurves:
    @pytest.mark.parametrize(
        "points",
        [
            [[0, 10]],  # single point
            [[0, 10], [0, 20]],  # duplicate raw
            [[10, 10], [5, 20]],  # raw decreasing
            [[0, 50], [10, 40]],  # score decreases on an increasing curve
            [[0, 10], [10, 120]],  # outside the scale
            [[0, -1], [10, 20]],  # outside the scale
            [[0, 10], [10]],  # malformed point
            [[0, "a"], [10, 20]],  # non-numeric
            [[0, True], [10, 20]],  # boolean is not a number
        ],
    )
    def test_rejected(self, points):
        with pytest.raises(CurveError):
            numeric(points)

    def test_decreasing_curve_must_not_rise(self):
        with pytest.raises(CurveError):
            numeric([[0, 50], [10, 60]], direction="decreasing")

    def test_unknown_direction_and_mode(self):
        with pytest.raises(CurveError):
            numeric([[0, 1], [1, 2]], direction="sideways")
        with pytest.raises(CurveError):
            numeric([[0, 1], [1, 2]], mode="height")

    def test_missing_test_or_feature(self):
        with pytest.raises(CurveError):
            build_curve("c", {"feature": "f", "direction": "increasing", "body_mass_mode": "none", "points": [[0, 1], [1, 2]]}, SCALE)

    def test_categorical(self):
        curve = build_curve("c", {"test": "M06", "feature": "q", "kind": "categorical", "map": {"clean": 55, "unable": 15}}, SCALE)
        assert curve.score("clean") == 55
        with pytest.raises(CurveError):
            curve.score("unknown")
        with pytest.raises(CurveError):
            curve.score(3.0)

    @pytest.mark.parametrize("mapping", [{}, {"a": 101}, {"a": "x"}])
    def test_malformed_categorical(self, mapping):
        with pytest.raises(CurveError):
            build_curve("c", {"test": "M06", "feature": "q", "kind": "categorical", "map": mapping}, SCALE)
