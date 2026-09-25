"""Subdomain scoring and attribute aggregation (spec §15).

Only observed subdomains participate; their weights are renormalized. A
subdomain without evidence contributes nothing — it lowers coverage (and so
Confidence), never the score.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from ..assessment.features import TestFeatures
from ..config import EngineConfig, Subdomain
from ..confidence.confidence import ConfidenceBreakdown, combine, recency_factor, repeatability, status_for
from ..scoring.curves import CurveError
from ..scoring.normalization import NormalizationError, normalize


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
    depends_on: list[str] = field(default_factory=list)
    history: list[float] = field(default_factory=list)


@dataclass
class SubdomainResult:
    name: str
    weight: float
    observed: bool
    score: float | None = None
    quality: float | None = None
    recency: float | None = None
    repeatability: float | None = None
    sources: list[SourceScore] = field(default_factory=list)
    missing_sources: list[dict] = field(default_factory=list)


@dataclass
class AttributeResult:
    attribute: str
    score: float | None
    confidence: ConfidenceBreakdown
    status: str
    subdomains: list[SubdomainResult]
    renormalized_weights: dict[str, float]
    evidence_ids: list[str]


def _quality(features: TestFeatures, source: str, cfg: EngineConfig) -> tuple[float, dict[str, float]]:
    factors = {"entry": cfg.quality["wearable_entry"] if source == "wearable" else cfg.quality["manual_entry"]}
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


def score_source(
    curve_id: str,
    weight: float,
    observations: list[tuple[TestFeatures, str, datetime]],
    body_mass_kg: float | None,
    cfg: EngineConfig,
) -> tuple[SourceScore | None, dict | None]:
    """Scores the newest observation of a curve's feature; older ones feed repeatability.

    Returns (score, None) or (None, reason) when the source cannot be scored.
    """
    curve = cfg.curves[curve_id]
    usable = [(f, src, at) for f, src, at in observations if curve.feature in f.features]
    if not usable:
        reason = "no evidence" if not observations else "raw values needed for this feature are missing"
        return None, {"curve": curve_id, "test_key": curve.test, "reason": reason}

    scored: list[tuple[float, float | str, float | str, TestFeatures, str, datetime]] = []
    for features, source, at in usable:
        raw = features.features[curve.feature]
        try:
            if isinstance(raw, str):
                normalized: float | str = raw
            else:
                normalized = normalize(raw, curve.body_mass_mode, body_mass_kg, cfg.mixed_exponent).value
            score = curve.score(normalized)
        except (NormalizationError, CurveError) as error:
            return None, {"curve": curve_id, "test_key": curve.test, "reason": str(error)}
        scored.append((score, raw, normalized, features, source, at))

    scored.sort(key=lambda item: item[5])
    score, raw, normalized, features, source, at = scored[-1]
    quality, factors = _quality(features, source, cfg)
    return (
        SourceScore(
            curve=curve_id,
            test_key=curve.test,
            evidence_id=features.evidence_id,
            feature=curve.feature,
            raw=raw,
            normalized=normalized,
            body_mass_mode=curve.body_mass_mode,
            body_mass_kg=body_mass_kg if curve.body_mass_mode in ("relative", "mixed") else None,
            score=score,
            quality=quality,
            quality_factors=factors,
            weight=weight,
            occurred_at=at,
            depends_on=list(features.depends_on),
            history=[item[0] for item in scored],
        ),
        None,
    )


def score_subdomain(
    attribute: str,
    subdomain: Subdomain,
    observations_by_test: dict[str, list[tuple[TestFeatures, str, datetime]]],
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
        scored, missing = score_source(
            source.curve, source.weight, observations_by_test.get(curve.test, []), body_mass_kg, cfg
        )
        if scored:
            result.sources.append(scored)
        elif missing:
            result.missing_sources.append(missing)
    total = sum(s.weight for s in result.sources)
    if total <= 0:
        return result

    grace = cfg.decay[attribute].grace_days
    result.observed = True
    result.score = sum(s.score * s.weight for s in result.sources) / total
    result.quality = sum(s.quality * s.weight for s in result.sources) / total
    result.recency = sum(
        recency_factor((as_of - s.occurred_at).total_seconds() / 86400, grace, cfg) * s.weight for s in result.sources
    ) / total
    result.repeatability = sum(repeatability(s.history, cfg) * s.weight for s in result.sources) / total
    return result


def aggregate_attribute(
    attribute: str,
    observations_by_test: dict[str, list[tuple[TestFeatures, str, datetime]]],
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

    evidence_ids = sorted(
        {s.evidence_id for sd in observed for s in sd.sources} | {d for sd in observed for s in sd.sources for d in s.depends_on}
    )

    if not observed:
        breakdown = ConfidenceBreakdown(coverage=0.0, recency=0.0, repeatability=0.0, quality=0.0, value=0.0)
        return AttributeResult(attribute, None, breakdown, "unranked", subdomains, {}, [])

    renormalized = {sd.name: sd.weight / observed_weight for sd in observed}
    score = sum((sd.score or 0.0) * renormalized[sd.name] for sd in observed)
    low, high = cfg.scale
    score = max(low, min(high, score))

    def weighted(attr: str) -> float:
        return sum((getattr(sd, attr) or 0.0) * renormalized[sd.name] for sd in observed)

    breakdown = combine(
        coverage=observed_weight / total_weight,
        recency=weighted("recency"),
        repeat=weighted("repeatability"),
        quality=weighted("quality"),
        cfg=cfg,
    )
    return AttributeResult(
        attribute=attribute,
        score=score,
        confidence=breakdown,
        status=status_for(score, breakdown.value, cfg),
        subdomains=subdomains,
        renormalized_weights=renormalized,
        evidence_ids=evidence_ids,
    )
