from __future__ import annotations

import asyncio
import json

from mcp import Client
from mcp.types import TextContent

import mcp_server
from ingest import Chunk
from search import ChunkIndex


def _text(result) -> str:
    assert result.content
    block = result.content[0]
    assert isinstance(block, TextContent)
    return block.text


def test_tools_are_exposed_with_bounded_top_k() -> None:
    async def check() -> None:
        async with Client(mcp_server.mcp, raise_exceptions=True) as client:
            listed = await client.list_tools()

        assert [tool.name for tool in listed.tools] == [
            "search_documents",
            "ask_documents",
        ]
        search_tool = next(
            tool for tool in listed.tools if tool.name == "search_documents"
        )
        top_k_schema = search_tool.input_schema["properties"]["top_k"]
        assert top_k_schema["minimum"] == 1
        assert top_k_schema["maximum"] == 20
        assert top_k_schema["default"] == 5

    asyncio.run(check())


def test_search_documents_returns_ranked_sources(monkeypatch) -> None:
    chunks = [
        Chunk(
            chunk_id="rules:p1:0",
            file_name="rules.pdf",
            page=1,
            text="연차휴가는 1년간 80퍼센트 이상 출근한 직원에게 부여한다.",
        ),
        Chunk(
            chunk_id="rules:p2:1",
            file_name="rules.pdf",
            page=2,
            text="징계의 종류는 견책, 감봉, 정직 및 해임으로 구분한다.",
        ),
    ]
    monkeypatch.setattr(mcp_server, "index", ChunkIndex(chunks))

    async def check() -> None:
        async with Client(mcp_server.mcp, raise_exceptions=True) as client:
            result = await client.call_tool(
                "search_documents",
                {"query": "연차휴가", "top_k": 1},
            )

        assert result.is_error is False
        payload = json.loads(_text(result))
        assert len(payload) == 1
        assert payload[0]["file"] == "rules.pdf"
        assert payload[0]["page"] == 1

    asyncio.run(check())


def test_search_documents_rejects_out_of_range_top_k() -> None:
    async def check() -> None:
        async with Client(mcp_server.mcp, raise_exceptions=True) as client:
            for invalid in (0, -1, 21):
                result = await client.call_tool(
                    "search_documents",
                    {"query": "연차", "top_k": invalid},
                )
                assert result.is_error is True

    asyncio.run(check())
