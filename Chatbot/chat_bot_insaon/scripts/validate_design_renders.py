#!/usr/bin/env python3
"""Validate required screenshots and the visual review record."""

from __future__ import annotations

import argparse
import struct
import sys
from pathlib import Path

VARIANTS = ("a-evidence-ledger", "b-case-workbench", "c-regulation-map")


def parse_size(value: str) -> tuple[int, int]:
    width_text, height_text = value.lower().split("x", maxsplit=1)
    return int(width_text), int(height_text)


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as handle:
        header = handle.read(24)
    if len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG file")
    return struct.unpack(">II", header[16:24])


def validate(root: Path, desktop: tuple[int, int], mobile: tuple[int, int]) -> list[str]:
    errors: list[str] = []
    renders = root / "renders"
    expected: list[tuple[Path, tuple[int, int]]] = []
    for variant in VARIANTS:
        expected.extend(
            (
                (renders / f"{variant}-desktop.png", desktop),
                (renders / f"{variant}-mobile.png", mobile),
            )
        )
    for path, size in expected:
        try:
            actual = png_size(path)
        except (OSError, ValueError) as exc:
            errors.append(f"{path}: missing or invalid render ({exc})")
            continue
        if actual != size:
            errors.append(f"{path}: expected {size[0]}x{size[1]}, found {actual[0]}x{actual[1]}")
        if path.stat().st_size < 20_000:
            errors.append(f"{path}: suspiciously small render ({path.stat().st_size} bytes)")

    review_path = root / "AI_PROVISIONAL_REVIEW.md"
    try:
        review = review_path.read_text(encoding="utf-8")
    except OSError as exc:
        errors.append(f"{review_path}: missing review record ({exc})")
        return errors
    required = (
        "AI-provisional-review-candidate",
        "1440×1100",
        "390×844",
        "weakest section",
        "수정",
        "A Evidence Ledger",
        "B Case Workbench",
        "C Regulation Map",
    )
    for fragment in required:
        if fragment not in review:
            errors.append(f"{review_path}: missing review evidence {fragment!r}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--desktop", required=True)
    parser.add_argument("--mobile", required=True)
    args = parser.parse_args()
    errors = validate(
        args.root.resolve(),
        parse_size(args.desktop),
        parse_size(args.mobile),
    )
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        print(f"Design render validation failed with {len(errors)} error(s).")
        return 1
    print("Design renders valid: 6 screenshots and a visual review record are present.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
