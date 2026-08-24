from pathlib import Path

import pytest

from insaon.adapters.source import OfficialSourceRegistry, SourceContractError

ROOT = Path(__file__).resolve().parents[2]


def test_official_source_manifest_is_complete_and_keyless() -> None:
    registry = OfficialSourceRegistry.from_toml(
        ROOT / "configs/sources/official-mvp.toml"
    )

    assert {source.source_id for source in registry.sources} == {
        "LAW-LOCAL-OFFICIAL",
        "DECREE-LOCAL-APPOINTMENT-OFFICIAL",
        "RULE-LOCAL-HR-GUIDE-OFFICIAL",
        "MANUAL-LOCAL-HR-OFFICIAL",
    }
    assert all(source.url.startswith("https://") for source in registry.sources)
    assert all(source.auth_mode == "none" for source in registry.sources)
    assert all(source.promulgation_date is not None for source in registry.sources)
    assert all(source.effective_from is not None for source in registry.sources)


def test_wide_hr_source_manifest_covers_the_public_personnel_lifecycle() -> None:
    registry = OfficialSourceRegistry.from_toml(
        ROOT / "configs/sources/official-hr-wide.toml"
    )

    assert len(registry.sources) == 17
    assert {topic for source in registry.sources for topic in source.topic_domains} >= {
        "appointment",
        "personnel_records",
        "performance_and_promotion",
        "service_and_leave",
        "pay_and_allowance",
        "discipline_and_appeal",
        "training",
        "retirement",
    }
    assert {source.review_tier for source in registry.sources} == {
        "deep_review",
        "evidence_only",
        "metadata_only",
    }
    assert all(source.auth_mode == "none" for source in registry.sources)
    assert all(source.allowed_host in {"www.law.go.kr", "www.data.go.kr"} for source in registry.sources)
    historical = {
        source.source_id: source
        for source in registry.sources
        if source.effective_to is not None
    }
    assert set(historical) == {
        "LAW-LOCAL-OFFICIAL-20221227",
        "DECREE-LOCAL-APPOINTMENT-OFFICIAL-20230613",
        "RULE-LOCAL-HR-GUIDE-OFFICIAL-20231228",
        "DECREE-LOCAL-PAY-20260701-OFFICIAL",
    }
    assert all(source.effective_from < source.effective_to for source in historical.values())


def test_source_contract_accepts_ministry_rule_and_rejects_unknown_review_tier(
    tmp_path: Path,
) -> None:
    valid = tmp_path / "ministry-rule.toml"
    valid.write_text(
        """
schema_version = "0.2.0"

[[sources]]
source_id = "RULE"
source_name = "규칙"
source_type = "ministry_rule"
issuer = "행정안전부"
official_source_id = "lsId:1"
url = "https://www.law.go.kr/LSW/lsInfoR.do?lsId=1"
allowed_host = "www.law.go.kr"
content_types = ["text/html"]
max_bytes = 1000
timeout_seconds = 1
retries = 0
auth_mode = "none"
expected_marker = "규칙"
promulgation_date = "2026-01-01"
effective_from = "2026-01-01"
effective_to = "2027-01-01"
redistribution = "private_snapshot_public_metadata_only"
collector_format = "html"
topic_domains = ["personnel_records"]
review_tier = "evidence_only"
""",
        encoding="utf-8",
    )

    registry = OfficialSourceRegistry.from_toml(valid)
    assert registry.sources[0].source_type == "ministry_rule"
    assert registry.sources[0].topic_domains == ("personnel_records",)
    assert registry.sources[0].effective_to.isoformat() == "2027-01-01"

    invalid = tmp_path / "bad-tier.toml"
    invalid.write_text(
        valid.read_text(encoding="utf-8").replace(
            'review_tier = "evidence_only"', 'review_tier = "auto_decision"'
        ),
        encoding="utf-8",
    )
    with pytest.raises(SourceContractError, match="unsupported review tier"):
        OfficialSourceRegistry.from_toml(invalid)


def test_manifest_rejects_credentials_and_unknown_fields(tmp_path: Path) -> None:
    path = tmp_path / "bad.toml"
    path.write_text(
        """
schema_version = "0.1.0"

[[sources]]
source_id = "BAD"
source_name = "bad"
source_type = "law"
issuer = "bad"
official_source_id = "bad"
url = "https://www.law.go.kr/LSW/bad"
allowed_host = "www.law.go.kr"
content_types = ["text/html"]
max_bytes = 100
timeout_seconds = 1
retries = 0
auth_mode = "none"
expected_marker = "bad"
promulgation_date = "2026-01-01"
effective_from = "2026-01-01"
api_key = "must-not-be-here"
""",
        encoding="utf-8",
    )

    with pytest.raises(SourceContractError, match="unknown source fields"):
        OfficialSourceRegistry.from_toml(path)
