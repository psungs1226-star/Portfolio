#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=["pilot"], required=True)
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("configs/deployment/pilot.toml"),
    )
    args = parser.parse_args()
    config_path = args.config if args.config.is_absolute() else ROOT / args.config
    errors: list[str] = []
    try:
        payload = tomllib.loads(config_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, tomllib.TOMLDecodeError) as exc:
        print(f"DEPLOYMENT CONTRACT INVALID: {exc}", file=sys.stderr)
        return 1
    exact = {
        "profile": "pilot",
        "hosting": "single_linux_vm_docker_compose",
        "reverse_proxy": "caddy",
        "tls": "automatic_https",
        "public_origin_source": "runtime_environment",
        "trusted_host_source": "runtime_environment",
        "secret_store": "host_environment_file_root_only",
        "model_bind": "127.0.0.1:11434",
        "model_egress": "loopback_only",
        "rollback": "previous_image_and_approved_index_manifest",
    }
    for key, expected in exact.items():
        if payload.get(key) != expected:
            errors.append(f"{key} must be {expected}")
    for key in (
        "legal_release_required",
        "synthetic_inputs_only",
    ):
        if payload.get(key) is not True:
            errors.append(f"{key} must be true")
    for key in ("raw_request_logging", "raw_model_logging", "debug", "docs_exposed"):
        if payload.get(key) is not False:
            errors.append(f"{key} must be false")
    if not 256 <= int(payload.get("request_max_bytes", 0)) <= 65_536:
        errors.append("request_max_bytes is outside the bounded contract")
    if not 1 <= int(payload.get("rate_limit_per_minute", 0)) <= 300:
        errors.append("rate_limit_per_minute is outside the bounded contract")
    if not 1 <= int(payload.get("event_retention_days", 0)) <= 30:
        errors.append("event retention must be between 1 and 30 days")
    release = payload.get("release_gate", {})
    if (
        release.get("required_status") != "legal_validation_candidate"
        or release.get("fatal_errors") != 0
        or release.get("approval_required") is not True
        or release.get("index_manifest_required") is not True
    ):
        errors.append("legal release gate is incomplete")
    headers = payload.get("security_headers", {})
    required_headers = {
        "content_security_policy",
        "x_content_type_options",
        "x_frame_options",
        "referrer_policy",
        "strict_transport_security",
    }
    if set(headers) != required_headers:
        errors.append("security header contract is incomplete")
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(
        "Pilot deployment contract valid: local inference, synthetic inputs, "
        "legal release required."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
