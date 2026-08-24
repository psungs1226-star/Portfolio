from __future__ import annotations

import pytest

from insaon.application.provider_runtime import (
    ProviderFailure,
    ProviderFailureCode,
    ProviderRuntimeError,
)
from insaon.settings import Settings


@pytest.mark.parametrize(
    ("code", "retryable"),
    [
        (ProviderFailureCode.TIMEOUT, True),
        (ProviderFailureCode.RATE_LIMITED, True),
        (ProviderFailureCode.INVALID_SCHEMA, False),
        (ProviderFailureCode.CONTENT_REJECTED, False),
        (ProviderFailureCode.UNAVAILABLE, True),
    ],
)
def test_provider_failures_have_stable_routing_semantics(
    code: ProviderFailureCode,
    retryable: bool,
) -> None:
    failure = ProviderFailure(code=code, operation="generation", provider="ollama-local")

    assert failure.retryable is retryable
    assert failure.safe_message == f"provider generation failed: {code.value}"


def test_runtime_error_exposes_only_the_sanitized_contract() -> None:
    failure = ProviderFailure(
        code=ProviderFailureCode.INVALID_SCHEMA,
        operation="generation",
        provider="ollama-local",
    )

    error = ProviderRuntimeError(failure)

    assert error.failure is failure
    assert str(error) == "provider generation failed: invalid_schema"


def test_public_runtime_metadata_contains_all_reproducibility_versions() -> None:
    metadata = Settings(_env_file=None).public_runtime_metadata()

    assert metadata["generation"] == {
        "provider": "ollama-local",
        "model": "qwen3:4b-instruct",
        "prompt_version": "answer-v7-derived-allowance",
    }
    assert metadata["embedding"] == {
        "provider": "ollama-local",
        "model": "bge-m3:latest",
        "dimensions": 1024,
        "version": "embedding-v2-local",
    }
    assert metadata["reranker"] == {
        "provider": "ollama-local",
        "model": "qwen3:4b-instruct",
        "version": "reranker-v2-local",
    }
