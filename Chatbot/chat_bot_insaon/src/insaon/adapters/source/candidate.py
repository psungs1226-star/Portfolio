"""Load a private official-corpus candidate for evidence-only local exploration."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

from insaon.adapters.source.official import OfficialSourceRegistry, SourceContractError
from insaon.domain import DateRange, Provision


class CandidateCorpusError(ValueError):
    """The private candidate cannot safely back evidence-only retrieval."""


_DEEP_LEAVE_TOPIC_TAGS = frozenset(
    {
        "parental_leave",
        "medical_leave",
        "family_care_leave",
        "self_development_leave",
        "reinstatement",
    }
)


def _is_derived_leave_pay_provision(provision: Provision) -> bool:
    if "pay_and_allowance" not in provision.topic_tags:
        return False
    text = f"{provision.article_path} {provision.title} {provision.text}"
    return (
        "정근수당" in text
        and (
            provision.article_path.startswith("제6조")
            or provision.article_path.startswith("제19조 제10항")
        )
    ) or (
        (
            "육아휴직" in text
            or "제63조제2항제4호" in text
        )
        and (
            provision.article_path.startswith("제14조 제3호의2")
            or "제14조제3호의2" in text
        )
    )


@dataclass(frozen=True)
class CandidateEvidenceCorpus:
    provisions: tuple[Provision, ...]
    source_names: dict[str, str]
    source_urls: dict[str, str]
    source_review_tiers: dict[str, str]
    topic_source_ids: dict[str, frozenset[str]]
    candidate_status: str
    data_as_of: date

    @property
    def deep_review_provisions(self) -> tuple[Provision, ...]:
        """Return official provisions eligible for bounded deep-review lanes."""
        deep_source_ids = {
            source_id
            for source_id, tier in self.source_review_tiers.items()
            if tier == "deep_review"
        }
        return tuple(
            provision
            for provision in self.provisions
            if (
                provision.source_id in deep_source_ids
                and provision.topic_tags & _DEEP_LEAVE_TOPIC_TAGS
            )
            or _is_derived_leave_pay_provision(provision)
        )

    @property
    def derived_leave_pay_provisions(self) -> tuple[Provision, ...]:
        return tuple(
            provision
            for provision in self.provisions
            if _is_derived_leave_pay_provision(provision)
        )

    @classmethod
    def from_files(
        cls,
        candidate_path: Path,
        source_manifest_path: Path,
    ) -> CandidateEvidenceCorpus:
        try:
            payload: Any = json.loads(candidate_path.read_text(encoding="utf-8"))
            registry = OfficialSourceRegistry.from_toml(source_manifest_path)
        except (OSError, json.JSONDecodeError, SourceContractError) as exc:
            raise CandidateCorpusError("cannot load candidate evidence corpus") from exc
        if not isinstance(payload, dict):
            raise CandidateCorpusError("candidate root must be an object")
        status = payload.get("candidate_status")
        if status not in {"pending_human_approval", "approved_legal_index"}:
            raise CandidateCorpusError("unsupported candidate status")
        quality = payload.get("quality")
        if not isinstance(quality, dict) or quality.get("fatal_count") != 0:
            raise CandidateCorpusError("candidate must have zero fatal parser issues")

        raw_sources = payload.get("sources")
        if not isinstance(raw_sources, list):
            raise CandidateCorpusError("candidate sources must be an array")
        sources: dict[str, dict[str, Any]] = {}
        for item in raw_sources:
            if not isinstance(item, dict) or not isinstance(item.get("source_id"), str):
                raise CandidateCorpusError("candidate source record is invalid")
            source_id = str(item["source_id"])
            if source_id in sources:
                raise CandidateCorpusError("candidate source IDs must be unique")
            sources[source_id] = item

        contracts = {
            source.source_id: source
            for source in registry.sources
            if source.review_tier != "metadata_only"
        }
        if set(sources) != set(contracts):
            raise CandidateCorpusError("candidate sources must match non-metadata registry sources")
        for source_id, source in contracts.items():
            if sources[source_id].get("source_url") != source.url:
                raise CandidateCorpusError("candidate source URL differs from registry")

        raw_provisions = payload.get("provisions")
        if not isinstance(raw_provisions, list):
            raise CandidateCorpusError("candidate provisions must be an array")
        provisions = tuple(
            _provision_from_mapping(item, contracts)
            for item in raw_provisions
            if isinstance(item, dict)
        )
        if len(provisions) != len(raw_provisions) or len(provisions) != payload.get(
            "provision_count"
        ):
            raise CandidateCorpusError("candidate provision count mismatch")
        provision_source_ids = {provision.source_id for provision in provisions}
        missing_source_ids = sorted(set(contracts) - provision_source_ids)
        if missing_source_ids:
            raise CandidateCorpusError(
                "candidate has no searchable provisions for registry sources: "
                + ", ".join(missing_source_ids)
            )

        created_at = payload.get("created_at")
        if not isinstance(created_at, str):
            raise CandidateCorpusError("candidate created_at is required")
        try:
            data_as_of = datetime.fromisoformat(created_at).date()
        except ValueError as exc:
            raise CandidateCorpusError("candidate created_at must be RFC3339") from exc

        topic_source_ids: dict[str, frozenset[str]] = {}
        topics = {topic for source in contracts.values() for topic in source.topic_domains}
        for topic in sorted(topics):
            topic_source_ids[topic] = frozenset(
                source.source_id
                for source in contracts.values()
                if topic in source.topic_domains and source.source_id in provision_source_ids
            )
        return cls(
            provisions=provisions,
            source_names={key: value.source_name for key, value in contracts.items()},
            source_urls={key: str(sources[key]["source_url"]) for key in contracts},
            source_review_tiers={key: value.review_tier for key, value in contracts.items()},
            topic_source_ids=topic_source_ids,
            candidate_status=str(status),
            data_as_of=data_as_of,
        )


def _provision_from_mapping(
    value: dict[str, Any],
    contracts: dict[str, Any],
) -> Provision:
    source_id = str(value.get("source_id", ""))
    source = contracts.get(source_id)
    if source is None:
        raise CandidateCorpusError("provision references an undeclared source")
    try:
        effective_from = date.fromisoformat(str(value["effective_from"]))
        raw_effective_to = value.get("effective_to")
        effective_to = (
            date.fromisoformat(str(raw_effective_to)) if raw_effective_to is not None else None
        )
        return Provision(
            provision_id=str(value["provision_id"]),
            source_id=source_id,
            article_path=str(value["article_path"]),
            title=f"[{source.source_name}] {value['title']}",
            text=str(value["text"]),
            valid_time=DateRange(effective_from, effective_to),
            applies_to=frozenset(str(item) for item in value["applies_to"]),
            topic_tags=frozenset(
                {*(str(item) for item in value["topic_tags"]), *source.topic_domains}
            ),
            parent_provision_id=(
                str(value["parent_provision_id"])
                if value.get("parent_provision_id") is not None
                else None
            ),
            proviso_text=(
                str(value["proviso_text"]) if value.get("proviso_text") is not None else None
            ),
            relation_ids=tuple(str(item) for item in value["relation_ids"]),
            source_hash=str(value["source_hash"]),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise CandidateCorpusError("candidate provision is invalid") from exc
