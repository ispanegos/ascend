import pytest

from ascend_engine.progression.current_peak import resolve_peak
from ascend_engine.progression.decay import decayed_current
from ascend_engine.progression.update import UpdateError, update_current


class TestPeak:
    def test_peak_needs_verification(self):
        assert resolve_peak(40.0, 0.65, None, 0.70).peak is None
        assert resolve_peak(40.0, 0.70, None, 0.70).peak == 40.0

    def test_peak_only_rises(self):
        assert resolve_peak(35.0, 0.95, 40.0, 0.70).peak == 40.0
        result = resolve_peak(45.0, 0.95, 40.0, 0.70)
        assert result.peak == 45.0 and result.peak_updated

    def test_invalid_evidence_never_sets_peak(self):
        assert resolve_peak(90.0, 0.99, 40.0, 0.70, evidence_valid=False).peak == 40.0

    def test_unknown_current_keeps_peak(self):
        assert resolve_peak(None, 0.0, 40.0, 0.70).peak == 40.0

    def test_current_keeps_decimals(self):
        assert resolve_peak(41.2345, 0.9, None, 0.7).current == 41.2345


def upd(cfg, source, current=40.0, observed=70.0, quality=0.9, confidence=0.8):
    return update_current(current, observed, source_type=source, quality=quality, current_confidence=confidence, cfg=cfg)


class TestUpdate:
    def test_weak_evidence_moves_less_than_strong(self, cfg):
        assert upd(cfg, "workout").applied_delta < upd(cfg, "wearable").applied_delta < upd(cfg, "spawn_test").applied_delta

    def test_lower_weight_never_moves_more_all_else_equal(self, cfg):
        for observed in (0.0, 20.0, 45.0, 60.0, 100.0):
            weak = abs(upd(cfg, "workout", observed=observed).applied_delta)
            strong = abs(upd(cfg, "boss", observed=observed).applied_delta)
            assert weak <= strong

    def test_caps(self, cfg):
        assert upd(cfg, "workout", observed=100).applied_delta == 1.0
        assert upd(cfg, "wearable", observed=100).applied_delta == 2.0
        assert upd(cfg, "spawn_test", observed=100).applied_delta == 5.0
        assert upd(cfg, "boss", observed=100).applied_delta == 8.0
        assert upd(cfg, "boss", observed=0).applied_delta == -8.0

    def test_contradictory_single_evidence_cannot_swing_wildly(self, cfg):
        result = upd(cfg, "spawn_test", current=60.0, observed=5.0, quality=1.0, confidence=0.0)
        assert result.capped and result.new_current == 55.0

    def test_boss_recalibrates_more(self, cfg):
        assert upd(cfg, "boss").new_current > upd(cfg, "spawn_test").new_current

    def test_downward_evidence_moves_down(self, cfg):
        assert upd(cfg, "spawn_test", observed=20.0).applied_delta < 0

    def test_confidence_dampens(self, cfg):
        low = upd(cfg, "workout", observed=42.0, confidence=0.1)
        high = upd(cfg, "workout", observed=42.0, confidence=0.95)
        assert abs(high.applied_delta) < abs(low.applied_delta)

    @pytest.mark.parametrize("current,observed", [(99.5, 100.0), (0.5, 0.0), (100.0, 100.0), (0.0, 0.0)])
    def test_stays_within_scale(self, cfg, current, observed):
        result = upd(cfg, "boss", current=current, observed=observed, quality=1.0, confidence=0.0)
        assert 0.0 <= result.new_current <= 100.0

    def test_null_current_is_not_updated(self, cfg):
        with pytest.raises(UpdateError):
            update_current(None, 50.0, source_type="workout", quality=1.0, current_confidence=0.0, cfg=cfg)

    def test_rejects_out_of_scale_and_unknown_source(self, cfg):
        with pytest.raises(UpdateError):
            upd(cfg, "workout", observed=140.0)
        with pytest.raises(UpdateError):
            upd(cfg, "xp_bonus")

    def test_same_observation_as_current_is_no_change(self, cfg):
        assert upd(cfg, "boss", observed=40.0).applied_delta == 0.0


class TestDecay:
    def test_no_decay_in_grace(self, cfg):
        assert decayed_current("endurance", 50.0, 14, cfg).current == 50.0

    def test_no_daily_punishment_only_full_weeks(self, cfg):
        assert decayed_current("endurance", 50.0, 20, cfg).current == 50.0
        assert decayed_current("endurance", 50.0, 21, cfg).current == pytest.approx(49.5)

    def test_floor(self, cfg):
        result = decayed_current("endurance", 50.0, 10_000, cfg)
        assert result.current == pytest.approx(50.0 * 0.85)

    def test_strength_is_slower_than_endurance(self, cfg):
        assert decayed_current("strength", 50.0, 70, cfg).current > decayed_current("endurance", 50.0, 70, cfg).current

    def test_mobility_does_not_decay_with_time(self, cfg):
        assert decayed_current("mobility", 50.0, 365, cfg).current == 50.0

    def test_pure_function_of_elapsed_time(self, cfg):
        once = decayed_current("recovery", 40.0, 60, cfg).current
        assert decayed_current("recovery", 40.0, 60, cfg).current == once
