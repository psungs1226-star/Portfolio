"""Provider-neutral runtime and failure contracts."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class ProviderFailureCode(StrEnum):
    """Failures that the application can route without provider-specific details."""

    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"
    INVALID_SCHEMA = "invalid_schema"
    CONTENT_REJECTED = "content_rejected"
    UNAVAILABLE = "unavailable"


_RETRYABLE_FAILURES = {
    ProviderFailureCode.TIMEOUT,
    ProviderFailureCode.RATE_LIMITED,
    ProviderFailureCode.UNAVAILABLE,
}


@dataclass(frozen=True, slots=True)
class ProviderFailure:
    """Sanitized failure returned across the application boundary."""

    code: ProviderFailureCode
    operation: str
    provider: str

    @property
    def retryable(self) -> bool:
        return self.code in _RETRYABLE_FAILURES

    @property
    def safe_message(self) -> str:
        return f"provider {self.operation} failed: {self.code.value}"


class ProviderRuntimeError(RuntimeError):
    """Exception wrapper that never includes credentials or raw provider payloads."""

    def __init__(self, failure: ProviderFailure) -> None:
        self.failure = failure
        super().__init__(failure.safe_message)
