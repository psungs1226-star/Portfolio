import hashlib
import json
from pathlib import Path

import httpx

from insaon.adapters.source import OfficialSourceCollector, OfficialSourceRegistry

ROOT = Path(__file__).resolve().parents[2]


def test_official_ingestion_is_immutable_and_idempotent(tmp_path: Path) -> None:
    registry = OfficialSourceRegistry.from_toml(
        ROOT / "configs/sources/official-mvp.toml"
    )
    source = registry.get("LAW-LOCAL-OFFICIAL")
    content = (
        "<html><body>지방공무원법 <span>제63조(휴직)</span>"
        "<p>official metadata snapshot</p></body></html>"
    ).encode()

    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == source.url
        return httpx.Response(200, headers={"content-type": "text/html;charset=UTF-8"}, content=content)

    collector = OfficialSourceCollector(
        registry,
        transport=httpx.MockTransport(handler),
    )
    first = collector.collect(source.source_id, tmp_path)
    second = collector.collect(source.source_id, tmp_path)

    assert first.content_hash == hashlib.sha256(content).hexdigest()
    assert second.content_hash == first.content_hash
    assert first.relative_path == second.relative_path
    assert (tmp_path / first.relative_path).read_bytes() == content
    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert len(manifest["snapshots"]) == 1
    assert "content" not in manifest["snapshots"][0]


def test_changed_content_creates_a_new_snapshot(tmp_path: Path) -> None:
    registry = OfficialSourceRegistry.from_toml(
        ROOT / "configs/sources/official-mvp.toml"
    )
    source = registry.get("LAW-LOCAL-OFFICIAL")
    calls = 0

    def handler(_request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        body = f"지방공무원법 제63조(휴직) version-{calls}".encode()
        return httpx.Response(200, headers={"content-type": "text/html"}, content=body)

    collector = OfficialSourceCollector(registry, transport=httpx.MockTransport(handler))
    collector.collect(source.source_id, tmp_path)
    collector.collect(source.source_id, tmp_path)

    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert len(manifest["snapshots"]) == 2
    assert len({item["content_hash"] for item in manifest["snapshots"]}) == 2
