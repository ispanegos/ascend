import pytest

from ascend_engine.assessment.features import derive_cross_test, extract
from ascend_engine.evidence.parsing import parse_evidence
from fixtures.builder import Spawn, attempt as a


def ev(test_key, attempts, **kwargs):
    s = Spawn("t", 80.0).test(test_key, attempts, **kwargs)
    return parse_evidence(s.evidence[0])


def test_m01_best_attempt_and_mean(cfg):
    out = extract(ev("M01", [
        a(1, data={"depth": "above_parallel", "heels": "lift", "control": "compensation"}),
        a(2, data={"depth": "below_parallel", "heels": "grounded", "control": "stable"}),
    ]), cfg)
    assert out.features["squat_points_best"] == 4.0
    assert out.features["squat_points_mean"] == pytest.approx(2.25)


def test_m01_incomplete_attempt_is_not_invented(cfg):
    out = extract(ev("M01", [a(1, data={"depth": "parallel"})]), cfg)
    assert "squat_points_best" not in out.features
    assert out.notes


def test_m02_mean_and_asymmetry(cfg):
    out = extract(ev("M02", [a(1, "left", measure_cm=12.0), a(1, "right", measure_cm=3.0)]), cfg)
    assert out.features["ankle_mean_cm"] == 7.5
    assert out.features["ankle_asymmetry_cm"] == 9.0
    assert out.features["ankle_asymmetry_pct"] == pytest.approx(75.0)


def test_m02_needs_both_sides(cfg):
    out = extract(ev("M02", [a(1, "left", measure_cm=12.0)]), cfg)
    assert "ankle_mean_cm" not in out.features


def test_m03_measured_distance_preferred_over_category(cfg):
    out = extract(ev("M03", [
        a(1, "left", measure_cm=5.0, data={"reach": "within_hand"}),
        a(1, "right", data={"reach": "overlap"}),
    ]), cfg)
    assert out.features["shoulder_reach_left_cm"] == -5.0
    assert out.features["shoulder_reach_right_cm"] == 3.0
    assert out.category_estimate is True


def test_m04_best_per_side_and_cap_censoring(cfg):
    out = extract(ev("M04", [
        a(1, "left", duration_s=20.0), a(1, "right", duration_s=60.0),
        a(2, "left", duration_s=30.0), a(2, "right", duration_s=40.0),
    ]), cfg)
    assert out.features["balance_best_mean_s"] == 45.0
    assert out.censored is False
    capped = extract(ev("M04", [a(1, "left", duration_s=60.0), a(1, "right", duration_s=60.0)]), cfg)
    assert capped.censored is True


def test_m07_time_and_error_index(cfg):
    out = extract(ev("M07", [
        a(1, duration_s=10.0, data={"errors": 2, "balance_loss": "yes"}),
        a(2, duration_s=9.0, data={"errors": 0, "balance_loss": "no"}),
    ]), cfg)
    assert out.features["agility_best_time_s"] == 9.0
    assert out.features["agility_error_index"] == pytest.approx(1.0 + 2.0 * 0.5)


def test_f01_incline_is_not_equivalent_to_standard(cfg):
    incline = extract(ev("F01", [a(1, reps=20)], variant="incline", data={"incline_height_cm": 45}), cfg)
    standard = extract(ev("F01", [a(1, reps=20)], variant="standard"), cfg)
    assert incline.features["push_equivalent_reps"] < standard.features["push_equivalent_reps"] == 20
    no_height = extract(ev("F01", [a(1, reps=20)], variant="incline"), cfg)
    assert "push_equivalent_reps" not in no_height.features


def test_f02_ten_rep_equivalent_uses_best_set_and_technique(cfg):
    out = extract(ev("F02", [
        a(1, load_kg=16, reps=10, rpe=6, technique="clean"),
        a(2, load_kg=24, reps=10, rpe=8, technique="major_compensation"),
    ], data={"stop_reason": "muscular_fatigue"}), cfg)
    # 24 × 0.75 = 18 beats 16 × 1.0.
    assert out.features["goblet_ten_rep_kg"] == pytest.approx(18.0)
    assert out.censored is False


