"""PDF chatbot FastAPI application."""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Literal

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from ingest import load_documents
from ollama import OllamaClient
from search import ChunkIndex

BASE_DIR = Path(__file__).parent
DOCS_DIR = BASE_DIR / "documents"


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class SourceInfo(BaseModel):
    file: str
    page: int
    text: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceInfo]
    session_id: str
    profile: str


_SYSTEM_PROMPT = (
    "당신은 회사 규정 문서를 기반으로 질문에 답하는 도우미입니다.\n"
    "아래 제공된 문서 내용만을 근거로 답변하세요.\n"
    "근거가 없는 내용은 '해당 내용을 문서에서 찾지 못했습니다'라고 답하세요.\n"
    "답변 시 출처(파일명, 페이지)를 함께 안내하세요."
)


def create_app() -> FastAPI:
    profile: Literal["offline", "local"] = (
        "local" if os.environ.get("PDF_CHATBOT_PROFILE") == "local" else "offline"
    )

    app = FastAPI(title="PDF 규정 챗봇")
    templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

    DOCS_DIR.mkdir(exist_ok=True)
    chunks = load_documents(DOCS_DIR)
    index = ChunkIndex(chunks)

    ollama: OllamaClient | None = None
    if profile == "local":
        ollama = OllamaClient()

    @app.get("/", response_class=HTMLResponse)
    async def home(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request,
            "chat.html",
            {"profile": profile, "doc_count": index.count},
        )

    @app.post("/api/chat", response_model=ChatResponse)
    async def chat(req: ChatRequest) -> ChatResponse:
        session_id = req.session_id or str(uuid.uuid4())
        results = index.search(req.message, top_k=5)
        sources = [
            SourceInfo(
                file=r.chunk.file_name,
                page=r.chunk.page,
                text=r.chunk.text[:500],
                score=round(r.score, 4),
            )
            for r in results
            if r.score > 0.05
        ]

        if profile == "local" and ollama and sources:
            context = "\n\n".join(
                f"[{s.file} p.{s.page}]\n{s.text}" for s in sources
            )
            try:
                answer = ollama.generate(
                    _SYSTEM_PROMPT,
                    f"문서 내용:\n{context}\n\n질문: {req.message}",
                )
            except (httpx.HTTPError, KeyError, ValueError):
                answer = "모델 응답을 받지 못했습니다. Ollama 서버를 확인해 주세요."
        elif sources:
            answer = "관련 문서를 찾았습니다. 아래 근거를 확인해 주세요."
        else:
            answer = "관련 문서를 찾지 못했습니다. 다른 키워드로 질문해 보세요."

        return ChatResponse(
            answer=answer,
            sources=sources,
            session_id=session_id,
            profile=profile,
        )

    return app
