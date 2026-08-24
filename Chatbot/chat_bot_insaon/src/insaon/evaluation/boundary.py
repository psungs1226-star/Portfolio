"""Public/private evaluation boundary checks."""

from __future__ import annotations

from pathlib import Path

FORBIDDEN_PUBLIC_PARTS = {"private"}


def assert_public_import_allowed(path: Path, project_root: Path) -> None:
    resolved = path.resolve()
    root = project_root.resolve()
    try:
        relative = resolved.relative_to(root)
    except ValueError as exc:
        raise ValueError("evaluation import must stay inside the project") from exc
    if FORBIDDEN_PUBLIC_PARTS & set(relative.parts):
        raise PermissionError("locked answers and reviewer notes cannot enter runtime imports")
