from pathlib import Path

import pytest

from insaon.adapters.source import OfficialSourceRegistry, SourceContractError

ROOT = Path(__file__).resolve().parents[2]


def test_manifest_rejects_non_https_and_host_mismatch(tmp_path: Path) -> None:
    template = """
schema_version = "0.1.0"

[[sources]]
source_id = "BAD"
source_name = "bad"
source_type = "law"
issuer = "bad"
official_source_id = "bad"
url = "{url}"
allowed_host = "{host}"
content_types = ["text/html"]
max_bytes = 100
timeout_seconds = 1
retries = 0
auth_mode = "none"
expected_marker = "bad"
promulgation_date = "2026-01-01"
effective_from = "2026-01-01"
"""
    for url, host in (
        ("http://www.law.go.kr/LSW/bad", "www.law.go.kr"),
        ("https://evil.invalid/LSW/bad", "www.law.go.kr"),
        ("https://user@example.com/path", "example.com"),
    ):
        path = tmp_path / f"{len(list(tmp_path.iterdir()))}.toml"
        path.write_text(template.format(url=url, host=host), encoding="utf-8")
        with pytest.raises(SourceContractError):
            OfficialSourceRegistry.from_toml(path)


def test_registry_only_resolves_exact_declared_urls() -> None:
    registry = OfficialSourceRegistry.from_toml(
        ROOT / "configs/sources/official-mvp.toml"
    )
    source = registry.get("LAW-LOCAL-OFFICIAL")
    assert registry.require_exact_url(source.url) == source
    with pytest.raises(SourceContractError, match="not declared"):
        registry.require_exact_url(source.url + "&redirect=https://evil.invalid")
