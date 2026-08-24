#!/usr/bin/env python3
"""Validate the static Harness phase plan without project dependencies."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PHASES_DIR = ROOT / "phases"
VALID_STATUSES = {"pending", "completed", "error", "blocked"}
REQUIRED_HEADINGS = (
    "## 읽어야 할 파일",
    "## 작업",
    "## Acceptance Criteria",
    "## 검증 절차",
    "## 금지사항",
)
KEBAB_CASE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def load_json(path: Path, errors: list[str]) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        errors.append(f"missing file: {path.relative_to(ROOT)}")
        return {}
    except json.JSONDecodeError as exc:
        errors.append(f"invalid JSON: {path.relative_to(ROOT)}:{exc.lineno}")
        return {}
    if not isinstance(value, dict):
        errors.append(f"JSON root must be an object: {path.relative_to(ROOT)}")
        return {}
    return value


def validate_step_file(
    phase_dir: Path,
    step_number: int,
    step_name: str,
    errors: list[str],
) -> None:
    path = phase_dir / f"step{step_number}.md"
    if not path.is_file():
        errors.append(f"missing step file: {path.relative_to(ROOT)}")
        return

    text = path.read_text(encoding="utf-8")
    expected_title = f"# Step {step_number}: {step_name}"
    if not text.startswith(expected_title + "\n"):
        errors.append(f"title mismatch: {path.relative_to(ROOT)} (expected {expected_title!r})")
    for heading in REQUIRED_HEADINGS:
        if heading not in text:
            errors.append(f"missing heading {heading!r}: {path.relative_to(ROOT)}")

    ac_start = text.find("## Acceptance Criteria")
    verify_start = text.find("## 검증 절차")
    ac_block = text[ac_start:verify_start] if ac_start >= 0 and verify_start > ac_start else ""
    if "```bash" not in ac_block:
        errors.append(f"AC must contain a bash block: {path.relative_to(ROOT)}")
    if not re.search(r"\b(pytest|ruff|mypy|python\s+-m|python\s+scripts/)", ac_block):
        errors.append(f"AC has no executable verification command: {path.relative_to(ROOT)}")


def validate_phase(phase_entry: dict[str, Any], errors: list[str]) -> int:
    phase_name = phase_entry.get("dir")
    if not isinstance(phase_name, str) or not KEBAB_CASE.fullmatch(phase_name):
        errors.append(f"invalid phase dir: {phase_name!r}")
        return 0
    if phase_entry.get("status") not in VALID_STATUSES:
        errors.append(f"invalid top-level status: {phase_name}")

    phase_dir = PHASES_DIR / phase_name
    index = load_json(phase_dir / "index.json", errors)
    if index.get("project") != "인사ON":
        errors.append(f"project must be '인사ON': {phase_name}/index.json")
    if index.get("phase") != phase_name:
        errors.append(f"phase name mismatch: {phase_name}/index.json")

    steps = index.get("steps")
    if not isinstance(steps, list) or not steps:
        errors.append(f"steps must be a non-empty list: {phase_name}/index.json")
        return 0

    expected_numbers = list(range(len(steps)))
    actual_numbers = [step.get("step") for step in steps if isinstance(step, dict)]
    if actual_numbers != expected_numbers:
        errors.append(
            f"steps must be contiguous from 0: {phase_name}/index.json (found {actual_numbers!r})"
        )

    names: set[str] = set()
    for step in steps:
        if not isinstance(step, dict):
            errors.append(f"step must be an object: {phase_name}/index.json")
            continue
        number = step.get("step")
        name = step.get("name")
        status = step.get("status")
        if not isinstance(number, int):
            errors.append(f"step number must be an integer: {phase_name}/index.json")
            continue
        if not isinstance(name, str) or not KEBAB_CASE.fullmatch(name):
            errors.append(f"invalid step name: {phase_name}/step{number}: {name!r}")
            continue
        if name in names:
            errors.append(f"duplicate step name: {phase_name}/{name}")
        names.add(name)
        if status not in VALID_STATUSES:
            errors.append(f"invalid status: {phase_name}/step{number}: {status!r}")
        validate_step_file(phase_dir, number, name, errors)

    declared = {f"step{number}.md" for number in expected_numbers}
    present = {path.name for path in phase_dir.glob("step*.md")}
    unexpected = sorted(present - declared)
    if unexpected:
        errors.append(f"unexpected step files in {phase_name}: {unexpected!r}")
    return len(steps)


def main() -> int:
    errors: list[str] = []
    top_index = load_json(PHASES_DIR / "index.json", errors)
    phases = top_index.get("phases")
    if not isinstance(phases, list) or not phases:
        errors.append("phases/index.json must contain a non-empty phases list")
        phases = []

    names = [entry.get("dir") for entry in phases if isinstance(entry, dict)]
    if len(names) != len(set(names)):
        errors.append("phases/index.json contains duplicate phase dirs")

    step_count = 0
    for entry in phases:
        if not isinstance(entry, dict):
            errors.append("each top-level phase entry must be an object")
            continue
        step_count += validate_phase(entry, errors)

    indexed_dirs = {name for name in names if isinstance(name, str)}
    actual_dirs = {
        path.name
        for path in PHASES_DIR.iterdir()
        if path.is_dir() and (path / "index.json").is_file()
    }
    for missing in sorted(actual_dirs - indexed_dirs):
        errors.append(f"phase directory is not indexed: {missing}")
    for missing in sorted(indexed_dirs - actual_dirs):
        errors.append(f"indexed phase directory is missing: {missing}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        print(f"Harness plan validation failed with {len(errors)} error(s).")
        return 1

    print(f"Harness plan valid: {len(phases)} phases, {step_count} steps.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
