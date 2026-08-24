"""Loopback-only Ollama HTTP boundary with bounded retries and safe failures."""

from __future__ import annotations

import time
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Protocol, cast

import httpx

from insaon.application.provider_runtime import (
    ProviderFailure,
    ProviderFailureCode,
    ProviderRuntimeError,
)

JsonObject = dict[str, Any]


@dataclass(frozen=True, slots=True)
class ProviderHttpResponse:
    status_code: int
    body: JsonObject


class ProviderTransport(Protocol):
    def post_json(
        self,
        path: str,
        payload: Mapping[str, Any],
        *,
        timeout_seconds: float,
    ) -> ProviderHttpResponse: ...

    def get_json(
        self,
        path: str,
        *,
        timeout_seconds: float,
    ) -> ProviderHttpResponse: ...


@dataclass(frozen=True, slots=True)
class ProviderCallSummary:
    component: str
    model: str
    contract_version: str
    latency_ms: float
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None


class HttpxOllamaTransport:
    """Transport that can reach only the local Ollama loopback API."""

    _allowed_paths = frozenset({"/chat", "/embed", "/tags"})

    def __init__(self, *, base_url: str, loopback_allowlist: tuple[str, ...]) -> None:
        if base_url != "http://127.0.0.1:11434/api":
            raise ValueError("Ollama transport requires the approved loopback URL")
        if loopback_allowlist != ("127.0.0.1",):
            raise ValueError("Ollama transport requires the exact loopback allowlist")
        self._base_url = base_url

    def post_json(
        self,
        path: str,
        payload: Mapping[str, Any],
        *,
        timeout_seconds: float,
    ) -> ProviderHttpResponse:
        if path not in self._allowed_paths:
            raise _failure(ProviderFailureCode.UNAVAILABLE, "loopback")
        try:
            with httpx.Client(
                base_url=self._base_url,
                timeout=timeout_seconds,
                follow_redirects=False,
                trust_env=False,
            ) as client:
                response = client.post(path, json=dict(payload))
        except httpx.TimeoutException as exc:
            raise _failure(ProviderFailureCode.TIMEOUT, path) from exc
        except httpx.HTTPError as exc:
            raise _failure(ProviderFailureCode.UNAVAILABLE, path) from exc
        try:
            body = cast(JsonObject, response.json())
        except ValueError as exc:
            raise _failure(ProviderFailureCode.UNAVAILABLE, path) from exc
        return ProviderHttpResponse(response.status_code, body)

    def get_json(
        self,
        path: str,
        *,
        timeout_seconds: float,
    ) -> ProviderHttpResponse:
        if path != "/tags":
            raise _failure(ProviderFailureCode.UNAVAILABLE, "loopback")
        try:
            with httpx.Client(
                base_url=self._base_url,
                timeout=timeout_seconds,
                follow_redirects=False,
                trust_env=False,
            ) as client:
                response = client.get(path)
        except httpx.TimeoutException as exc:
            raise _failure(ProviderFailureCode.TIMEOUT, path) from exc
        except httpx.HTTPError as exc:
            raise _failure(ProviderFailureCode.UNAVAILABLE, path) from exc
        try:
            body = cast(JsonObject, response.json())
        except ValueError as exc:
            raise _failure(ProviderFailureCode.UNAVAILABLE, path) from exc
        return ProviderHttpResponse(response.status_code, body)


class OllamaClient:
    """Local caller that maps HTTP failures and caps retries."""

    def __init__(
        self,
        transport: ProviderTransport,
        *,
        timeout_seconds: float,
        max_retries: int,
    ) -> None:
        if not 0 <= max_retries <= 3:
            raise ValueError("local model retry count must be between 0 and 3")
        self._transport = transport
        self._timeout_seconds = timeout_seconds
        self._max_retries = max_retries

    def post(self, path: str, payload: Mapping[str, Any], *, operation: str) -> JsonObject:
        for attempt in range(self._max_retries + 1):
            try:
                response = self._transport.post_json(
                    path,
                    payload,
                    timeout_seconds=self._timeout_seconds,
                )
                if response.status_code == 200:
                    return response.body
                raise _http_failure(response.status_code, operation)
            except ProviderRuntimeError as exc:
                if not exc.failure.retryable or attempt == self._max_retries:
                    raise
        raise _failure(ProviderFailureCode.UNAVAILABLE, operation)

    def get(self, path: str, *, operation: str) -> JsonObject:
        for attempt in range(self._max_retries + 1):
            try:
                response = self._transport.get_json(
                    path,
                    timeout_seconds=self._timeout_seconds,
                )
                if response.status_code == 200:
                    return response.body
                raise _http_failure(response.status_code, operation)
            except ProviderRuntimeError as exc:
                if not exc.failure.retryable or attempt == self._max_retries:
                    raise
        raise _failure(ProviderFailureCode.UNAVAILABLE, operation)

    def model_digest(self, model_id: str) -> str:
        body = self.get("/tags", operation="model_manifest")
        models = body.get("models")
        if not isinstance(models, list):
            raise _failure(ProviderFailureCode.INVALID_SCHEMA, "model_manifest")
        for item in models:
            if isinstance(item, dict) and item.get("name") == model_id:
                digest = item.get("digest")
                if isinstance(digest, str) and len(digest) == 64:
                    return f"sha256:{digest}"
        raise _failure(ProviderFailureCode.UNAVAILABLE, "model_manifest")


def timed_provider_call(call: Any) -> tuple[JsonObject, float]:
    started = time.perf_counter()
    body = cast(JsonObject, call())
    return body, (time.perf_counter() - started) * 1000


def _http_failure(status_code: int, operation: str) -> ProviderRuntimeError:
    if status_code in {408, 504}:
        return _failure(ProviderFailureCode.TIMEOUT, operation)
    if status_code in {400, 404, 409, 422}:
        return _failure(ProviderFailureCode.INVALID_SCHEMA, operation)
    return _failure(ProviderFailureCode.UNAVAILABLE, operation)


def _failure(code: ProviderFailureCode, operation: str) -> ProviderRuntimeError:
    return ProviderRuntimeError(
        ProviderFailure(code=code, operation=operation, provider="ollama-local")
    )
