"""Synthetic athletes for sanity checks (Milestone 3 brief §19).

These are invented profiles, not calibration targets. They exist to catch
broken relationships (e.g. a stronger result lowering Strength), not to make
numbers look nice.
"""

from __future__ import annotations

from collections.abc import Callable

from .builder import Spawn, attempt as a


def squat(depth: str, heels: str, control: str, n: int) -> dict:
    return a(n, data={"depth": depth, "heels": heels, "control": control})


def movement(
    s: Spawn,
    *,
    squats: list[tuple[str, str, str]],
    ankle: tuple[float, float],
    shoulder: tuple[dict, dict],
    balance: tuple[float, float, float, float],
    sit_reach: float,
    dead_bug: str,
    agility: list[tuple[float, int, str]],
) -> Spawn:
    s.test("M01", [squat(*sq, n=i + 1) for i, sq in enumerate(squats)])
    s.test("M02", [a(1, "left", measure_cm=ankle[0]), a(1, "right", measure_cm=ankle[1])])
    s.test("M03", [a(1, "left", **shoulder[0]), a(1, "right", **shoulder[1])])
    l1, r1, l2, r2 = balance
    s.test("M04", [a(1, "left", duration_s=l1), a(1, "right", duration_s=r1), a(2, "left", duration_s=l2), a(2, "right", duration_s=r2)])
    s.test("M05", [a(1, measure_cm=sit_reach)])
    s.test("M06", [a(1, data={"quality": dead_bug})])
    s.test("M07", [a(i + 1, duration_s=t, data={"errors": e, "balance_loss": b}) for i, (t, e, b) in enumerate(agility)])
    return s


def gap_cm(cm: float, category: str) -> dict:
    return {"measure_cm": cm, "data": {"reach": category}}


def category_only(category: str) -> dict:
    return {"data": {"reach": category}}


def sets(rows: list[tuple[float, int, float, str]], implements: int = 1) -> list[dict]:
    return [
        a(i + 1, load_kg=load, reps=reps, rpe=rpe, technique=tech, data={"implement_count": implements, "implement_kg": load / implements})
        for i, (load, reps, rpe, tech) in enumerate(rows)
    ]


# ---------------------------------------------------------------------------


def athlete_a() -> Spawn:
    """A — detrained, heavier beginner (118 kg)."""
    s = Spawn("A-detrained-heavier", 118.0)
    movement(
        s,
        squats=[("above_parallel", "lift", "compensation")] * 2 + [("parallel", "lift", "compensation")],
        ankle=(4.0, 5.0),
        shoulder=(category_only("beyond_hand"), category_only("beyond_hand")),
        balance=(8.0, 10.0, 12.0, 9.0),
        sit_reach=-18.0,
        dead_bug="completed_with_compensation",
        agility=[(14.5, 2, "yes"), (13.8, 1, "no"), (13.2, 1, "no")],
    )
    s.test("F01", [a(1, reps=12, rpe=7, technique="clean", limiting_factor="muscular_fatigue")], variant="incline", data={"incline_height_cm": 60})
    s.test("F02", sets([(8, 10, 6, "clean"), (12, 10, 8, "minor_compensation")]), data={"stop_reason": "muscular_fatigue"})
    s.test("F03", sets([(16, 10, 6, "clean"), (24, 10, 8, "clean")], implements=2), data={"stop_reason": "muscular_fatigue"})
    s.test("F04", sets([(24, 10, 7, "clean")], implements=2), variant="bent_over_row", data={"setup": "bilateral", "stop_reason": "muscular_fatigue"})
    s.test("F05", [a(1, load_kg=24, duration_s=40, rpe=8, limiting_factor="grip")])
    s.test("F06", [a(1, duration_s=35, rpe=8, limiting_factor="technique")])
    s.test("E01", [a(1, avg_hr_bpm=78)])
    s.test("E02", [a(1, distance_m=520, duration_s=360, avg_hr_bpm=118, max_hr_bpm=128)])
    s.test("E03", [a(1, data={"hr_stop_bpm": 140, "hr_1min_bpm": 124, "hr_2min_bpm": 112})])
    s.test("E04", [a(1, distance_m=2100, duration_s=1200, avg_hr_bpm=150, max_hr_bpm=168, rpe=8, limiting_factor="breath", data={"run_time_s": 300, "walk_time_s": 900})])
    return s


