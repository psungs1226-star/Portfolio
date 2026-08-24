#!/usr/bin/env python3
"""Execute one InsaON Harness phase with Codex or Claude."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PHASES = ROOT / "phases"
MAX_RETRIES = 3


class HarnessError(RuntimeError):
    """Expected, user-actionable executor failure."""


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise HarnessError(f"Missing file: {path.relative_to(ROOT)}") from exc
    except json.JSONDecodeError as exc:
        raise HarnessError(f"Invalid JSON: {path.relative_to(ROOT)}:{exc.lineno}") from exc
    if not isinstance(value, dict):
        raise HarnessError(f"JSON root must be an object: {path.relative_to(ROOT)}")
    return value


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def stamp() -> str:
    return datetime.now(UTC).astimezone().isoformat(timespec="seconds")


def run_git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if check and result.returncode:
        detail = result.stderr.strip() or result.stdout.strip()
        raise HarnessError(f"git {' '.join(args)} failed: {detail}")
    return result


def require_exact_git_root() -> None:
    result = run_git("rev-parse", "--show-toplevel", check=False)
    if result.returncode:
        raise HarnessError(
            "Git repository not found. Initialize or clone the public repository "
            f"with exact root {ROOT}; the executor will not infer a broader root."
        )
    actual = Path(result.stdout.strip()).resolve()
    if actual != ROOT:
        raise HarnessError(
            f"Git root mismatch: expected {ROOT}, found {actual}. "
            "Refusing to include files outside the public submission boundary."
        )
    if run_git("status", "--porcelain").stdout.strip():
        raise HarnessError(
            "Working tree is not clean. Commit the approved plan/scaffold before execution."
        )


def checkout_phase_branch(phase_name: str) -> str:
    branch = f"feat-{phase_name}"
    exists = run_git("show-ref", "--verify", f"refs/heads/{branch}", check=False)
    if exists.returncode == 0:
        run_git("checkout", branch)
    else:
        run_git("checkout", "-b", branch)
    return branch


def load_guardrails() -> str:
    sections: list[str] = []
    claude = ROOT / "CLAUDE.md"
    if claude.is_file():
        sections.append(f"## CLAUDE.md\n\n{claude.read_text(encoding='utf-8')}")
    for path in sorted((ROOT / "docs").rglob("*.md")):
        sections.append(f"## {path.relative_to(ROOT)}\n\n{path.read_text(encoding='utf-8')}")
    return "\n\n---\n\n".join(sections)


def completed_context(index: dict[str, Any]) -> str:
    summaries = [
        f"- Step {step['step']} ({step['name']}): {step['summary']}"
        for step in index["steps"]
        if step.get("status") == "completed" and step.get("summary")
    ]
    return "\n".join(summaries) if summaries else "(none)"


def build_prompt(
    phase_name: str,
    index: dict[str, Any],
    step: dict[str, Any],
    guardrails: str,
    previous_error: str | None,
) -> str:
    error_section = f"\n## Previous attempt error\n\n{previous_error}\n" if previous_error else ""
    step_file = PHASES / phase_name / f"step{step['step']}.md"
    return f"""You are implementing one Harness step for {index["project"]}.

{guardrails}

---

## Completed step summaries

{completed_context(index)}
{error_section}
## Execution rules

1. Perform only the requested step and preserve unrelated files.
2. Run every Acceptance Criteria command.
3. Do not initialize Git, switch branches, commit, push, or access files outside {ROOT}.
4. Update phases/{phase_name}/index.json for step {step["step"]}:
   - success: status `completed` and a concrete one-line `summary`
   - user/external dependency: status `blocked` and `blocked_reason`
   - three unsuccessful implementation attempts: status `error` and `error_message`
5. Never write secrets, real employee data, locked answers, or prompt contents to logs.

---

