#!/usr/bin/env python3
"""Validate InsaON evaluation contract files without third-party packages."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections.abc import Iterable
from datetime import date, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = ROOT / "evals" / "schemas"
DEFAULT_CASES = ROOT / "evals" / "samples" / "dev.sample.jsonl"
DEFAULT_RESULTS = ROOT / "evals" / "samples" / "result.sample.json"
CASE_ID = re.compile(r"^CASE-[A-Z0-9][A-Z0-9_-]*$")
GROUP_ID = re.compile(r"^GROUP-[A-Z0-9][A-Z0-9_-]*$")
HEX64 = re.compile(r"^[a-f0-9]{64}$")
ZERO_HASH = "0" * 64
FORBIDDEN_KEYS = {
    "answer_key",
    "api_key",
    "personal_data",
    "prompt_text",
    "raw_personal_data",
    "reviewer_notes",
    "secret",
    "token",
}
CASE_KEYS = {
    "schema_version",
    "case_id",
    "group_id",
    "split",
    "question_text",
    "turns",
    "slice",
    "reference_date",
    "subject",
    "expected",
    "critical_flags",
    "annotation",
}
RESULT_KEYS = {
    "schema_version",
    "run_id",
    "status",
    "started_at",
    "completed_at",
    "system",
    "data",
    "execution",
    "metrics",
    "fatal_errors",
    "failure_types",
    "case_results_path",
    "limitations",
    "notes",
}


def add_error(errors: list[str], path: Path, location: str, message: str) -> None:
    try:
        display_path = path.resolve().relative_to(ROOT)
    except ValueError:
        display_path = path.resolve()
    errors.append(f"{display_path}:{location}: {message}")


def load_json(path: Path, errors: list[str]) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        add_error(errors, path, "file", "not found")
    except json.JSONDecodeError as exc:
        add_error(errors, path, str(exc.lineno), f"invalid JSON: {exc.msg}")
    return None


def iter_jsonl(path: Path, errors: list[str]) -> Iterable[tuple[int, Any]]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        add_error(errors, path, "file", "not found")
        return
    for line_number, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            yield line_number, json.loads(line)
        except json.JSONDecodeError as exc:
            add_error(errors, path, str(line_number), f"invalid JSONL: {exc.msg}")


def find_forbidden_keys(value: Any, prefix: str = "$") -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{prefix}.{key}"
            if key.lower() in FORBIDDEN_KEYS:
                found.append(child_path)
            found.extend(find_forbidden_keys(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(find_forbidden_keys(child, f"{prefix}[{index}]"))
    return found


def valid_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def valid_datetime(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None


def validate_schema_value(
    value: Any,
    schema: dict[str, Any],
    location: str = "$",
) -> list[str]:
    """Validate the JSON Schema subset used by the checked-in contracts."""
    errors: list[str] = []
    if "oneOf" in schema:
        matches = [
            not validate_schema_value(value, candidate, location) for candidate in schema["oneOf"]
        ]
        if sum(matches) != 1:
            return [f"{location}: must match exactly one oneOf branch"]
        return []
    if "const" in schema and value != schema["const"]:
        errors.append(f"{location}: must equal {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{location}: value is not in enum")

    expected_type = schema.get("type")
    type_matches = {
        "object": isinstance(value, dict),
        "array": isinstance(value, list),
        "string": isinstance(value, str),
        "integer": isinstance(value, int) and not isinstance(value, bool),
        "number": isinstance(value, (int, float)) and not isinstance(value, bool),
        "null": value is None,
    }
    if expected_type and not type_matches.get(expected_type, False):
        errors.append(f"{location}: must be {expected_type}")
        return errors

    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            errors.append(f"{location}: string is too short")
        pattern = schema.get("pattern")
        if pattern and not re.fullmatch(pattern, value):
            errors.append(f"{location}: string does not match pattern")
        if schema.get("format") == "date" and not valid_date(value):
            errors.append(f"{location}: must be an ISO date")
        if schema.get("format") == "date-time" and not valid_datetime(value):
            errors.append(f"{location}: must be a timezone-aware RFC3339 datetime")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{location}: must be >= {schema['minimum']}")

    if isinstance(value, dict):
        required = set(schema.get("required", []))
        missing = required - value.keys()
        if missing:
            errors.append(f"{location}: missing required keys {sorted(missing)}")
        properties = schema.get("properties", {})
        for key, child in value.items():
            child_location = f"{location}.{key}"
            if key in properties:
                errors.extend(validate_schema_value(child, properties[key], child_location))
                continue
            additional = schema.get("additionalProperties", True)
            if additional is False:
                errors.append(f"{child_location}: unexpected property")
            elif isinstance(additional, dict):
                errors.extend(validate_schema_value(child, additional, child_location))
    if isinstance(value, list):
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, child in enumerate(value):
                errors.extend(validate_schema_value(child, item_schema, f"{location}[{index}]"))
        if schema.get("uniqueItems"):
            canonical = [json.dumps(item, sort_keys=True, ensure_ascii=False) for item in value]
            if len(canonical) != len(set(canonical)):
                errors.append(f"{location}: items must be unique")
    return errors


def validate_string_list(
    value: Any,
    path: Path,
    location: str,
    errors: list[str],
) -> None:
    if not isinstance(value, list) or any(not isinstance(item, str) or not item for item in value):
        add_error(errors, path, location, "must be a list of non-empty strings")
        return
    if len(value) != len(set(value)):
        add_error(errors, path, location, "must not contain duplicates")


def validate_case(
    case: Any,
    path: Path,
    line_number: int,
    errors: list[str],
) -> tuple[str | None, str | None, str | None]:
    location = str(line_number)
    if not isinstance(case, dict):
        add_error(errors, path, location, "case must be an object")
        return None, None, None

    missing = CASE_KEYS - case.keys()
    extra = case.keys() - CASE_KEYS
    if missing:
        add_error(errors, path, location, f"missing keys: {sorted(missing)}")
    if extra:
        add_error(errors, path, location, f"unexpected keys: {sorted(extra)}")
    if missing:
        return None, None, None

    for key_path in find_forbidden_keys(case):
        add_error(errors, path, location, f"forbidden field: {key_path}")

    if case["schema_version"] != "0.1.0":
        add_error(errors, path, location, "schema_version must be 0.1.0")
    if not isinstance(case["case_id"], str) or not CASE_ID.fullmatch(case["case_id"]):
        add_error(errors, path, location, "invalid case_id")
    if not isinstance(case["group_id"], str) or not GROUP_ID.fullmatch(case["group_id"]):
        add_error(errors, path, location, "invalid group_id")
    if case["split"] not in {"dev", "test_mvp_locked", "test_extended_locked"}:
        add_error(errors, path, location, "invalid split")
    if "samples" in path.parts and case["split"] != "dev":
        add_error(errors, path, location, "locked cases must not be stored in evals/samples")
    if not isinstance(case["question_text"], str) or not case["question_text"].strip():
        add_error(errors, path, location, "question_text must be non-empty")
    validate_string_list(case["turns"], path, f"{location}.turns", errors)
    if case["reference_date"] is not None and not valid_date(case["reference_date"]):
        add_error(errors, path, location, "reference_date must be YYYY-MM-DD or null")

    slice_data = case["slice"]
    if not isinstance(slice_data, dict) or set(slice_data) != {"task", "leave_type"}:
        add_error(errors, path, location, "slice has invalid shape")
    else:
        if slice_data["task"] not in {
            "single_evidence",
            "multi_evidence",
            "missing_condition",
            "temporal",
            "out_of_scope",
            "security",
        }:
            add_error(errors, path, location, "invalid slice.task")
        if slice_data["leave_type"] not in {
            "parental",
            "medical",
            "family_care",
            "self_development",
            "mixed_or_other",
        }:
            add_error(errors, path, location, "invalid slice.leave_type")

    expected = case["expected"]
    expected_keys = {
        "action",
        "answer_status",
        "required_condition_fields",
        "required_evidence_ids",
        "required_exception_ids",
        "forbidden_evidence_ids",
    }
    if not isinstance(expected, dict) or set(expected) != expected_keys:
        add_error(errors, path, location, "expected has invalid shape")
    else:
        for key in expected_keys - {"action", "answer_status"}:
            validate_string_list(expected[key], path, f"{location}.expected.{key}", errors)
        action = expected["action"]
        status = expected["answer_status"]
        if action not in {"answer", "ask", "abstain"}:
            add_error(errors, path, location, "invalid expected.action")
        if status not in {
            "ANSWERABLE",
            "REVIEW_REQUIRED",
            "INSUFFICIENT_EVIDENCE",
        }:
            add_error(errors, path, location, "invalid expected.answer_status")
        if action == "answer" and status != "ANSWERABLE":
            add_error(errors, path, location, "answer action requires ANSWERABLE")
        if action == "answer" and not expected["required_evidence_ids"]:
            add_error(errors, path, location, "answer action requires evidence IDs")
        if action == "ask" and status != "REVIEW_REQUIRED":
            add_error(errors, path, location, "ask action requires REVIEW_REQUIRED")
        if action == "ask" and not expected["required_condition_fields"]:
            add_error(errors, path, location, "ask action requires missing condition fields")
        if action == "abstain" and status == "ANSWERABLE":
            add_error(errors, path, location, "abstain action cannot be ANSWABLE")

    validate_string_list(case["critical_flags"], path, f"{location}.critical_flags", errors)
    return case.get("case_id"), case.get("group_id"), case.get("split")


def validate_metric(
    metric: Any,
    path: Path,
    index: int,
    errors: list[str],
) -> None:
    location = f"metrics[{index}]"
    keys = {
        "metric_id",
        "slice_id",
        "aggregation",
        "numerator",
        "denominator",
        "value",
        "ci95",
        "undefined_reason",
    }
    if not isinstance(metric, dict) or set(metric) != keys:
        add_error(errors, path, location, "metric has invalid shape")
        return
    aggregation = metric["aggregation"]
    numerator = metric["numerator"]
    denominator = metric["denominator"]
    value = metric["value"]
    if aggregation not in {"ratio", "macro_mean", "percentile", "count"}:
        add_error(errors, path, location, "invalid aggregation")
    if not isinstance(denominator, int) or isinstance(denominator, bool) or denominator < 0:
        add_error(errors, path, location, "denominator must be a non-negative integer")
        return
    if numerator is not None and (
        not isinstance(numerator, (int, float)) or isinstance(numerator, bool)
    ):
        add_error(errors, path, location, "numerator must be numeric or null")
    if value is not None and (not isinstance(value, (int, float)) or isinstance(value, bool)):
        add_error(errors, path, location, "value must be numeric or null")
    ci = metric["ci95"]
    if not isinstance(ci, dict) or set(ci) != {"low", "high"}:
        add_error(errors, path, location, "ci95 has invalid shape")
    if denominator == 0:
        if numerator is not None or value is not None:
            add_error(errors, path, location, "zero denominator requires null numerator/value")
        if not metric["undefined_reason"]:
            add_error(errors, path, location, "zero denominator requires undefined_reason")
        return
    if metric["undefined_reason"] is not None:
        add_error(errors, path, location, "measured metric must not have undefined_reason")
    if aggregation in {"ratio", "macro_mean"}:
        if numerator is None or value is None:
            add_error(errors, path, location, "measured mean requires numerator/value")
        else:
            expected_value = numerator / denominator
            if not math.isclose(value, expected_value, rel_tol=1e-9, abs_tol=1e-12):
                add_error(errors, path, location, "value must equal numerator/denominator")
            if aggregation == "ratio" and not 0 <= numerator <= denominator:
                add_error(errors, path, location, "ratio numerator must be within denominator")


def validate_result(result: Any, path: Path, errors: list[str]) -> None:
    if not isinstance(result, dict):
        add_error(errors, path, "$", "result must be an object")
        return
    missing = RESULT_KEYS - result.keys()
    extra = result.keys() - RESULT_KEYS
    if missing:
        add_error(errors, path, "$", f"missing keys: {sorted(missing)}")
    if extra:
        add_error(errors, path, "$", f"unexpected keys: {sorted(extra)}")
    if missing:
        return
    for key_path in find_forbidden_keys(result):
        add_error(errors, path, "$", f"forbidden field: {key_path}")
    if result["schema_version"] != "0.1.0":
        add_error(errors, path, "$", "schema_version must be 0.1.0")
    if result["status"] not in {"completed", "partial", "failed"}:
        add_error(errors, path, "$", "invalid status")
    if not valid_datetime(result["started_at"]):
        add_error(errors, path, "$", "started_at must be timezone-aware RFC3339")
    if result["completed_at"] is not None and not valid_datetime(result["completed_at"]):
        add_error(errors, path, "$", "completed_at must be timezone-aware RFC3339 or null")

    data = result["data"]
    for key in ("dataset_hash", "source_snapshot_hash"):
        if not isinstance(data.get(key), str) or not HEX64.fullmatch(data[key]):
            add_error(errors, path, f"data.{key}", "must be a lowercase SHA-256")
    execution = result["execution"]
    if not isinstance(execution.get("environment_lock_hash"), str) or not HEX64.fullmatch(
        execution["environment_lock_hash"]
    ):
        add_error(errors, path, "execution.environment_lock_hash", "must be a SHA-256")
    if not valid_date(data.get("data_as_of")):
        add_error(errors, path, "data.data_as_of", "must be YYYY-MM-DD")

    if result["status"] == "completed":
        if result["completed_at"] is None:
            add_error(errors, path, "$", "completed result requires completed_at")
        if data.get("case_count", 0) <= 0:
            add_error(errors, path, "data.case_count", "completed result requires cases")
        placeholders = [
            data.get("dataset_hash"),
            data.get("source_snapshot_hash"),
            execution.get("environment_lock_hash"),
        ]
        if ZERO_HASH in placeholders:
            add_error(errors, path, "$", "completed result cannot use placeholder hashes")
        if any(value in {"UNAVAILABLE", "UNIMPLEMENTED"} for value in result["system"].values()):
            add_error(errors, path, "system", "completed result cannot use placeholders")

    metrics = result["metrics"]
    if not isinstance(metrics, list):
        add_error(errors, path, "metrics", "must be an array")
    else:
        for index, metric in enumerate(metrics):
            validate_metric(metric, path, index, errors)

    fatal = result["fatal_errors"]
    if not isinstance(fatal, dict) or set(fatal) != {"total", "by_type", "case_ids"}:
        add_error(errors, path, "fatal_errors", "has invalid shape")
    else:
        by_type = fatal["by_type"]
        if not isinstance(by_type, dict) or any(
            not isinstance(count, int) or isinstance(count, bool) or count < 0
            for count in by_type.values()
        ):
            add_error(errors, path, "fatal_errors.by_type", "counts must be non-negative integers")
        elif fatal["total"] != sum(by_type.values()):
            add_error(errors, path, "fatal_errors.total", "must equal sum(by_type)")

    data = result["data"]
    if isinstance(data, dict):
        total = data.get("case_count")
        unique = data.get("unique_case_count")
        if isinstance(total, int) and isinstance(unique, int) and unique != total:
            add_error(
                errors,
                path,
                "data.unique_case_count",
                f"evaluation set is padded: {total} cases, {unique} distinct",
            )

    failures = result["failure_types"]
    expected_shape = {"by_type", "case_ids_by_type", "cases_with_any_failure"}
    if not isinstance(failures, dict) or set(failures) != expected_shape:
        add_error(errors, path, "failure_types", "has invalid shape")
    else:
        by_type = failures["by_type"]
        case_ids = failures["case_ids_by_type"]
        if not isinstance(by_type, dict) or not isinstance(case_ids, dict):
            add_error(errors, path, "failure_types", "counts and case ids must be objects")
        elif set(by_type) != set(case_ids):
            add_error(
                errors, path, "failure_types", "count keys and case id keys must match"
            )
        else:
            # A published count a reader cannot check against the listed case IDs is not
            # evidence. This mismatch is exactly how a failure count gets quietly shaved.
            for key, count in by_type.items():
                if not isinstance(count, int) or isinstance(count, bool) or count < 0:
                    add_error(
                        errors,
                        path,
                        f"failure_types.by_type.{key}",
                        "counts must be non-negative integers",
                    )
                elif count != len(case_ids[key]):
                    add_error(
                        errors,
                        path,
                        f"failure_types.by_type.{key}",
                        "count must equal the number of listed case ids",
                    )


def expand_paths(values: list[Path], suffix: str) -> list[Path]:
    paths: list[Path] = []
    for value in values:
        paths.extend(sorted(value.glob(f"*{suffix}")) if value.is_dir() else [value])
    return paths


def validate_schema_documents(
    errors: list[str],
) -> tuple[dict[str, Any], dict[str, Any]]:
    loaded: list[dict[str, Any]] = []
    for name in ("evaluation-case.schema.json", "evaluation-result.schema.json"):
        path = SCHEMA_DIR / name
        schema = load_json(path, errors)
        if not isinstance(schema, dict):
            loaded.append({})
            continue
        loaded.append(schema)
        if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
            add_error(errors, path, "$schema", "must use JSON Schema draft 2020-12")
        if schema.get("type") != "object" or schema.get("additionalProperties") is not False:
            add_error(errors, path, "$", "root must be a closed object schema")
    return loaded[0], loaded[1]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", type=Path, action="append")
    parser.add_argument("--results", type=Path, action="append")
    args = parser.parse_args()

    case_paths = expand_paths(args.cases or [DEFAULT_CASES], ".jsonl")
    result_paths = expand_paths(args.results or [DEFAULT_RESULTS], ".json")
    errors: list[str] = []
    case_schema, result_schema = validate_schema_documents(errors)

    case_ids: set[str] = set()
    group_splits: dict[str, str] = {}
    case_count = 0
    for path in case_paths:
        for line_number, case in iter_jsonl(path, errors):
            case_count += 1
            for schema_error in validate_schema_value(case, case_schema):
                add_error(errors, path, str(line_number), schema_error)
            case_id, group_id, split = validate_case(case, path, line_number, errors)
            if case_id:
                if case_id in case_ids:
                    add_error(errors, path, str(line_number), f"duplicate case_id: {case_id}")
                case_ids.add(case_id)
            if group_id and split:
                previous = group_splits.setdefault(group_id, split)
                if previous != split:
                    add_error(
                        errors,
                        path,
                        str(line_number),
                        f"group leakage: {group_id} appears in {previous} and {split}",
                    )

    for path in result_paths:
        result = load_json(path, errors)
        for schema_error in validate_schema_value(result, result_schema):
            add_error(errors, path, "$", schema_error)
        validate_result(result, path, errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        print(f"Evaluation contract validation failed with {len(errors)} error(s).")
        return 1
    print(
        f"Evaluation contract valid: {case_count} case(s), "
        f"{len(result_paths)} result file(s), schema 0.1.0."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