def athlete_b(athlete_id: str = "B-recreational", body_mass: float = 78.0) -> Spawn:
    """B — recreational, balanced (78 kg)."""
    s = Spawn(athlete_id, body_mass)
    movement(
        s,
        squats=[("parallel", "grounded", "stable")] * 3,
        ankle=(10.0, 9.5),
        shoulder=(gap_cm(0.0, "touch"), gap_cm(3.0, "within_hand")),
        balance=(35.0, 40.0, 42.0, 38.0),
        sit_reach=2.0,
        dead_bug="clean",
        agility=[(9.1, 0, "no"), (8.8, 1, "no"), (8.7, 0, "no")],
    )
    s.test("F01", [a(1, reps=28, rpe=8, technique="clean", limiting_factor="muscular_fatigue")], variant="standard")
    s.test("F02", sets([(16, 10, 6, "clean"), (20, 10, 7, "clean"), (24, 10, 8, "clean")]), data={"stop_reason": "muscular_fatigue"})
    s.test("F03", sets([(32, 10, 6, "clean"), (40, 10, 8, "clean")], implements=2), data={"stop_reason": "muscular_fatigue"})
    s.test(
        "F04",
        [a(1, "left", load_kg=20, reps=10, rpe=7, technique="clean"), a(2, "right", load_kg=20, reps=10, rpe=7, technique="clean")],
        variant="bent_over_row",
        data={"setup": "unilateral", "stop_reason": "muscular_fatigue"},
    )
    s.test("F05", [a(1, load_kg=40, duration_s=60, rpe=7, limiting_factor="nothing")])
    s.test("F06", [a(1, duration_s=95, rpe=8, limiting_factor="technique")])
    s.test("E01", [a(1, avg_hr_bpm=60)])
    s.test("E02", [a(1, distance_m=680, duration_s=360, avg_hr_bpm=105, max_hr_bpm=115)])
    s.test("E03", [a(1, data={"hr_stop_bpm": 150, "hr_1min_bpm": 122, "hr_2min_bpm": 104})])
    s.test("E04", [a(1, distance_m=3900, duration_s=1200, avg_hr_bpm=158, max_hr_bpm=171, rpe=7, limiting_factor="breath", data={"run_time_s": 1200, "walk_time_s": 0})])
    return s


def athlete_c() -> Spawn:
    """C — strong, low endurance (95 kg)."""
    s = Spawn("C-strong-low-endurance", 95.0)
    movement(
        s,
        squats=[("parallel", "grounded", "stable")] * 3,
        ankle=(8.0, 8.5),
        shoulder=(gap_cm(6.0, "within_hand"), gap_cm(8.0, "within_hand")),
        balance=(30.0, 28.0, 33.0, 31.0),
        sit_reach=-6.0,
        dead_bug="clean",
        agility=[(9.8, 1, "no"), (9.5, 0, "no"), (9.6, 1, "no")],
    )
    s.test("F01", [a(1, reps=45, rpe=8, technique="clean", limiting_factor="muscular_fatigue")], variant="standard")
    s.test("F02", sets([(24, 10, 5, "clean"), (32, 10, 7, "clean")]), data={"stop_reason": "nothing"})
    s.test("F03", sets([(48, 10, 5, "clean"), (64, 10, 7, "clean")], implements=2), data={"stop_reason": "nothing"})
    s.test(
        "F04",
        [a(1, "left", load_kg=32, reps=10, rpe=7, technique="clean"), a(2, "right", load_kg=32, reps=10, rpe=7, technique="clean")],
        variant="bent_over_row",
        data={"setup": "unilateral", "stop_reason": "nothing"},
    )
    s.test("F05", [a(1, load_kg=64, duration_s=60, rpe=7, limiting_factor="nothing")])
    s.test("F06", [a(1, duration_s=110, rpe=8, limiting_factor="technique")])
    s.test("E01", [a(1, avg_hr_bpm=72)])
    s.test("E02", [a(1, distance_m=560, duration_s=360, avg_hr_bpm=125, max_hr_bpm=134)])
    s.test("E03", [a(1, data={"hr_stop_bpm": 155, "hr_1min_bpm": 140, "hr_2min_bpm": 128})])
    s.test("E04", [a(1, distance_m=2400, duration_s=1200, avg_hr_bpm=165, max_hr_bpm=178, rpe=9, limiting_factor="breath", data={"run_time_s": 360, "walk_time_s": 840})])
    return s


