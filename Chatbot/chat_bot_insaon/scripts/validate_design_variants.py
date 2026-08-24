#!/usr/bin/env python3
"""Validate the three isolated design-agent first-view directions."""

from __future__ import annotations

import argparse
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

EXPECTED_IDS = {
    "a-evidence-ledger",
    "b-case-workbench",
    "c-regulation-map",
}
REQUIRED_JSON_FIELDS = {
    "id",
    "name",
    "status",
    "purpose",
    "dials",
    "composition",
    "type_direction",
    "palette",
    "interaction",
    "subject_artifacts",
    "viewports",
}
REQUIRED_ARTIFACT_GROUPS = (
    ("법령", "법률", "규정"),
    ("조", "항"),
    ("시행일", "기준일"),
    ("review", "검토 등급", "사람 검토"),
)
FORBIDDEN_FRAGMENTS = ("ai sparkle", "generic purple", "linear-gradient(135deg,#7c3aed")


class VariantHTMLParser(HTMLParser):
    """Collect structural facts without requiring browser dependencies."""

    def __init__(self) -> None:
        super().__init__()
        self.tags: list[str] = []
        self.scripts: list[str] = []
        self._in_script = False

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        self.tags.append(tag)
        if tag == "script":
            self._in_script = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "script":
            self._in_script = False

    def handle_data(self, data: str) -> None:
        if self._in_script:
            self.scripts.append(data)


def load_json(path: Path, errors: list[str]) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{path}: invalid or unreadable JSON ({exc})")
        return {}
    if not isinstance(value, dict):
        errors.append(f"{path}: root must be an object")
        return {}
    return value


def validate_variant(path: Path, errors: list[str]) -> dict[str, Any]:
    manifest_path = path / "variant.json"
    html_path = path / "index.html"
    manifest = load_json(manifest_path, errors)
    missing_fields = sorted(REQUIRED_JSON_FIELDS - manifest.keys())
    if missing_fields:
        errors.append(f"{manifest_path}: missing fields {missing_fields}")
    if manifest.get("id") != path.name:
        errors.append(f"{manifest_path}: id must match directory name")
    if manifest.get("status") != "AI-provisional-review-candidate":
        errors.append(f"{manifest_path}: status must remain AI-provisional-review-candidate")
    if manifest.get("viewports") != ["1440x1100", "390x844"]:
        errors.append(f"{manifest_path}: required viewports are missing or reordered")

    dials = manifest.get("dials")
    if not isinstance(dials, dict) or set(dials) != {"variance", "motion", "density"}:
        errors.append(f"{manifest_path}: dials must contain variance, motion and density")

    try:
        html = html_path.read_text(encoding="utf-8")
    except OSError as exc:
        errors.append(f"{html_path}: unreadable ({exc})")
        return manifest
    lowered = html.lower()
    parser = VariantHTMLParser()
    parser.feed(html)

    for tag in ("header", "main", "button"):
        if tag not in parser.tags:
            errors.append(f"{html_path}: missing semantic or interactive <{tag}> element")
    if not parser.scripts or "addEventListener" not in "".join(parser.scripts):
        errors.append(f"{html_path}: no working JavaScript interaction found")
    if "word-break:keep-all" not in lowered.replace(" ", ""):
        errors.append(f"{html_path}: Korean word-level line breaking is not enforced")
    for group in REQUIRED_ARTIFACT_GROUPS:
        if not any(fragment.lower() in lowered for fragment in group):
            errors.append(f"{html_path}: missing subject artifact group {group}")
    for fragment in FORBIDDEN_FRAGMENTS:
        if fragment in lowered:
            errors.append(f"{html_path}: forbidden generic styling fragment {fragment!r}")
    if len(html) < 5_000:
        errors.append(f"{html_path}: first view is too thin to review ({len(html)} bytes)")
    return manifest


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    actual_ids = {
        path.name
        for path in root.iterdir()
        if path.is_dir() and path.name != "renders"
    }
    if actual_ids != EXPECTED_IDS:
        errors.append(
            f"{root}: expected exactly {sorted(EXPECTED_IDS)}, found {sorted(actual_ids)}"
        )
    manifests = [validate_variant(root / variant_id, errors) for variant_id in sorted(actual_ids)]

    for field in ("composition", "type_direction", "palette", "interaction"):
        values = [manifest.get(field) for manifest in manifests]
        if len(values) == 3 and len(set(values)) != 3:
            errors.append(f"{root}: all three {field} values must be distinct")
    dial_values = [json.dumps(manifest.get("dials"), sort_keys=True) for manifest in manifests]
    if len(dial_values) == 3 and len(set(dial_values)) != 3:
        errors.append(f"{root}: design dials must differ across directions")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    errors = validate(args.root.resolve())
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        print(f"Design variant validation failed with {len(errors)} error(s).")
        return 1
    print("Design variants valid: 3 isolated directions with distinct contracts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
