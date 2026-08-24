"""SQLAlchemy persistence records for immutable source snapshots and index promotion."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SourceSnapshotRecord(Base):
    __tablename__ = "source_snapshots"
    __table_args__ = (
        UniqueConstraint("source_id", "content_hash", name="uq_snapshot_source_hash"),
    )

    snapshot_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(128), index=True)
    official_source_id: Mapped[str] = mapped_column(String(128))
    source_url: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    content_type: Mapped[str] = mapped_column(String(100))
    content_hash: Mapped[str] = mapped_column(String(64))
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    promulgation_date: Mapped[date] = mapped_column(Date)
    effective_from: Mapped[date] = mapped_column(Date)
    parser_version: Mapped[str] = mapped_column(String(32))
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    quality_passed: Mapped[bool] = mapped_column(Boolean, default=False)


class ProvisionRecord(Base):
    __tablename__ = "provisions"

    row_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provision_id: Mapped[str] = mapped_column(String(160), index=True)
    snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("source_snapshots.snapshot_id"), index=True
    )
    source_id: Mapped[str] = mapped_column(String(128), index=True)
    article_path: Mapped[str] = mapped_column(String(160))
    title: Mapped[str] = mapped_column(String(300))
    text: Mapped[str] = mapped_column(Text)
    parent_provision_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    proviso_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    effective_from: Mapped[date] = mapped_column(Date, index=True)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    applies_to: Mapped[str] = mapped_column(Text)
    topic_tags: Mapped[str] = mapped_column(Text)
    relation_ids: Mapped[str] = mapped_column(Text, default="")
    source_hash: Mapped[str] = mapped_column(String(64))


class SnapshotApprovalRecord(Base):
    __tablename__ = "snapshot_approvals"

    approval_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("source_snapshots.snapshot_id"), unique=True
    )
    reviewer_id: Mapped[str] = mapped_column(String(128))
    expected_hash: Mapped[str] = mapped_column(String(64))
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SearchIndexVersionRecord(Base):
    __tablename__ = "search_index_versions"

    version_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("source_snapshots.snapshot_id"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    manifest_hash: Mapped[str] = mapped_column(String(64))
