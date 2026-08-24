from __future__ import annotations

import pytest
from pydantic import ValidationError

from insaon.settings import Settings


def test_offline_is_safe_default_and_local_requires_no_key() -> None:
    offline = Settings(_env_file=None)
    local = Settings(runtime_profile="local", _env_file=None)
    assert offline.runtime_profile == "offline"
    assert local.runtime_profile == "local"
    assert local.provider_egress_allowlist == ("127.0.0.1",)
    assert local.public_runtime_metadata()["network"]["api_key_required"] is False
    assert local.public_runtime_metadata()["network"]["model_keep_alive"] == "20m"


def test_local_model_ids_and_dimensions_are_pinned() -> None:
    settings = Settings(_env_file=None)
    assert settings.generation_model == "qwen3:4b-instruct"
    assert settings.embedding_model == "bge-m3:latest"
    assert settings.embedding_dimensions == 1024
    assert settings.reranker_model == "qwen3:4b-instruct"
    with pytest.raises(ValidationError):
        Settings(generation_model="unknown-model", _env_file=None)


def test_non_loopback_url_and_unbounded_retry_are_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(local_model_base_url="https://example.com/api", _env_file=None)
    with pytest.raises(ValidationError):
        Settings(provider_max_retries=4, _env_file=None)
