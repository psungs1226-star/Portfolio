from pathlib import Path

import httpx
import pytest

from insaon.adapters.source import (
    OfficialSourceCollector,
    OfficialSourceRegistry,
    SourceFetchError,
)

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize(
    ("status", "content_type", "body"),
    [
        (302, "text/html", b"redirect"),
        (200, "application/octet-stream", b"wrong type"),
        (200, "text/html", b"missing expected marker"),
    ],
)
def test_invalid_official_response_is_never_promoted(
    tmp_path: Path,
    status: int,
    content_type: str,
    body: bytes,
) -> None:
    registry = OfficialSourceRegistry.from_toml(
        ROOT / "configs/sources/official-mvp.toml"
    )

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, headers={"content-type": content_type}, content=body)

    collector = OfficialSourceCollector(registry, transport=httpx.MockTransport(handler))
    with pytest.raises(SourceFetchError):
        collector.collect("LAW-LOCAL-OFFICIAL", tmp_path)
    assert not (tmp_path / "manifest.json").exists()