def athlete_d() -> Spawn:
    """D — endurance-trained, low strength (64 kg)."""
    s = Spawn("D-endurance-low-strength", 64.0)
    movement(
        s,
        squats=[("parallel", "grounded", "stable")] * 3,
        ankle=(11.0, 11.5),
        shoulder=(gap_cm(4.0, "within_hand"), gap_cm(5.0, "within_hand")),
        balance=(45.0, 50.0, 48.0, 52.0),
        sit_reach=4.0,
        dead_bug="completed_with_compensation",
        agility=[(8.9, 0, "no"), (8.6, 0, "no"), (8.5, 1, "no")],
    )
    s.test("F01", [a(1, reps=10, rpe=8, technique="clean", limiting_factor="muscular_fatigue")], variant="incline", data={"incline_height_cm": 45})
    s.test("F02", sets([(8, 10, 7, "clean"), (12, 8, 9, "minor_compensation")]), data={"stop_reason": "muscular_fatigue"})
    s.test("F03", sets([(16, 10, 7, "clean")]), data={"stop_reason": "technique"})
    s.test("F04", sets([(16, 10, 7, "clean")], implements=2), variant="bent_over_row", data={"setup": "bilateral", "stop_reason": "muscular_fatigue"})
    s.test("F05", [a(1, load_kg=24, duration_s=45, rpe=8, limiting_factor="grip")])
    s.test("F06", [a(1, duration_s=60, rpe=8, limiting_factor="technique")])
    s.test("E01", [a(1, avg_hr_bpm=48)])
    s.test("E02", [a(1, distance_m=760, duration_s=360, avg_hr_bpm=98, max_hr_bpm=106)])
    s.test("E03", [a(1, data={"hr_stop_bpm": 165, "hr_1min_bpm": 130, "hr_2min_bpm": 108})])
    s.test("E04", [a(1, distance_m=5200, duration_s=1200, avg_hr_bpm=160, max_hr_bpm=172, rpe=7, limiting_factor="nothing", data={"run_time_s": 1200, "walk_time_s": 0})])
    return s


def athlete_e() -> Spawn:
    """E — B's body, but with tests missing, skipped or stopped."""
    full = athlete_b("E-missing-tests")
    s = Spawn("E-missing-tests", 78.0)
    keep = {"M01", "M02", "M04", "M05", "M06", "M07", "F01", "F02", "F03", "F05", "E02", "E04"}
    s.evidence = [e for e in full.evidence if e["test_key"] in keep]
    # E02/E04 without heart rate: no watch.
    for e in s.evidence:
        if e["test_key"] in ("E02", "E04"):
            for att in e["raw_payload"]["attempts"]:
                att.pop("avg_hr_bpm", None)
                att.pop("max_hr_bpm", None)
    s.gap("M03", "skipped", "missing_equipment")
    s.gap("F04", "cannot_perform", "does_not_know_technique")
    s.gap("F06", "aborted", "pain")
    s.gap("E01", "skipped", "other")
    s.gap("E03", "cannot_perform", "missing_equipment")
    return s


def athlete_f() -> Spawn:
    """F — B, but with clearly asymmetric mobility and balance."""
    s = athlete_b("F-asymmetric", 78.0)
    s.evidence = [e for e in s.evidence if e["test_key"] not in ("M02", "M03", "M04")]
    s.test("M02", [a(1, "left", measure_cm=12.0), a(1, "right", measure_cm=3.0)])
    s.test("M03", [a(1, "left", measure_cm=-4.0, data={"reach": "overlap"}), a(1, "right", measure_cm=18.0, data={"reach": "beyond_hand"})])
    s.test("M04", [a(1, "left", duration_s=45.0), a(1, "right", duration_s=8.0), a(2, "left", duration_s=50.0), a(2, "right", duration_s=11.0)])
    return s


FIXTURES: dict[str, Callable[[], Spawn]] = {
    "A": athlete_a,
    "B": athlete_b,
    "C": athlete_c,
    "D": athlete_d,
    "E": athlete_e,
    "F": athlete_f,
}
