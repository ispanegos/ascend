"""Test-specific feature extraction (spec §15 pipeline step 3).

Each extractor turns one piece of raw evidence into named features plus
quality flags. Extractors never invent a missing value: if the raw data
needed for a feature is absent, the feature is absent and the subdomain
it feeds stays unobserved (unknown, not zero).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from statistics import mean

from ..config import EngineConfig
from ..evidence.parsing import Attempt, Evidence


@dataclass
class TestFeatures:
    evidence_id: str
    test_key: str
    features: dict[str, float | str] = field(default_factory=dict)
    pain: bool = False
    censored: bool = False
    category_estimate: bool = False
    notes: list[str] = field(default_factory=list)
    # Other evidence a derived feature relied on (e.g. E01 resting HR).
    depends_on: list[str] = field(default_factory=list)


def _best(values: list[float | None], lower_is_better: bool = False) -> float | None:
    present = [v for v in values if v is not None]
    if not present:
        return None
    return min(present) if lower_is_better else max(present)


def _names_pain(evidence: Evidence) -> bool:
    return (
        evidence.pain_reported
        or evidence.data_str("stop_reason") == "pain"
        or any(a.limiting_factor == "pain" for a in evidence.attempts)
    )


# ---------------------------------------------------------------------------
# Movement
# ---------------------------------------------------------------------------


def m01(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    params = cfg.features["M01"]
    points: list[float] = []
    for attempt in ev.attempts:
        depth = params["depth_points"].get(attempt.data_str("depth") or "")
        heels = params["heels_points"].get(attempt.data_str("heels") or "")
        control = params["control_points"].get(attempt.data_str("control") or "")
        if depth is None or heels is None or control is None:
            out.notes.append(f"attempt {attempt.attempt_number} incomplete; not scored")
            continue
        points.append(float(depth + heels + control))
    if points:
        out.features["squat_points_best"] = max(points)
        out.features["squat_points_mean"] = mean(points)
        out.features["attempts_scored"] = float(len(points))


def m02(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    sides = {a.side: a.measure_cm for a in ev.attempts if a.measure_cm is not None}
    left, right = sides.get("left"), sides.get("right")
    if left is None or right is None:
        out.notes.append("both sides are needed")
        return
    out.features["ankle_left_cm"] = left
    out.features["ankle_right_cm"] = right
    out.features["ankle_mean_cm"] = (left + right) / 2
    out.features["ankle_asymmetry_cm"] = abs(left - right)
    larger = max(left, right)
    out.features["ankle_asymmetry_pct"] = 0.0 if larger == 0 else abs(left - right) / larger * 100


def m03(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    category_reach = cfg.features["M03"]["category_reach_cm"]
    reach: dict[str, float] = {}
    for attempt in ev.attempts:
        if attempt.measure_cm is not None:
            # Stored as gap (positive) / overlap (negative); reach is the opposite.
            reach[attempt.side] = -attempt.measure_cm
        else:
            category = attempt.data_str("reach")
            if category in category_reach:
                reach[attempt.side] = float(category_reach[category])
                out.category_estimate = True
    if "left" not in reach or "right" not in reach:
        out.notes.append("both sides are needed")
        return
    out.features["shoulder_reach_left_cm"] = reach["left"]
    out.features["shoulder_reach_right_cm"] = reach["right"]
    out.features["shoulder_reach_mean_cm"] = (reach["left"] + reach["right"]) / 2
    out.features["shoulder_asymmetry_cm"] = abs(reach["left"] - reach["right"])


def m04(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    cap = float(cfg.features["M04"]["cap_s"])
    best = {
        side: _best([a.duration_s for a in ev.attempts if a.side == side])
        for side in ("left", "right")
    }
    if best["left"] is None or best["right"] is None:
        out.notes.append("both legs are needed")
        return
    out.features["balance_best_left_s"] = best["left"]
    out.features["balance_best_right_s"] = best["right"]
    out.features["balance_best_mean_s"] = (best["left"] + best["right"]) / 2
    out.features["balance_asymmetry_s"] = abs(best["left"] - best["right"])
    if best["left"] >= cap and best["right"] >= cap:
        out.censored = True
        out.notes.append("both legs reached the test cap")


def m05(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    value = _best([a.measure_cm for a in ev.attempts])
    if value is not None:
        out.features["sit_reach_cm"] = value


def m06(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    quality = next((a.data_str("quality") for a in ev.attempts if a.data_str("quality")), None)
    if quality:
        out.features["dead_bug_quality"] = quality
    reps = _best([a.reps for a in ev.attempts])
    if reps is not None:
        out.features["dead_bug_reps"] = reps


def m07(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    times = [a.duration_s for a in ev.attempts if a.duration_s is not None]
    if times:
        out.features["agility_best_time_s"] = min(times)
        out.features["agility_mean_time_s"] = mean(times)
    scored = [a for a in ev.attempts if a.data_num("errors") is not None and a.data_str("balance_loss")]
    if scored:
        errors = mean(a.data_num("errors") or 0.0 for a in scored)
        loss_rate = sum(1 for a in scored if a.data_str("balance_loss") == "yes") / len(scored)
        weight = float(cfg.features["M07"]["balance_loss_weight"])
        out.features["agility_mean_errors"] = errors
        out.features["agility_balance_loss_rate"] = loss_rate
        out.features["agility_error_index"] = errors + weight * loss_rate


# ---------------------------------------------------------------------------
# Frame
# ---------------------------------------------------------------------------


def _ten_rep_equivalent(attempt: Attempt, load: float | None, cfg: EngineConfig) -> float | None:
    params = cfg.features["strength_sets"]
    if load is None or attempt.reps is None:
        return None
    target = float(params["target_reps"])
    factor = params["technique_factor"].get(attempt.technique or "clean")
    if factor is None:
        return None
    return load * min(attempt.reps, target) / target * float(factor)


def _mark_censoring(ev: Evidence, best: Attempt | None, cfg: EngineConfig, out: TestFeatures) -> None:
    max_rpe = float(cfg.features["strength_sets"]["censored_max_rpe"])
    if ev.data_str("stop_reason") == "nothing" and best is not None and best.rpe is not None and best.rpe <= max_rpe:
        out.censored = True
        out.notes.append("heaviest available load was not challenging: result is a lower bound")


def f01(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    reps = _best([a.reps for a in ev.attempts])
    if reps is None:
        return
    out.features["push_reps"] = reps
    if ev.variant == "incline":
        height = ev.data_num("incline_height_cm")
        if height is None:
            out.notes.append("incline push-ups without a hand height cannot be compared")
            return
        factor = cfg.incline_factor(height)
        out.features["incline_height_cm"] = height
        out.features["incline_factor"] = factor
        out.features["push_equivalent_reps"] = reps * factor
    elif ev.variant == "standard":
        out.features["push_equivalent_reps"] = reps
    else:
        out.notes.append("unknown push-up variant")


def _loaded_sets(ev: Evidence, cfg: EngineConfig, out: TestFeatures, feature: str) -> None:
    scored = [(a, _ten_rep_equivalent(a, a.load_kg, cfg)) for a in ev.attempts]
    scored = [(a, v) for a, v in scored if v is not None]
    if not scored:
        return
    best_attempt, best_value = max(scored, key=lambda item: item[1])
    out.features[feature] = best_value
    out.features["best_set_load_kg"] = best_attempt.load_kg or 0.0
    out.features["best_set_reps"] = best_attempt.reps or 0.0
    out.features["sets_recorded"] = float(len(ev.attempts))
    _mark_censoring(ev, best_attempt, cfg, out)


def f02(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    _loaded_sets(ev, cfg, out, "goblet_ten_rep_kg")


def f03(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    _loaded_sets(ev, cfg, out, "hinge_ten_rep_kg")


def f04(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    if ev.variant == "pull_up":
        reps = _best([a.reps for a in ev.attempts])
        if reps is not None:
            out.features["pull_up_reps"] = reps
        return
    if ev.variant != "bent_over_row":
        out.notes.append("unknown pull variant")
        return
    unilateral = ev.data_str("setup") == "unilateral"
    per_side: dict[str, list[tuple[Attempt, float]]] = {}
    for attempt in ev.attempts:
        if attempt.load_kg is None:
            continue
        # Per-arm load: one-arm rows hold one implement; two-arm rows split the total.
        per_arm_load = attempt.load_kg if unilateral else attempt.load_kg / 2
        value = _ten_rep_equivalent(attempt, per_arm_load, cfg)
        if value is not None:
            per_side.setdefault(attempt.side if unilateral else "both", []).append((attempt, value))
    if not per_side:
        return
    bests = {side: max(values, key=lambda item: item[1]) for side, values in per_side.items()}
    if unilateral and set(bests) != {"left", "right"}:
        out.notes.append("one-arm rows need both arms")
        return
    out.features["row_ten_rep_kg_per_arm"] = mean(v for _, v in bests.values())
    if unilateral:
        out.features["row_asymmetry_kg"] = abs(bests["left"][1] - bests["right"][1])
    best_attempt = max(bests.values(), key=lambda item: item[1])[0]
    _mark_censoring(ev, best_attempt, cfg, out)


def f05(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    cap = float(cfg.features["F05"]["cap_s"])
    attempt = ev.attempts[0] if ev.attempts else None
    if attempt is None or attempt.load_kg is None or attempt.duration_s is None:
        return
    out.features["carry_load_kg"] = attempt.load_kg
    out.features["carry_duration_s"] = attempt.duration_s
    out.features["carry_load_minutes_kg"] = attempt.load_kg * attempt.duration_s / 60
    if attempt.distance_m is not None:
        out.features["carry_distance_m"] = attempt.distance_m
    if attempt.limiting_factor:
        out.features["limiting_factor"] = attempt.limiting_factor
    if attempt.duration_s >= cap:
        out.censored = True
        out.notes.append("reached the 60 s cap: result is a lower bound")


def f06(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    cap = float(cfg.features["F06"]["cap_s"])
    duration = _best([a.duration_s for a in ev.attempts])
    if duration is None:
        return
    out.features["plank_s"] = duration
    if duration >= cap:
        out.censored = True
        out.notes.append("reached the 120 s cap: result is a lower bound")


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------


def e01(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    hr = _best([a.avg_hr_bpm for a in ev.attempts])
    if hr is not None:
        out.features["resting_hr_bpm"] = hr


def _speed(attempt: Attempt) -> float | None:
    if attempt.distance_m is None or not attempt.duration_s:
        return None
    return attempt.distance_m / attempt.duration_s * 60


def e02(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    attempt = ev.attempts[0] if ev.attempts else None
    if attempt is None:
        return
    speed = _speed(attempt)
    if speed is not None:
        out.features["walk_distance_m"] = attempt.distance_m or 0.0
        out.features["walk_duration_s"] = attempt.duration_s or 0.0
        out.features["walk_speed_m_per_min"] = speed
    if attempt.avg_hr_bpm is not None:
        out.features["walk_avg_hr_bpm"] = attempt.avg_hr_bpm
    if attempt.max_hr_bpm is not None:
        out.features["walk_max_hr_bpm"] = attempt.max_hr_bpm


def e03(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    attempt = ev.attempts[0] if ev.attempts else None
    if attempt is None:
        return
    stop, one, two = attempt.data_num("hr_stop_bpm"), attempt.data_num("hr_1min_bpm"), attempt.data_num("hr_2min_bpm")
    # Drops are recomputed from the raw readings, not trusted from storage.
    if stop is not None and one is not None:
        out.features["hr_stop_bpm"] = stop
        out.features["hr_drop_1min_bpm"] = stop - one
    if stop is not None and two is not None:
        out.features["hr_drop_2min_bpm"] = stop - two


def e04(ev: Evidence, cfg: EngineConfig, out: TestFeatures) -> None:
    attempt = ev.attempts[0] if ev.attempts else None
    if attempt is None:
        return
    speed = _speed(attempt)
    if speed is not None:
        out.features["run_walk_distance_m"] = attempt.distance_m or 0.0
        out.features["run_walk_duration_s"] = attempt.duration_s or 0.0
        out.features["run_walk_speed_m_per_min"] = speed
    run, walk = attempt.data_num("run_time_s"), attempt.data_num("walk_time_s")
    if run is not None and walk is not None and run + walk > 0:
        out.features["run_fraction"] = run / (run + walk)
    if attempt.avg_hr_bpm is not None:
        out.features["run_walk_avg_hr_bpm"] = attempt.avg_hr_bpm
    if attempt.rpe is not None:
        out.features["rpe"] = attempt.rpe
    if attempt.limiting_factor:
        out.features["limiting_factor"] = attempt.limiting_factor


EXTRACTORS: dict[str, Callable[[Evidence, EngineConfig, TestFeatures], None]] = {
    "M01": m01, "M02": m02, "M03": m03, "M04": m04, "M05": m05, "M06": m06, "M07": m07,
    "F01": f01, "F02": f02, "F03": f03, "F04": f04, "F05": f05, "F06": f06,
    "E01": e01, "E02": e02, "E03": e03, "E04": e04,
}


def extract(ev: Evidence, cfg: EngineConfig) -> TestFeatures:
    out = TestFeatures(evidence_id=ev.id, test_key=ev.test_key)
    extractor = EXTRACTORS.get(ev.test_key)
    if extractor is None:
        out.notes.append("no extractor for this test")
        return out
    extractor(ev, cfg, out)
    out.pain = _names_pain(ev)
    return out


def derive_cross_test(by_test: dict[str, TestFeatures]) -> None:
    """Features that combine tests: heart-rate efficiency needs the resting baseline.

    Speed per bpm above resting heart rate. Only computed when every raw
    reading exists and the heart rate is above rest; otherwise left out.
    """
    resting = by_test.get("E01")
    rest = resting.features.get("resting_hr_bpm") if resting else None
    if not isinstance(rest, float):
        return
    for key, speed_name, hr_name, feature in (
        ("E02", "walk_speed_m_per_min", "walk_avg_hr_bpm", "walk_hr_efficiency"),
        ("E04", "run_walk_speed_m_per_min", "run_walk_avg_hr_bpm", "run_walk_hr_efficiency"),
    ):
        test = by_test.get(key)
        if not test:
            continue
        speed, hr = test.features.get(speed_name), test.features.get(hr_name)
        if isinstance(speed, float) and isinstance(hr, float) and hr > rest:
            test.features[feature] = speed / (hr - rest)
            test.features["resting_hr_bpm_used"] = rest
            if resting is not None:
                test.depends_on.append(resting.evidence_id)