{step_file.read_text(encoding="utf-8")}
"""


def resolve_agent(requested: str) -> str:
    if requested != "auto":
        if not shutil.which(requested):
            raise HarnessError(f"Agent CLI not found: {requested}")
        return requested
    for candidate in ("codex", "claude"):
        if shutil.which(candidate):
            return candidate
    raise HarnessError("Neither codex nor claude CLI is available.")


def agent_command(agent: str) -> list[str]:
    if agent == "codex":
        return [
            "codex",
            "exec",
            "--ephemeral",
            "--sandbox",
            "workspace-write",
            "--cd",
            str(ROOT),
            "-",
        ]
    return ["claude", "-p", "--permission-mode", "acceptEdits"]


def invoke_agent(
    agent: str,
    prompt: str,
    phase_name: str,
    step_number: int,
    attempt: int,
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        agent_command(agent),
        cwd=ROOT,
        input=prompt,
        capture_output=True,
        text=True,
        timeout=1800,
        check=False,
    )
    log_dir = ROOT / "artifacts" / "harness" / phase_name
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"step{step_number}-attempt{attempt}.log"
    log_path.write_text(
        f"exit_code={result.returncode}\n\nSTDOUT\n{result.stdout}\n\nSTDERR\n{result.stderr}",
        encoding="utf-8",
    )
    return result


def update_top_status(phase_name: str, status: str) -> None:
    path = PHASES / "index.json"
    top = read_json(path)
    for phase in top.get("phases", []):
        if phase.get("dir") == phase_name:
            phase["status"] = status
            if status == "completed":
                phase["completed_at"] = stamp()
            elif status == "error":
                phase["failed_at"] = stamp()
            elif status == "blocked":
                phase["blocked_at"] = stamp()
            write_json(path, top)
            return
    raise HarnessError(f"Phase is not present in phases/index.json: {phase_name}")


def commit_step(phase_name: str, step: dict[str, Any]) -> None:
    index_rel = f"phases/{phase_name}/index.json"
    top_rel = "phases/index.json"
    run_git("add", "-A")
    run_git("reset", "HEAD", "--", index_rel, top_rel, check=False)
    if run_git("diff", "--cached", "--quiet", check=False).returncode:
        run_git(
            "commit",
            "-m",
            f"feat({phase_name}): step {step['step']} — {step['name']}",
        )
    run_git("add", index_rel, top_rel)
    if run_git("diff", "--cached", "--quiet", check=False).returncode:
        run_git("commit", "-m", f"chore({phase_name}): step {step['step']} metadata")


def validate_phase(phase_name: str) -> tuple[Path, dict[str, Any]]:
    phase_dir = PHASES / phase_name
    index_path = phase_dir / "index.json"
    index = read_json(index_path)
    if index.get("phase") != phase_name:
        raise HarnessError(f"Phase/index mismatch: {phase_name}")
    steps = index.get("steps")
    if not isinstance(steps, list) or not steps:
        raise HarnessError(f"Phase has no steps: {phase_name}")
    for expected, step in enumerate(steps):
        if step.get("step") != expected:
            raise HarnessError(f"Non-contiguous step number in {phase_name}")
        if not (phase_dir / f"step{expected}.md").is_file():
            raise HarnessError(f"Missing step file: {phase_name}/step{expected}.md")
    return index_path, index


def dry_run(phase_name: str, index: dict[str, Any], agent: str) -> None:
    print(f"Phase: {phase_name}")
    print(f"Agent: {agent}")
    for step in index["steps"]:
        print(f"  {step['step']}: {step['name']} [{step['status']}]")
    print("Dry run only: no files, Git state, or agent sessions were changed.")


def execute_phase(phase_name: str, agent: str, auto_push: bool) -> None:
    index_path, index = validate_phase(phase_name)
    require_exact_git_root()
    branch = checkout_phase_branch(phase_name)
    guardrails = load_guardrails()
    if "created_at" not in index:
        index["created_at"] = stamp()
        write_json(index_path, index)

    for original_step in index["steps"]:
        if original_step["status"] == "completed":
            continue
        if original_step["status"] in {"error", "blocked"}:
            raise HarnessError(
                f"Step {original_step['step']} is {original_step['status']}; "
                "resolve and reset it to pending before retrying."
            )
        previous_error: str | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            index = read_json(index_path)
            step = index["steps"][original_step["step"]]
            step["started_at"] = stamp()
            write_json(index_path, index)
            prompt = build_prompt(
                phase_name,
                index,
                step,
                guardrails,
                previous_error,
            )
            result = invoke_agent(
                agent,
                prompt,
                phase_name,
                step["step"],
                attempt,
            )
            index = read_json(index_path)
            step = index["steps"][original_step["step"]]
            status = step.get("status")
            if status == "completed" and step.get("summary"):
                step["completed_at"] = stamp()
                write_json(index_path, index)
                commit_step(phase_name, step)
                break
            if status == "blocked":
                update_top_status(phase_name, "blocked")
                commit_step(phase_name, step)
                raise HarnessError(f"Step blocked: {step.get('blocked_reason', 'unknown')}")
            previous_error = (
                result.stderr.strip()
                or result.stdout.strip()
                or f"agent exit code {result.returncode}; step status is {status!r}"
            )[-4000:]
            if attempt == MAX_RETRIES:
                step["status"] = "error"
                step["error_message"] = previous_error
                step["failed_at"] = stamp()
                write_json(index_path, index)
                update_top_status(phase_name, "error")
                commit_step(phase_name, step)
                raise HarnessError(f"Step {step['step']} failed after {MAX_RETRIES} attempts.")

    update_top_status(phase_name, "completed")
    run_git("add", "phases/index.json")
    if run_git("diff", "--cached", "--quiet", check=False).returncode:
        run_git("commit", "-m", f"chore({phase_name}): complete phase")
    if auto_push:
        run_git("push", "-u", "origin", branch)
    print(f"Completed phase {phase_name} on branch {branch}.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("phase")
    parser.add_argument("--agent", choices=["auto", "codex", "claude"], default="auto")
    parser.add_argument("--push", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        _, index = validate_phase(args.phase)
        agent = resolve_agent(args.agent)
        if args.dry_run:
            dry_run(args.phase, index, agent)
        else:
            execute_phase(args.phase, agent, args.push)
    except HarnessError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
