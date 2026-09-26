"""Path suggestions (ADR-041). Isolated from calibration and scoring."""

from .suggest import PATH_RULES_VERSION, PathInputError, suggest_paths

__all__ = ["PATH_RULES_VERSION", "PathInputError", "suggest_paths"]
