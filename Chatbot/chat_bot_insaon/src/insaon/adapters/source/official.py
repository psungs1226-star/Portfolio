"""Strict contracts for keyless collection from declared official public pages."""

from __future__ import annotations

import tomllib
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit


class SourceContractError(ValueError):
    """The official source declaration violates the collection boundary."""


_SOURCE_FIELDS = {
    "source_id",
    "source_name",
    "source_type",
    "issuer",
    "official_source_id",
    "url",
    "allowed_host",
    "content_types",
    "max_bytes",
    "timeout_seconds",
    "retries",
    "auth_mode",
    "expected_marker",
    "promulgation_date",
    "effective_from",
    "redistribution",
    "collector_format",
}
_SOURCE_V2_FIELDS = {"topic_domains", "review_tier"}
_SOURCE_OPTIONAL_FIELDS = {"effective_to"}
_SOURCE_TYPES = {
    "law",
    "presidential_decree",
    "ministry_rule",
    "admin_rule",
    "manual",
}
_COLLECTOR_FORMATS = {"html", "xml", "json", "pdf"}
_TOPIC_DOMAINS = {
    "appointment",
    "personnel_records",
    "performance_and_promotion",
    "service_and_leave",
    "pay_and_allowance",
    "discipline_and_appeal",
    "training",
    "retirement",
}
_REVIEW_TIERS = {"deep_review", "evidence_only", "metadata_only"}


@dataclass(frozen=True)
class OfficialSourceContract:
    source_id: str
    source_name: str
    source_type: str
    issuer: str
    official_source_id: str
    url: str
    allowed_host: str
    content_types: tuple[str, ...]
    max_bytes: int
    timeout_seconds: float
    retries: int
    auth_mode: str
    expected_marker: str
    promulgation_date: date
    effective_from: date
    redistribution: str
    collector_format: str
    topic_domains: tuple[str, ...]
    review_tier: str
    effective_to: date | None = None

    @classmethod
    def from_mapping(
        cls,
        value: dict[str, object],
        *,
        schema_version: str = "0.1.0",
    ) -> OfficialSourceContract:
        allowed_fields = (
            _SOURCE_FIELDS
            | _SOURCE_OPTIONAL_FIELDS
            | (_SOURCE_V2_FIELDS if schema_version == "0.2.0" else set())
        )
        required_fields = allowed_fields - _SOURCE_OPTIONAL_FIELDS
        unknown = set(value) - allowed_fields
        if unknown:
            raise SourceContractError(f"unknown source fields: {sorted(unknown)}")
        missing = required_fields - set(value)
        if missing:
            raise SourceContractError(f"missing source fields: {sorted(missing)}")

        url = _required_string(value, "url")
        host = _required_string(value, "allowed_host").lower()
        parsed = urlsplit(url)
        if parsed.scheme != "https":
            raise SourceContractError("official source URL must use https")
        if parsed.username or parsed.password:
            raise SourceContractError("official source URL must not contain credentials")
        if parsed.hostname != host or parsed.port is not None:
            raise SourceContractError("official source URL host must match exact allowlist")
        if parsed.fragment:
            raise SourceContractError("official source URL must not contain fragments")

        source_type = _required_string(value, "source_type")
        if source_type not in _SOURCE_TYPES:
            raise SourceContractError("unsupported official source type")
        auth_mode = _required_string(value, "auth_mode")
        if auth_mode != "none":
            raise SourceContractError("MVP public-page collection must be keyless")
        collector_format = _required_string(value, "collector_format")
        if collector_format not in _COLLECTOR_FORMATS:
            raise SourceContractError("unsupported collector format")

        raw_content_types = value["content_types"]
        if not isinstance(raw_content_types, list) or not raw_content_types:
            raise SourceContractError("content_types must be a non-empty array")
        content_types = tuple(_nonempty_string(item, "content_types") for item in raw_content_types)
        max_bytes = _bounded_int(value["max_bytes"], "max_bytes", minimum=1, maximum=20_000_000)
        timeout_seconds = _bounded_float(
            value["timeout_seconds"], "timeout_seconds", minimum=1, maximum=60
        )
        retries = _bounded_int(value["retries"], "retries", minimum=0, maximum=2)
        topic_domains: tuple[str, ...] = ()
        review_tier = "metadata_only" if source_type == "manual" else "deep_review"
        if schema_version == "0.2.0":
            raw_topic_domains = value["topic_domains"]
            if not isinstance(raw_topic_domains, list) or not raw_topic_domains:
                raise SourceContractError("topic_domains must be a non-empty array")
            topic_domains = tuple(
                _nonempty_string(item, "topic_domains") for item in raw_topic_domains
            )
            if any(topic not in _TOPIC_DOMAINS for topic in topic_domains):
                raise SourceContractError("unsupported personnel topic domain")
            if len(topic_domains) != len(set(topic_domains)):
                raise SourceContractError("topic_domains must be unique")
            review_tier = _required_string(value, "review_tier")
            if review_tier not in _REVIEW_TIERS:
                raise SourceContractError("unsupported review tier")

        effective_from = _date_value(value["effective_from"], "effective_from")
        effective_to = (
            _date_value(value["effective_to"], "effective_to")
            if value.get("effective_to") is not None
            else None
        )
        if effective_to is not None and effective_to <= effective_from:
            raise SourceContractError("effective_to must be later than effective_from")

        return cls(
            source_id=_required_string(value, "source_id"),
            source_name=_required_string(value, "source_name"),
            source_type=source_type,
            issuer=_required_string(value, "issuer"),
            official_source_id=_required_string(value, "official_source_id"),
            url=url,
            allowed_host=host,
            content_types=content_types,
            max_bytes=max_bytes,
            timeout_seconds=timeout_seconds,
            retries=retries,
            auth_mode=auth_mode,
            expected_marker=_required_string(value, "expected_marker"),
            promulgation_date=_date_value(value["promulgation_date"], "promulgation_date"),
            effective_from=effective_from,
            redistribution=_required_string(value, "redistribution"),
            collector_format=collector_format,
            topic_domains=topic_domains,
            review_tier=review_tier,
            effective_to=effective_to,
        )


