import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { EngineInput, EngineOutput } from "./types";

/**
 * Runs the Python ASCEND Engine (spec §45). The engine is pure: evidence in,
 * Stats out; it never touches the database.
 *
 * - ASCEND_ENGINE_URL set → POST to a hosted engine (`python -m ascend_engine serve`).
 * - otherwise → a local subprocess, `python3 -m ascend_engine calculate`.
 */

const TIMEOUT_MS = 15_000;

export class EngineError extends Error {}

function engineDir(): string {
  // Resolved at runtime and never bundled: the engine is a separate Python package.
  return process.env.ASCEND_ENGINE_DIR ?? path.resolve(/* turbopackIgnore: true */ process.cwd(), "../../engine");
}

function pythonBinary(): string {
  if (process.env.ASCEND_ENGINE_PYTHON) return process.env.ASCEND_ENGINE_PYTHON;
  const venv = path.join(/* turbopackIgnore: true */ engineDir(), ".venv", "bin", "python");
  return existsSync(venv) ? venv : "python3";
}

function runSubprocess(args: string[], stdin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBinary(), ["-m", "ascend_engine", ...args], {
      cwd: engineDir(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new EngineError("The engine took too long."));
    }, TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (err += chunk.toString("utf8")));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new EngineError(`Could not start the engine: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new EngineError(`Engine exited with ${code}: ${err.slice(0, 500)}`));
    });
    child.stdin.end(stdin);
  });
}

export async function runEngine(input: EngineInput): Promise<EngineOutput> {
  const body = JSON.stringify(input);
  const url = process.env.ASCEND_ENGINE_URL;
  const text = url
    ? await fetch(`${url.replace(/\/$/, "")}/v1/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }).then(async (response) => {
        if (!response.ok) throw new EngineError(`Engine returned ${response.status}`);
        return response.text();
      })
    : await runSubprocess(["calculate"], body);
  return JSON.parse(text) as EngineOutput;
}

export interface EngineRegistration {
  engine_version: string;
  config_hash: string;
  calibration_status: string;
  config: Record<string, unknown>;
}

let registration: Promise<EngineRegistration> | null = null;

/** The engine's own configuration, registered alongside its first result. */
export function engineRegistration(): Promise<EngineRegistration> {
  registration ??= runSubprocess(["config"], "").then((text) => JSON.parse(text) as EngineRegistration);
  registration.catch(() => (registration = null));
  return registration;
}
