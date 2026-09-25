"""ASCEND Stats Engine.

Transforms immutable raw evidence into versioned, explainable Stats
(spec §3–§8, §15–§17). Pure and deterministic: the same input and
configuration always produce the same output. No I/O, no UI concerns.
"""

from .engine import calculate
from .version import ASCEND_ENGINE_VERSION

__all__ = ["ASCEND_ENGINE_VERSION", "calculate"]
