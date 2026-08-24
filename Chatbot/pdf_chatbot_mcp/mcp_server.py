"""MCP server exposing PDF document search and Q&A tools for Claude Code."""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Annotated

from mcp.server import MCPServer
from pydantic import Field

from ingest import load_documents
from ollama import OllamaClient
from search import ChunkIndex

DOCS_DIR = Path(os.environ.get("PDF_CHATBOT_DOCS", Path(__file__).parent / "documents"))

_SYSTEM_PROMPT = (
    "당신은 회사 규정 문서를 기반으로 질문에 답하는 도우미입니다.\n"
    "아래 제공된 문서 내용만을 근거로 답변하세요.\n"
    "근거가 없는 내용은 '해당 내용을 문서에서 찾지 못했습니다'라고 답하세요.\n"
    "답변 시 출처(파일명, 페이지)를 함께 안내하세요."
)

mcp = MCPServer(
    name="pdf-chatbot",
    description="PDF 규정 문서 검색 및 질의응답",
)

chunks = load_documents(DOCS_DIR)
index = ChunkIndex(chunks)


@mcp.tool(description="PDF 규정 문서에서 관련 내용을 검색합니다.")
def search_documents(
    query: str,
    top_k: Annotated[
        int,
        Field(
            ge=1,
            le=20,
            description="반환할 검색 결과 수(1~20)",
        ),
    ] = 5,
) -> str:
    results = index.search(query, top_k=top_k)
    if not results or results[0].score < 0.05:
        return "관련 문서를 찾지 못했습니다."
    items = []
    for r in results:
        if r.score < 0.05:
            break
        items.append(
            {
                "file": r.chunk.file_name,
                "page": r.chunk.page,
                "score": round(r.score, 4),
                "text": r.chunk.text[:500],
            }
        )
    return json.dumps(items, ensure_ascii=False, indent=2)


@mcp.tool(description="PDF 규정 문서를 검색하고 Ollama로 자연어 답변을 생성합니다.")
def ask_documents(question: str) -> str:
    results = index.search(question, top_k=5)
    sources = [r for r in results if r.score > 0.05]
    if not sources:
        return "관련 문서를 찾지 못했습니다. 다른 키워드로 질문해 보세요."

    context = "\n\n".join(
        f"[{r.chunk.file_name} p.{r.chunk.page}]\n{r.chunk.text[:500]}"
        for r in sources
    )

    client = OllamaClient()
    if not client.is_available():
        items = [
            f"- [{r.chunk.file_name} p.{r.chunk.page}] {r.chunk.text[:200]}"
            for r in sources
        ]
        return "Ollama 미연결. 검색 결과:\n\n" + "\n".join(items)

    return client.generate(_SYSTEM_PROMPT, f"문서 내용:\n{context}\n\n질문: {question}")


def main() -> None:
    asyncio.run(mcp.run_stdio_async())


if __name__ == "__main__":
    main()
