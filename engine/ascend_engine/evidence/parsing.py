"""Raw evidence parsing (spec §5, §47).

Turns the JSON payloads written by the Spawn database trigger into typed
records. Parsing never invents values: a missing field stays None.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


class EvidenceError(ValueError):
    """Input is structurally invalid (not merely incomplete)."""


def parse_time(value: object, where: str) -> datetime:
    if not isinstance(value, str):
        raise EvidenceError(f"{where}: timestamp required")
    text = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as error:
        raise EvidenceError(f"{where}: invalid timestamp {value!r}") from error
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _num(value: object) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _str(value: object) -> str | None:
    return value if isinstance(value, str) and value else None


@dataclass(frozen=True)
class Attempt:
    attempt_number: int
    side: str
    measure_cm: float | None = None
    duration_s: float | None = None
    distance_m: float | None = None
    load_kg: float | None = None
    reps: float | None = None
    rpe: float | None = None
    avg_hr_bpm: float | None = None
    max_hr_bpm: float | None = None
    avg_pace_s_per_km: float | None = None
    technique: str | None = None
    limiting_factor: str | None = None
    data: dict = field(default_factory=dict)

    def data_num(self, key: str) -> float | None:
        return _num(self.data.get(key))

    def data_str(self, key: str) -> str | None:
        return _str(self.data.get(key))


@dataclass(frozen=True)
class Evidence:
    id: str
    test_key: str
    source_type: str
    occurred_at: datetime
    source: str
    variant: str | None
    data: dict
    pain_reported: bool
    attempts: tuple[Attempt, ...]

    def data_num(self, key: str) -> float | None:
        return _num(self.data.get(key))

    def data_str(self, key: str) -> str | None:
        return _str(self.data.get(key))


@dataclass(frozen=True)
class Gap:
    """A test without evidence: skipped, cannot perform, stopped. Unknown, not zero."""

    test_key: str
    status: str
    reason_code: str | None


@dataclass(frozen=True)
class Athlete:
    id: str
    body_mass_kg: float | None
    height_cm: float | None
    age_years: float | None
    sex: str | None


def parse_attempt(raw: dict) -> Attempt:
    number = _num(raw.get("attempt_number"))
    if number is None:
        raise EvidenceError("attempt without attempt_number")
    data = raw.get("data") if isinstance(raw.get("data"), dict) else {}
    return Attempt(
        attempt_number=int(number),
        side=_str(raw.get("side")) or "none",
        measure_cm=_num(raw.get("measure_cm")),
        duration_s=_num(raw.get("duration_s")),
        distance_m=_num(raw.get("distance_m")),
        load_kg=_num(raw.get("load_kg")),
        reps=_num(raw.get("reps")),
        rpe=_num(raw.get("rpe")),
        avg_hr_bpm=_num(raw.get("avg_hr_bpm")),
        max_hr_bpm=_num(raw.get("max_hr_bpm")),
        avg_pace_s_per_km=_num(raw.get("avg_pace_s_per_km")),
        technique=_str(raw.get("technique")),
        limiting_factor=_str(raw.get("limiting_factor")),
        data=data,
    )


def parse_evidence(raw: dict) -> Evidence:
    evidence_id = _str(raw.get("id"))
    test_key = _str(raw.get("test_key"))
    if not evidence_id or not test_key:
        raise EvidenceError("evidence needs id and test_key")
    payload = raw.get("raw_payload")
    if not isinstance(payload, dict):
        raise EvidenceError(f"evidence {evidence_id}: raw_payload must be an object")
    attempts = payload.get("attempts") or []
    if not isinstance(attempts, list):
        raise EvidenceError(f"evidence {evidence_id}: attempts must be a list")
    return Evidence(
        id=evidence_id,
        test_key=test_key,
        source_type=_str(raw.get("source_type")) or "spawn_test",
        occurred_at=parse_time(raw.get("occurred_at"), f"evidence {evidence_id}"),
        source=_str(payload.get("source")) or "manual",
        variant=_str(payload.get("variant")),
        data=payload.get("data") if isinstance(payload.get("data"), dict) else {},
        pain_reported=payload.get("pain_reported") is True,
        attempts=tuple(sorted((parse_attempt(a) for a in attempts), key=lambda a: (a.side, a.attempt_number))),
    )


def parse_athlete(raw: object) -> Athlete:
    if not isinstance(raw, dict):
        raise EvidenceError("athlete is required")
    return Athlete(
        id=_str(raw.get("id")) or "unknown",
        body_mass_kg=_num(raw.get("body_mass_kg")),
        height_cm=_num(raw.get("height_cm")),
        age_years=_num(raw.get("age_years")),
        sex=_str(raw.get("sex")),
    )


def parse_gap(raw: dict) -> Gap:
    return Gap(
        test_key=_str(raw.get("test_key")) or "unknown",
        status=_str(raw.get("status")) or "skipped",
        reason_code=_str(raw.get("reason_code")),
    )
