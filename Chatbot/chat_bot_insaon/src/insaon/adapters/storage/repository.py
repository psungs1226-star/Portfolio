from __future__ import annotations

import hashlib
from datetime import UTC, date, datetime

from sqlalchemy import and_, select, update
from sqlalchemy.exc import IntegrityError

from insaon.adapters.storage.database import SessionFactory
from insaon.adapters.storage.models import (
    ProvisionRecord,
    SearchIndexVersionRecord,
    SnapshotApprovalRecord,
    SourceSnapshotRecord,
)
from insaon.domain import DateRange, ParsedDocument, Provision, RawSnapshot


class SnapshotHashMismatchError(ValueError):
    pass


class PromotionRejectedError(ValueError):
    pass


class SourceRegistry:
    def __init__(self, sessions: SessionFactory) -> None:
        self._sessions = sessions

    def add_snapshot(self, snapshot: RawSnapshot) -> bool:
        record = SourceSnapshotRecord(
            snapshot_id=snapshot.snapshot_id,
            source_id=snapshot.source_id,
            official_source_id=snapshot.official_source_id,
            source_url=snapshot.source_url,
            content=snapshot.content,
            content_type=snapshot.content_type,
            content_hash=snapshot.content_hash,
            retrieved_at=snapshot.retrieved_at,
            promulgation_date=snapshot.promulgation_date,
            effective_from=snapshot.effective_from,
            parser_version=snapshot.parser_version,
        )
        try:
            with self._sessions.begin() as session:
                existing = session.scalar(
                    select(SourceSnapshotRecord).where(
                        SourceSnapshotRecord.source_id == snapshot.source_id,
                        SourceSnapshotRecord.content_hash == snapshot.content_hash,
                    )
                )
                if existing is not None:
                    return False
                session.add(record)
        except IntegrityError:
            return False
        return True

    def save_parsed(self, parsed: ParsedDocument) -> None:
        with self._sessions.begin() as session:
            snapshot = session.get(SourceSnapshotRecord, parsed.snapshot.snapshot_id)
            if snapshot is None:
                raise KeyError("snapshot must be registered before parsing")
            existing = session.scalars(
                select(ProvisionRecord).where(
                    ProvisionRecord.snapshot_id == parsed.snapshot.snapshot_id
                )
            ).all()
            if existing:
                return
            for provision in parsed.provisions:
                session.add(
                    ProvisionRecord(
                        provision_id=provision.provision_id,
                        snapshot_id=parsed.snapshot.snapshot_id,
                        source_id=provision.source_id,
                        article_path=provision.article_path,
                        title=provision.title,
                        text=provision.text,
                        parent_provision_id=provision.parent_provision_id,
                        proviso_text=provision.proviso_text,
                        effective_from=provision.valid_time.start,
                        effective_to=provision.valid_time.end,
                        applies_to="|".join(sorted(provision.applies_to)),
                        topic_tags="|".join(sorted(provision.topic_tags)),
                        relation_ids="|".join(provision.relation_ids),
                        source_hash=provision.source_hash,
                    )
                )
            snapshot.quality_passed = parsed.quality_passed

    def approve_snapshot(
        self,
        snapshot_id: str,
        reviewer_id: str,
        expected_hash: str,
        approved_at: datetime | None = None,
    ) -> None:
        with self._sessions.begin() as session:
            snapshot = session.get(SourceSnapshotRecord, snapshot_id)
            if snapshot is None:
                raise KeyError(snapshot_id)
            if snapshot.content_hash != expected_hash:
                raise SnapshotHashMismatchError("snapshot hash changed before approval")
            if not snapshot.quality_passed:
                raise PromotionRejectedError("quality checks must pass before approval")
            snapshot.approved = True
            session.add(
                SnapshotApprovalRecord(
                    snapshot_id=snapshot_id,
                    reviewer_id=reviewer_id,
                    expected_hash=expected_hash,
                    approved_at=approved_at or datetime.now(UTC),
                )
            )

    def promote_snapshot(
        self,
        snapshot_id: str,
        reviewer_id: str,
        expected_hash: str,
        now: datetime | None = None,
        regression_passed: bool = True,
    ) -> str:
        if not regression_passed:
            raise PromotionRejectedError("regression checks failed; active index preserved")
        created_at = now or datetime.now(UTC)
        with self._sessions.begin() as session:
            snapshot = session.get(SourceSnapshotRecord, snapshot_id)
            approval = session.scalar(
                select(SnapshotApprovalRecord).where(
                    SnapshotApprovalRecord.snapshot_id == snapshot_id,
                    SnapshotApprovalRecord.reviewer_id == reviewer_id,
                )
            )
            if snapshot is None or approval is None or not snapshot.approved:
                raise PromotionRejectedError("manual approval is required")
            if snapshot.content_hash != expected_hash or approval.expected_hash != expected_hash:
                raise SnapshotHashMismatchError("approved hash does not match")
            if not snapshot.quality_passed:
                raise PromotionRejectedError("quality checks failed")
            provision_count = len(
                session.scalars(
                    select(ProvisionRecord).where(ProvisionRecord.snapshot_id == snapshot_id)
                ).all()
            )
            if provision_count == 0:
                raise PromotionRejectedError("parsed provisions are required")
            manifest = hashlib.sha256(
                f"{snapshot_id}:{expected_hash}:{provision_count}".encode()
            ).hexdigest()
            version_id = f"IDX-{snapshot_id}-{manifest[:12]}"
            session.execute(update(SearchIndexVersionRecord).values(active=False))
            session.add(
                SearchIndexVersionRecord(
                    version_id=version_id,
                    snapshot_id=snapshot_id,
                    created_at=created_at,
                    active=True,
                    manifest_hash=manifest,
                )
            )
            return version_id

    def active_index_version(self) -> str | None:
        with self._sessions.read() as session:
            record = session.scalar(
                select(SearchIndexVersionRecord).where(SearchIndexVersionRecord.active.is_(True))
            )
            return record.version_id if record else None

    def effective_provisions(self, reference_date: date, subject: str) -> tuple[Provision, ...]:
        with self._sessions.read() as session:
            active = session.scalar(
                select(SearchIndexVersionRecord).where(SearchIndexVersionRecord.active.is_(True))
            )
            if active is None:
                return ()
            rows = session.scalars(
                select(ProvisionRecord).where(
                    ProvisionRecord.snapshot_id == active.snapshot_id,
                    ProvisionRecord.effective_from <= reference_date,
                    and_(
                        ProvisionRecord.effective_to.is_(None)
                        | (ProvisionRecord.effective_to > reference_date)
                    ),
                )
            ).all()
        return tuple(
            self._to_domain(row)
            for row in rows
            if subject in set(filter(None, row.applies_to.split("|")))
        )

    def get_provision(self, provision_id: str) -> Provision | None:
        with self._sessions.read() as session:
            active = session.scalar(
                select(SearchIndexVersionRecord).where(SearchIndexVersionRecord.active.is_(True))
            )
            if active is None:
                return None
            row = session.scalar(
                select(ProvisionRecord).where(
                    ProvisionRecord.snapshot_id == active.snapshot_id,
                    ProvisionRecord.provision_id == provision_id,
                )
            )
            return self._to_domain(row) if row else None

    def relations_for(self, provision_id: str) -> tuple[str, ...]:
        provision = self.get_provision(provision_id)
        return provision.relation_ids if provision else ()

    @staticmethod
    def _to_domain(row: ProvisionRecord) -> Provision:
        return Provision(
            provision_id=row.provision_id,
            source_id=row.source_id,
            article_path=row.article_path,
            title=row.title,
            text=row.text,
            valid_time=DateRange(row.effective_from, row.effective_to),
            applies_to=frozenset(filter(None, row.applies_to.split("|"))),
            topic_tags=frozenset(filter(None, row.topic_tags.split("|"))),
            parent_provision_id=row.parent_provision_id,
            proviso_text=row.proviso_text,
            relation_ids=tuple(filter(None, row.relation_ids.split("|"))),
            source_hash=row.source_hash,
        )
