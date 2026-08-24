#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_PARTS = {
    ".git",
    ".next",
    ".pytest_cache",
    ".venv",
    ".wrangler",
    "__pycache__",
    "dist",
    "insaon.egg-info",
    "node_modules",
}
FORBIDDEN_PARTS = {"private", "raw", "processed", "index"}
FORBIDDEN_NAMES = {".env", ".env.local", "id_rsa", "id_ed25519"}
TEXT_SUFFIXES = {
    ".py",
    ".md",
    ".json",
    ".jsonl",
    ".toml",
    ".html",
    ".ini",
    ".txt",
    ".yaml",
    ".yml",
}
SECRET_PATTERNS = [
    re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
]
PUBLISHED_DASHBOARD_ARTIFACTS = (
    "artifacts/legal/quality-audit.json",
    "artifacts/legal/human-review-readiness.json",
    "artifacts/legal/wide-quality-audit.json",
    "artifacts/legal/wide-human-review-readiness.json",
    "artifacts/legal/wide-candidate-summary.json",
    "artifacts/legal/wide-source-probe.json",
    "artifacts/release/manifest.json",
    "artifacts/provider/local-smoke.json",
)
RRN = re.compile(r"(?<!\d)\d{6}-?[1-8]\d{6}(?!\d)")
SHA256 = re.compile(r"\b[a-f0-9]{64}\b", re.IGNORECASE)


def main() -> int:
    errors: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or SKIP_PARTS & set(path.parts):
            continue
        relative = path.relative_to(ROOT)
        if FORBIDDEN_PARTS & set(relative.parts):
            errors.append(f"forbidden public path: {relative}")
        if path.name in FORBIDDEN_NAMES or path.suffix in {".pem", ".key"}:
            errors.append(f"possible secret file: {relative}")
        if path.suffix not in TEXT_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                errors.append(f"secret pattern in {relative}")
        for line_number, line in enumerate(text.splitlines(), start=1):
            line_without_hashes = SHA256.sub("", line)
            if RRN.search(line_without_hashes) and "[합성 공격값" not in line:
                errors.append(f"unmarked identifier pattern: {relative}:{line_number}")

    for relative_path in PUBLISHED_DASHBOARD_ARTIFACTS:
        artifact = ROOT / relative_path
        if not artifact.is_file():
            errors.append(f"missing published dashboard artifact: {relative_path}")
            continue
        text = artifact.read_text(encoding="utf-8", errors="ignore")
        if "private/" in text:
            errors.append(f"private path string in published artifact: {relative_path}")
        if str(ROOT) in text or "/Users/" in text:
            errors.append(f"machine-local path in published artifact: {relative_path}")

    results_dir = ROOT / "evals/results"
    for path in sorted(results_dir.glob("*.json")):
        result = json.loads(path.read_text(encoding="utf-8"))
        forbidden_keys = {"question_text", "expected", "answer_key", "reviewer_notes"}
        if forbidden_keys & set(result):
            errors.append(f"private evaluation field in {path.relative_to(ROOT)}")
        limitations = " ".join(result.get("limitations", []))
        if "Synthetic system-regression" not in limitations:
            errors.append(f"synthetic limitation missing: {path.relative_to(ROOT)}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        print(f"Public boundary failed with {len(errors)} error(s).")
        return 1
    print("Public boundary valid: no private paths, obvious secrets, or unmarked identifiers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
