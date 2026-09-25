"""Subdomain scoring and attribute aggregation (spec §15, Milestone 3.1).

* Only observed subdomains are measured; an unmeasured one is never zero.
* Missing evidence must not raise a Stat: the observed estimate is blended
  toward a conservative, non-zero prior and the lower value is kept.
* Repeatability is temporal: observations closer than the configured
  separation are one observation.
* Until a qualifying post-Spawn event exists, Confidence is capped below the
  verification threshold, so Spawn alone never verifies.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from ..assessment.features import TestFeatures
from ..config import EngineConfig, Subdomain
from ..confidence.confidence import ConfidenceBreakdown, combine, recency_factor, repeatability, status_for
from ..scoring.curves import CurveError
from ..scoring.normalization import NormalizationError, normalize


@dataclass(frozen=True)
class Observation:
    """One piece of evidence for one test."""

    features: TestFeatures
    entry_source: str  # manual | wearable (how the values were entered)
    occurred_at: datetime
    source_type: str  # event type: spawn_test | reassessment | workout | verified_workout | boss (legacy: wearable, manual)


@dataclass
class SourceScore:
    curve: str
    test_key: str
    evidence_id: str
    feature: str
    raw: float | str
    normalized: float | str
    body_mass_mode: str
    body_mass_kg: float | None
    score: float
    quality: float
    quality_factors: dict[str, float]
    weight: float
    occurred_at: datetime
    source_type: str
    depends_on: list[str] = field(default_factory=list)
    independent_scores: list[float] = field(default_factory=list)
    observations: list[tuple[datetime, str, str]] = field(default_factory=list)  # (time, source_type, evidence id)


@dataclass
class SubdomainResult:
    name: str
    weight: float
    observed: bool
    score: float | None = None
    quality: float | None = None
    recency: float | None = None
    repeatability: float | None = None
    independent_observations: int = 0
    source_coverage: float = 0.0
    sources: list[SourceScore] = field(default_factory=list)
    missing_sources: list[dict] = field(default_factory=list)


@dataclass(frozen=True)
class Estimate:
    observed: float
    coverage: float
    prior: float
    blended: float
    value: float


@dataclass(frozen=True)
class Verification:
    eligible: bool
    anchor: datetime | None
    qualifying_evidence_ids: tuple[str, ...]
    required_subdomains: tuple[str, ...]
    required_satisfied: bool
    reason: str


@dataclass
class AttributeResult:
    attribute: str
    score: float | None
    confidence: ConfidenceBreakdown
    status: str
    subdomains: list[SubdomainResult]
    renormalized_weights: dict[str, float]
    evidence_ids: list[str]
    estimate: Estimate | None = None
    verification: Verification | None = None
    uncapped_confidence: float = 0.0
    cap_applied: bool = False


# ---------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------


def _quality(features: TestFeatures, entry_source: str, cfg: EngineConfig) -> tuple[float, dict[str, float]]:
    factors = {"entry": cfg.quality["wearable_entry"] if entry_source == "wearable" else cfg.quality["manual_entry"]}
    if features.pain:
        factors["pain_reported"] = cfg.quality["pain_reported"]
    if features.censored:
        factors["censored"] = cfg.quality["censored"]
    if features.category_estimate:
        factors["category_estimate"] = cfg.quality["category_estimate"]
    value = 1.0
    for factor in factors.values():
        value *= factor
    return value, factors


def independent_scores(timed: list[tuple[datetime, float]], min_hours: float) -> list[float]:
    """One score per independent observation window (the latest in each).

    A window starts at an observation; everything within `min_hours` of that
    start belongs to it. Same-day repeats therefore count once.
    """
    ordered = sorted(timed, key=lambda item: item[0])
    representatives: list[float] = []
    window_start: datetime | None = None
    for at, score in ordered:
        if window_start is None or (at - window_start).total_seconds() / 3600 >= min_hours:
            window_start = at
            representatives.append(score)
        else:
            representatives[-1] = score
    return representatives


def score_source(
    curve_id: str,
    weight: float,
    observations: list[Observation],
    body_mass_kg: float | None,
    cfg: EngineConfig,
) -> tuple[SourceScore | None, dict | None]:
    """Scores the newest observation; independent older ones feed repeatability."""
    curve = cfg.curves[curve_id]
    usable = [o for o in observations if curve.feature in o.features.features]
    if not usable:
        reason = "no evidence" if not observations else "raw values needed for this feature are missing"
        return None, {"curve": curve_id, "test_key": curve.test, "reason": reason}

    scored: list[tuple[float, float | str, float | str, Observation]] = []
    for obs in usable:
        raw = obs.features.features[curve.feature]
        try:
            normalized: float | str = (
                raw if isinstance(raw, str) else normalize(raw, curve.body_mass_mode, body_mass_kg, cfg.mixed_exponent).value
            )
            score = curve.score(normalized)
        except (NormalizationError, CurveError) as error:
            return None, {"curve": curve_id, "test_key": curve.test, "reason": str(error)}
        scored.append((score, raw, normalized, obs))

    scored.sort(key=lambda item: (item[3].occurred_at, item[3].features.evidence_id))
    score, raw, normalized, newest = scored[-1]
    quality, factors = _quality(newest.features, newest.entry_source, cfg)
    return (
        SourceScore(
            curve=curve_id,
            test_key=curve.test,
            evidence_id=newest.features.evidence_id,
            feature=curve.feature,
            raw=raw,
            normalized=normalized,
            body_mass_mode=curve.body_mass_mode,
            body_mass_kg=body_mass_kg if curve.body_mass_mode in ("relative", "mixed") else None,
            score=score,
            quality=quality,
            quality_factors=factors,
            weight=weight,
            occurred_at=newest.occurred_at,
            source_type=newest.source_type,
            depends_on=list(newest.features.depends_on),
            independent_scores=independent_scores(
                [(item[3].occurred_at, item[0]) for item in scored], cfg.independent_observation_min_hours
            ),
            observations=[(item[3].occurred_at, item[3].source_type, item[3].features.evidence_id) for item in scored],
        ),
        None,
    )


def score_subdomain(
    attribute: str,
    subdomain: Subdomain,
    observations_by_test: dict[str, list[Observation]],
    body_mass_kg: float | None,
    as_of: datetime,
    cfg: EngineConfig,
) -> SubdomainResult:
    result = SubdomainResult(name=subdomain.name, weight=subdomain.weight, observed=False)
    if not subdomain.sources:
        result.missing_sources.append({"reason": "no v0.1 test measures this subdomain"})
        return result
    for source in subdomain.sources:
        curve = cfg.curves[source.curve]
        scored, missing = score_source(source.curve, source.weight, observations_by_test.get(curve.test, []), body_mass_kg, cfg)
        if scored:
            result.sources.append(scored)
        elif missing:
            result.missing_sources.append(missing)
    total = sum(s.weight for s in result.sources)
    if total <= 0:
        return result

    grace = cfg.decay[attribute].grace_days
    result.observed = True
    observed_score = sum(s.score * s.weight for s in result.sources) / total
    # Missing complementary sources must not raise the subdomain either.
    configured = sum(src.weight for src in subdomain.sources)
    source_coverage = 1.0 if subdomain.alternatives else total / configured
    result.source_coverage = source_coverage
    result.score = conservative_estimate(observed_score, source_coverage, cfg.missing_prior[attribute]).value
    result.quality = sum(s.quality * s.weight for s in result.sources) / total
    result.recency = sum(
        recency_factor((as_of - s.occurred_at).total_seconds() / 86400, grace, cfg) * s.weight for s in result.sources
    ) / total
    result.repeatability = sum(repeatability(s.independent_scores, cfg) * s.weight for s in result.sources) / total
    result.independent_observations = max(len(s.independent_scores) for s in result.sources)
    return result


# ---------------------------------------------------------------------------
# Missing-domain estimate (Milestone 3.1 §4)
# ---------------------------------------------------------------------------


def conservative_estimate(observed: float, coverage: float, prior: float) -> Estimate:
    """min(observed, observed·coverage + prior·(1 − coverage)).

    Keeps the observed estimate when coverage is complete, never uses zero for
    unknown, and never lets missing evidence raise the result: the blended
    value can only pull a high estimate down toward the prior.
    """
    blended = observed * coverage + prior * (1.0 - coverage)
    return Estimate(observed=observed, coverage=coverage, prior=prior, blended=blended, value=min(observed, blended))


# ---------------------------------------------------------------------------
# Verification (Milestone 3.1 §1, §6)
# ---------------------------------------------------------------------------


def verification_for(attribute: str, observed: list[SubdomainResult], cfg: EngineConfig) -> Verification:
    events = sorted({obs for sd in observed for s in sd.sources for obs in s.observations})
    required = cfg.required_any_subdomain.get(attribute, ())
    required_ok = not required or any(sd.name in required for sd in observed)
    if not events:
        return Verification(False, None, (), required, required_ok, "no evidence")

    baseline_times = [at for at, source_type, _ in events if source_type in cfg.baseline_sources]
    anchor = max(baseline_times) if baseline_times else min(at for at, _, _ in events)
    qualifying = tuple(
        evidence_id
        for at, source_type, evidence_id in events
        if source_type in cfg.qualifying_sources
        and (at - anchor).total_seconds() / 3600 >= cfg.independent_observation_min_hours
    )
    if not qualifying:
        reason = "initial calibration: needs an independent post-Spawn verification event"
    elif not required_ok:
        reason = f"needs evidence for one of: {', '.join(required)}"
    else:
        reason = "verified by independent later evidence"
    return Verification(bool(qualifying) and required_ok, anchor, qualifying, required, required_ok, reason)


def spawn_confidence_reference(cfg: EngineConfig) -> float:
    """Highest uncapped Confidence evidence can reach before verification:
    full coverage and recency, default repeatability, best entry quality."""
    w = cfg.confidence_weights
    best_quality = max(cfg.quality["manual_entry"], cfg.quality["wearable_entry"])
    return w["coverage"] + w["recency"] + w["repeatability"] * cfg.default_repeatability + w["quality"] * best_quality


def calibration_phase_confidence(uncapped: float, cfg: EngineConfig) -> float:
    """Confidence before any qualifying verification: scaled into [0, cap]."""
    return min(cfg.initial_calibration_cap, uncapped * cfg.initial_calibration_cap / spawn_confidence_reference(cfg))


# ---------------------------------------------------------------------------
# Attribute
# ---------------------------------------------------------------------------


def aggregate_attribute(
    attribute: str,
    observations_by_test: dict[str, list[Observation]],
    body_mass_kg: float | None,
    as_of: datetime,
    cfg: EngineConfig,
) -> AttributeResult:
    subdomains = [
        score_subdomain(attribute, sd, observations_by_test, body_mass_kg, as_of, cfg) for sd in cfg.attributes[attribute]
    ]
    observed = [sd for sd in subdomains if sd.observed]
    total_weight = sum(sd.weight for sd in subdomains)
    observed_weight = sum(sd.weight for sd in observed)

    if not observed:
        breakdown = ConfidenceBreakdown(coverage=0.0, recency=0.0, repeatability=0.0, quality=0.0, value=0.0)
        return AttributeResult(attribute, None, breakdown, "unranked", subdomains, {}, [])

    evidence_ids = sorted(
        {e for sd in observed for s in sd.sources for _, _, e in s.observations}
        | {d for sd in observed for s in sd.sources for d in s.depends_on}
    )

    renormalized = {sd.name: sd.weight / observed_weight for sd in observed}
    observed_score = sum((sd.score or 0.0) * renormalized[sd.name] for sd in observed)
    coverage = observed_weight / total_weight
    # The estimate is only pulled toward the prior for subdomains a configured
    # test could have measured (e.g. a skipped test). Subdomains no test can
    # measure yet (sleep, workload) lower Confidence via `coverage`, but must
    # not lower every athlete's Current for data ASCEND cannot collect.
    measurable_weight = sum(sd.weight for sd, cfg_sd in zip(subdomains, cfg.attributes[attribute]) if cfg_sd.sources)
    estimate_coverage = observed_weight / measurable_weight if measurable_weight > 0 else 1.0
    estimate = conservative_estimate(observed_score, estimate_coverage, cfg.missing_prior[attribute])
    low, high = cfg.scale
    score = max(low, min(high, estimate.value))

    def weighted(attr: str) -> float:
        return sum((getattr(sd, attr) or 0.0) * renormalized[sd.name] for sd in observed)

    uncapped = combine(
        coverage=coverage,
        recency=weighted("recency"),
        repeat=weighted("repeatability"),
        quality=weighted("quality"),
        cfg=cfg,
    )
    verification = verification_for(attribute, observed, cfg)
    cap_applied = not verification.eligible
    if cap_applied:
        # Scale rather than clamp, so less evidence still means lower
        # Confidence below the cap (Milestone 3.1 §1, §3).
        value = calibration_phase_confidence(uncapped.value, cfg)
        breakdown = ConfidenceBreakdown(
            coverage=uncapped.coverage,
            recency=uncapped.recency,
            repeatability=uncapped.repeatability,
            quality=uncapped.quality,
            value=value,
        )
    else:
        breakdown = uncapped
    return AttributeResult(
        attribute=attribute,
        score=score,
        confidence=breakdown,
        status=status_for(score, breakdown.value, cfg),
        subdomains=subdomains,
        renormalized_weights=renormalized,
        evidence_ids=evidence_ids,
        estimate=estimate,
        verification=verification,
        uncapped_confidence=uncapped.value,
        cap_applied=cap_applied,
    )
