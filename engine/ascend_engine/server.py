"""Minimal HTTP wrapper so the engine can run as a small service (spec §45).

POST /v1/calculate      body: engine input JSON  →  engine output JSON
POST /v1/suggest-paths  body: {"stats": {...}}   →  advisory Path suggestions
GET  /v1/health     →  {"engine_version": ...}

Stateless and unauthenticated by design: it holds no data and no secrets.
The caller (the ASCEND server) authenticates the athlete, reads their
evidence and persists the result. Bind it to a private network only.
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .config import ConfigError
from .engine import calculate
from .evidence.parsing import EvidenceError
from .paths import PathInputError, suggest_paths
from .version import ASCEND_ENGINE_VERSION

MAX_BODY_BYTES = 2_000_000


class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, body: dict) -> None:
        data = json.dumps(body, sort_keys=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/v1/health":
            self._send(200, {"engine_version": ASCEND_ENGINE_VERSION})
        else:
            self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        handlers = {"/v1/calculate": calculate, "/v1/suggest-paths": suggest_paths}
        handler = handlers.get(self.path)
        if handler is None:
            self._send(404, {"error": "not_found"})
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY_BYTES:
            self._send(413, {"error": "invalid_size"})
            return
        try:
            payload = json.loads(self.rfile.read(length))
            self._send(200, handler(payload))
        except (EvidenceError, PathInputError, json.JSONDecodeError) as error:
            self._send(400, {"error": "invalid_input", "message": str(error)})
        except ConfigError as error:
            self._send(500, {"error": "invalid_config", "message": str(error)})

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        # No request logging: bodies contain health data (spec §68).
        return


def serve(port: int) -> None:
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
