import pytest
from pydantic import ValidationError

from insaon.settings import Settings
from scripts.check_public_boundary import SKIP_PARTS


def test_production_requires_legal_release_and_exact_https_boundary() -> None:
    with pytest.raises(ValidationError):
        Settings(environment="production", _env_file=None)
    with pytest.raises(ValidationError):
        Settings(
            environment="production",
            runtime_profile="local",
            legal_release_status="legal_validation_candidate",
            approved_index_manifest_path="/run/insaon/legal-index/manifest.json",
            cors_allowed_origins=("*",),
            trusted_hosts=("pilot.example.go.kr",),
            _env_file=None,
        )

    settings = Settings(
        environment="production",
        runtime_profile="local",
        legal_release_status="legal_validation_candidate",
        approved_index_manifest_path="/run/insaon/legal-index/manifest.json",
        cors_allowed_origins=("https://pilot.example.go.kr",),
        trusted_hosts=("pilot.example.go.kr",),
        _env_file=None,
    )

    assert settings.raw_request_logging is False
    assert settings.request_max_bytes == 16_384
    assert {".git", ".next", ".wrangler", "dist", "node_modules"} <= SKIP_PARTS
