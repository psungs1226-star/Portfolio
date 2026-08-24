"""Immutable collector for exact-allowlisted official public sources."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from insaon.adapters.source.client import SourceFetchError
from insaon.adapters.source.official import (
    OfficialSourceContract,
    OfficialSourceRegistry,
)

COLLECTOR_VERSION = "official-public-page-v0.1.0"
_SAFE_ID = re.compile(r"^[A-Z0-9][A-Z0-9-]+$")


@dataclass(frozen=True)
class CollectedSnapshot:
    snapshot_id: str
    source_id: str
    source_name: str
    source_type: str
    issuer: str
    official_source_id: str
    source_url: str
    retrieved_at: str
    content_type: str
    content_hash: str
    byte_count: int
    promulgation_date: str
    effective_from: str
    collector_version: str
    relative_path: str
    redistribution: str
    effective_to: str | None = None


class OfficialSourceCollector:
    """Fetch and persist immutable bytes without redirects, proxies, or credentials."""

    def __init__(
        self,
        registry: OfficialSourceRegistry,
        *,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._registry = registry
        self._transport = transport

    def probe(self, source_id: str) -> CollectedSnapshot:
        source = self._registry.get(source_id)
        content, content_type, retrieved_at = self._fetch_bytes(source)
        return self._metadata(source, content, content_type, retrieved_at)

    def collect(self, source_id: str, output_dir: Path) -> CollectedSnapshot:
        source = self._registry.get(source_id)
        if not _SAFE_ID.fullmatch(source.source_id):
            raise SourceFetchError("source ID is not safe for immutable storage")
        content, content_type, retrieved_at = self._fetch_bytes(source)
        snapshot = self._metadata(source, content, content_type, retrieved_at)
        output_dir.mkdir(parents=True, exist_ok=True)
        destination = output_dir / snapshot.relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            if hashlib.sha256(destination.read_bytes()).hexdigest() != snapshot.content_hash:
                raise SourceFetchError("existing immutable snapshot hash does not match")
        else:
            temporary = destination.with_suffix(destination.suffix + ".part")
            temporary.write_bytes(content)
            if hashlib.sha256(temporary.read_bytes()).hexdigest() != snapshot.content_hash:
                temporary.unlink(missing_ok=True)
                raise SourceFetchError("snapshot hash changed while writing")
            temporary.replace(destination)
        self._merge_manifest(output_dir, snapshot)
        return snapshot

    def _fetch_bytes(
        self, source: OfficialSourceContract
    ) -> tuple[bytes, str, datetime]:
        last_error: Exception | None = None
        for _attempt in range(source.retries + 1):
            try:
                timeout = httpx.Timeout(source.timeout_seconds)
                with httpx.Client(
                    transport=self._transport,
                    timeout=timeout,
                    follow_redirects=False,
                    trust_env=False,
                    headers={
                        "Accept": ", ".join(source.content_types),
                        "User-Agent": "InsaON-Portfolio-Collector/0.1",
                    },
                ) as client:
                    response = client.get(source.url)
                if response.status_code != 200:
                    raise SourceFetchError(
                        f"{source.source_id}: unexpected status {response.status_code}"
                    )
                self._registry.require_exact_url(str(response.request.url))
                content = response.content
                if not content or len(content) > source.max_bytes:
                    raise SourceFetchError(f"{source.source_id}: response size is invalid")
                media_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                if media_type not in source.content_types:
                    raise SourceFetchError(
                        f"{source.source_id}: unexpected content type {media_type!r}"
                    )
                try:
                    decoded = content.decode("utf-8")
                except UnicodeDecodeError as exc:
                    raise SourceFetchError(
                        f"{source.source_id}: response must be UTF-8"
                    ) from exc
                if source.expected_marker not in " ".join(decoded.split()):
                    raise SourceFetchError(
                        f"{source.source_id}: expected official marker is missing"
                    )
                return content, media_type, datetime.now(UTC)
            except (httpx.TimeoutException, httpx.TransportError, SourceFetchError) as exc:
                last_error = exc
                if isinstance(exc, SourceFetchError):
                    break
        raise SourceFetchError(f"{source.source_id}: bounded collection failed") from last_error

    @staticmethod
    def _metadata(
        source: OfficialSourceContract,
        content: bytes,
        content_type: str,
        retrieved_at: datetime,
    ) -> CollectedSnapshot:
        digest = hashlib.sha256(content).hexdigest()
        extension = {
            "html": "html",
            "xml": "xml",
            "json": "json",
            "pdf": "pdf",
        }[source.collector_format]
        relative_path = f"{source.source_id}/{digest}.{extension}"
        return CollectedSnapshot(
            snapshot_id=f"SNAP-{source.source_id}-{digest[:12]}",
            source_id=source.source_id,
            source_name=source.source_name,
            source_type=source.source_type,
            issuer=source.issuer,
            official_source_id=source.official_source_id,
            source_url=source.url,
            retrieved_at=retrieved_at.isoformat(),
            content_type=content_type,
            content_hash=digest,
            byte_count=len(content),
            promulgation_date=source.promulgation_date.isoformat(),
            effective_from=source.effective_from.isoformat(),
            collector_version=COLLECTOR_VERSION,
            relative_path=relative_path,
            redistribution=source.redistribution,
            effective_to=(
                source.effective_to.isoformat()
                if source.effective_to is not None
                else None
            ),
        )

    @staticmethod
    def _merge_manifest(output_dir: Path, snapshot: CollectedSnapshot) -> None:
        manifest_path = output_dir / "manifest.json"
        payload: dict[str, Any] = {
            "schema_version": "0.1.0",
            "collector_version": COLLECTOR_VERSION,
            "snapshots": [],
        }
        if manifest_path.exists():
            loaded = json.loads(manifest_path.read_text(encoding="utf-8"))
            if not isinstance(loaded, dict) or loaded.get("schema_version") != "0.1.0":
                raise SourceFetchError("existing snapshot manifest is invalid")
            payload = loaded
        snapshots = payload.get("snapshots")
        if not isinstance(snapshots, list):
            raise SourceFetchError("snapshot manifest entries must be an array")
        identity = (snapshot.source_id, snapshot.content_hash)
        existing = {
            (item.get("source_id"), item.get("content_hash"))
            for item in snapshots
            if isinstance(item, dict)
        }
        if identity not in existing:
            snapshots.append(asdict(snapshot))
            snapshots.sort(key=lambda item: (str(item["source_id"]), str(item["content_hash"])))
        manifest_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