@dataclass(frozen=True)
class OfficialSourceRegistry:
    schema_version: str
    sources: tuple[OfficialSourceContract, ...]

    @classmethod
    def from_toml(cls, path: Path) -> OfficialSourceRegistry:
        try:
            payload = tomllib.loads(path.read_text(encoding="utf-8"))
        except (OSError, tomllib.TOMLDecodeError) as exc:
            raise SourceContractError(f"cannot read source manifest: {path}") from exc
        if set(payload) != {"schema_version", "sources"}:
            raise SourceContractError("manifest root must contain schema_version and sources only")
        schema_version = payload.get("schema_version")
        if schema_version not in {"0.1.0", "0.2.0"}:
            raise SourceContractError("unsupported source manifest version")
        raw_sources = payload.get("sources")
        if not isinstance(raw_sources, list) or not raw_sources:
            raise SourceContractError("manifest must declare sources")
        sources = tuple(
            OfficialSourceContract.from_mapping(source, schema_version=str(schema_version))
            for source in raw_sources
            if isinstance(source, dict)
        )
        if len(sources) != len(raw_sources):
            raise SourceContractError("each source declaration must be a table")
        ids = [source.source_id for source in sources]
        urls = [source.url for source in sources]
        if len(ids) != len(set(ids)) or len(urls) != len(set(urls)):
            raise SourceContractError("source IDs and URLs must be unique")
        return cls(schema_version=str(schema_version), sources=sources)

    def get(self, source_id: str) -> OfficialSourceContract:
        matches = [source for source in self.sources if source.source_id == source_id]
        if not matches:
            raise KeyError(source_id)
        return matches[0]

    def require_exact_url(self, url: str) -> OfficialSourceContract:
        matches = [source for source in self.sources if source.url == url]
        if not matches:
            raise SourceContractError("URL is not declared in the exact source allowlist")
        return matches[0]


def _required_string(value: dict[str, object], key: str) -> str:
    return _nonempty_string(value[key], key)


def _nonempty_string(value: object, key: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise SourceContractError(f"{key} must be a non-empty string")
    return value.strip()


def _bounded_int(value: object, key: str, *, minimum: int, maximum: int) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or not minimum <= value <= maximum:
        raise SourceContractError(f"{key} must be between {minimum} and {maximum}")
    return value


def _bounded_float(value: object, key: str, *, minimum: float, maximum: float) -> float:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise SourceContractError(f"{key} must be numeric")
    result = float(value)
    if not minimum <= result <= maximum:
        raise SourceContractError(f"{key} must be between {minimum} and {maximum}")
    return result


def _date_value(value: object, key: str) -> date:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError as exc:
            raise SourceContractError(f"{key} must be an ISO date") from exc
    raise SourceContractError(f"{key} must be an ISO date")
