from __future__ import annotations

from datetime import datetime
from typing import Any


class ShadowStudyContractError(ValueError):
    pass


_FORBIDDEN_KEYS = {
    "name",
    "email",
    "phone",
    "raw_question",
    "raw_response",
    "transcript",
    "employee_case",
}


def _walk_forbidden(value: Any, path: str, errors: list[str]) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key).casefold() in _FORBIDDEN_KEYS:
                errors.append(f"forbidden private/raw field: {path}.{key}")
            _walk_forbidden(child, f"{path}.{key}", errors)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _walk_forbidden(child, f"{path}[{index}]", errors)


def validate_shadow_study_manifest(
    manifest: dict[str, Any],
    *,
    require_completed_sessions: bool,
) -> dict[str, Any]:
    errors: list[str] = []
    _walk_forbidden(manifest, "manifest", errors)
    if manifest.get("schema_version") != "0.1.0":
        errors.append("unsupported shadow-study schema")
    if manifest.get("input_policy") != "public_law_and_synthetic_tasks_only":
        errors.append("shadow study must use public law and synthetic tasks only")
    if manifest.get("actual_employee_data_allowed") is not False:
        errors.append("actual employee data must be forbidden")
    tasks = manifest.get("tasks", [])
    task_ids = {str(task.get("task_id")) for task in tasks if isinstance(task, dict)}
    if task_ids != {"CASE-A", "CASE-B", "CASE-C"}:
        errors.append("shadow study must use the shared CASE-A/B/C tasks")
    participants = manifest.get("participants", [])
    participant_ids = [
        str(item.get("participant_id"))
        for item in participants
        if isinstance(item, dict)
    ]
    if len(participant_ids) != len(set(participant_ids)):
        errors.append("participant IDs must be unique")
    sessions = manifest.get("sessions", [])
    session_ids: set[str] = set()
    completed = 0
    stopped = 0
    for session in sessions:
        if not isinstance(session, dict):
            errors.append("session must be an object")
            continue
        session_id = str(session.get("session_id", ""))
        if not session_id or session_id in session_ids:
            errors.append("session IDs must be unique and non-empty")
        session_ids.add(session_id)
        if session.get("participant_id") not in participant_ids:
            errors.append(f"{session_id}: unknown participant")
        assigned = {str(value) for value in session.get("task_ids", [])}
        if not assigned or not assigned <= task_ids:
            errors.append(f"{session_id}: task assignment is invalid")
        status = session.get("status")
        if status == "completed":
            completed += 1
            try:
                datetime.fromisoformat(str(session["started_at"]))
                datetime.fromisoformat(str(session["ended_at"]))
            except (KeyError, ValueError):
                errors.append(f"{session_id}: completed timestamps are required")
        elif status == "stopped":
            stopped += 1
            if not str(session.get("stop_reason") or "").strip():
                errors.append(f"{session_id}: stopped session requires a reason")
        elif status != "planned":
            errors.append(f"{session_id}: unsupported session status")
    if manifest.get("completed_sessions") != completed:
        errors.append("completed session count mismatch")
    if manifest.get("stopped_sessions") != stopped:
        errors.append("stopped session count mismatch")
    if require_completed_sessions and completed == 0:
        errors.append("at least one completed session is required")
    if errors:
        raise ShadowStudyContractError("; ".join(errors))
    return {
        "participant_count": len(participant_ids),
        "session_count": len(sessions),
        "completed_sessions": completed,
        "stopped_sessions": stopped,
        "task_count": len(task_ids),
    }