def test_f02_no_heavier_load_is_censored_only_when_easy(cfg):
    easy = extract(ev("F02", [a(1, load_kg=32, reps=10, rpe=6, technique="clean")], data={"stop_reason": "nothing"}), cfg)
    hard = extract(ev("F02", [a(1, load_kg=32, reps=10, rpe=9, technique="clean")], data={"stop_reason": "nothing"}), cfg)
    assert easy.censored is True
    assert hard.censored is False


def test_f04_unilateral_needs_both_arms_and_bilateral_splits_load(cfg):
    one_arm = extract(ev("F04", [a(1, "left", load_kg=20, reps=10, technique="clean")], variant="bent_over_row", data={"setup": "unilateral"}), cfg)
    assert "row_ten_rep_kg_per_arm" not in one_arm.features
    both = extract(ev("F04", [a(1, load_kg=40, reps=10, technique="clean")], variant="bent_over_row", data={"setup": "bilateral"}), cfg)
    assert both.features["row_ten_rep_kg_per_arm"] == pytest.approx(20.0)
    pull_up = extract(ev("F04", [a(1, reps=5)], variant="pull_up"), cfg)
    assert pull_up.features == {"pull_up_reps": 5.0}


def test_f05_carry_index_and_cap(cfg):
    out = extract(ev("F05", [a(1, load_kg=40, duration_s=60, limiting_factor="nothing")]), cfg)
    assert out.features["carry_load_minutes_kg"] == 40.0
    assert out.censored is True


def test_pain_is_detected_from_any_source(cfg):
    assert extract(ev("F06", [a(1, duration_s=40)], pain=True), cfg).pain
    assert extract(ev("F06", [a(1, duration_s=40, limiting_factor="pain")]), cfg).pain
    assert extract(ev("F02", [a(1, load_kg=8, reps=10, technique="clean")], data={"stop_reason": "pain"}), cfg).pain
    assert not extract(ev("F06", [a(1, duration_s=40, limiting_factor="technique")]), cfg).pain


def test_pain_keeps_the_measured_value(cfg):
    out = extract(ev("F06", [a(1, duration_s=40, limiting_factor="pain")]), cfg)
    assert out.features["plank_s"] == 40.0


def test_e03_drops_recomputed_from_raw(cfg):
    out = extract(ev("E03", [a(1, data={"hr_stop_bpm": 150, "hr_1min_bpm": 122, "hr_2min_bpm": 104, "drop_1min_bpm": 999})]), cfg)
    assert out.features["hr_drop_1min_bpm"] == 28.0
    assert out.features["hr_drop_2min_bpm"] == 46.0


def test_e04_speed_and_run_fraction(cfg):
    out = extract(ev("E04", [a(1, distance_m=3000, duration_s=1200, data={"run_time_s": 900, "walk_time_s": 300})]), cfg)
    assert out.features["run_walk_speed_m_per_min"] == 150.0
    assert out.features["run_fraction"] == 0.75


def test_e04_run_fraction_absent_without_both_times(cfg):
    out = extract(ev("E04", [a(1, distance_m=3000, duration_s=1200, data={"run_time_s": 900})]), cfg)
    assert "run_fraction" not in out.features


def test_hr_efficiency_needs_resting_baseline(cfg):
    e04 = extract(ev("E04", [a(1, distance_m=3000, duration_s=1200, avg_hr_bpm=150)]), cfg)
    derive_cross_test({"E04": e04})
    assert "run_walk_hr_efficiency" not in e04.features
    e01 = extract(ev("E01", [a(1, avg_hr_bpm=60)]), cfg)
    derive_cross_test({"E01": e01, "E04": e04})
    assert e04.features["run_walk_hr_efficiency"] == pytest.approx(150 / 90)
    assert e01.evidence_id in e04.depends_on
