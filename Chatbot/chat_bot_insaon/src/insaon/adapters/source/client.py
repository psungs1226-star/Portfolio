from __future__ import annotations

import hashlib
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime

from insaon.domain import RawSnapshot


@dataclass(frozen=True)
class SourceResponse:
    status_code: int
    content: bytes
    content_type: str
    source_url: str
    source_id: str
    promulgation_date: date
    effective_from: date
    retrieved_at: datetime


class SourceFetchError(RuntimeError):
    pass


class RecordedLawSourceClient:
    """Validated client boundary with an injected transport for offline tests."""

    def __init__(
        self,
        transport: Callable[[str, date, float], SourceResponse],
        *,
        timeout_seconds: float = 5.0,
        retries: int = 2,
        max_bytes: int = 2_000_000,
    ) -> None:
        self._transport = transport
        self._timeout = timeout_seconds
        self._retries = retries
        self._max_bytes = max_bytes

    def fetch_document(self, official_source_id: str, effective_date: date) -> RawSnapshot:
        last_error: Exception | None = None
        for _attempt in range(self._retries + 1):
            try:
                response = self._transport(official_source_id, effective_date, self._timeout)
                return self._validated_snapshot(official_source_id, response)
            except (TimeoutError, SourceFetchError) as exc:
                last_error = exc
        raise SourceFetchError("source fetch failed after bounded retries") from last_error

    def _validated_snapshot(
        self, official_source_id: str, response: SourceResponse
    ) -> RawSnapshot:
        if response.status_code != 200:
            raise SourceFetchError(f"unexpected source status: {response.status_code}")
        if response.content_type not in {"application/json", "text/plain"}:
            raise SourceFetchError("unsupported source content type")
        if not response.content or len(response.content) > self._max_bytes:
            raise SourceFetchError("source content size is invalid")
        try:
            content = response.content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise SourceFetchError("source content must be UTF-8") from exc
        digest = hashlib.sha256(response.content).hexdigest()
        return RawSnapshot(
            snapshot_id=f"SNAP-{response.source_id}-{digest[:12]}",
            source_id=response.source_id,
            official_source_id=official_source_id,
            source_url=response.source_url,
            content=content,
            content_type=response.content_type,
            content_hash=digest,
            retrieved_at=response.retrieved_at,
            promulgation_date=response.promulgation_date,
            effective_from=response.effective_from,
            parser_version="0.1.0",
        )
