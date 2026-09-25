"""Command-line interface. JSON in on stdin, JSON out on stdout.

  python -m ascend_engine calculate < input.json
  python -m ascend_engine validate-config [version]
  python -m ascend_engine config [version]        # the parsed configuration as JSON
  python -m ascend_engine serve [--port 8765]     # HTTP, for hosting later

Exit codes: 0 success, 2 invalid input, 3 invalid configuration.
"""

from __future__ import annotations

import json
import sys

from .config import ConfigError, load_config
from .engine import calculate
from .evidence.parsing import EvidenceError
from .version import ASCEND_ENGINE_VERSION


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    command = args[0] if args else "calculate"
    try:
        if command == "calculate":
            payload = json.load(sys.stdin)
            json.dump(calculate(payload), sys.stdout, sort_keys=True, separators=(",", ":"))
            return 0
        if command in ("validate-config", "config"):
            version = args[1] if len(args) > 1 else ASCEND_ENGINE_VERSION
            config = load_config(version)
            if command == "config":
                json.dump(
                    {
                        "engine_version": config.engine_version,
                        "config_hash": config.config_hash,
                        "calibration_status": config.calibration_status,
                        "config": config.raw,
                    },
                    sys.stdout,
                    sort_keys=True,
                )
            else:
                print(f"ok {config.engine_version} {config.config_hash}")
            return 0
        if command == "serve":
            from .server import serve

            port = int(args[args.index("--port") + 1]) if "--port" in args else 8765
            serve(port)
            return 0
    except ConfigError as error:
        print(json.dumps({"error": "invalid_config", "message": str(error)}), file=sys.stderr)
        return 3
    except (EvidenceError, json.JSONDecodeError) as error:
        print(json.dumps({"error": "invalid_input", "message": str(error)}), file=sys.stderr)
        return 2
    print(f"unknown command {command!r}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
