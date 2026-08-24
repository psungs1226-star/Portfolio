"""PDF text extraction and chunking."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import pymupdf as fitz


@dataclass(frozen=True, slots=True)
class Chunk:
    chunk_id: str
    file_name: str
    page: int
    text: str


_MAX_CHUNK = 400
_OVERLAP = 80


def _split_long(text: str) -> list[str]:
    if len(text) <= _MAX_CHUNK:
        return [text]
    sentences = re.split(r"(?<=[.!?。])\s+", text)
    parts: list[str] = []
    buf = ""
    for s in sentences:
        if buf and len(buf) + len(s) > _MAX_CHUNK:
            parts.append(buf.strip())
            tail = buf[-_OVERLAP:] if len(buf) > _OVERLAP else buf
            buf = tail + " " + s
        else:
            buf = (buf + " " + s).strip() if buf else s
    if buf.strip():
        parts.append(buf.strip())
    return parts if parts else [text]


def extract_pdf(path: Path) -> list[Chunk]:
    doc = fitz.open(str(path))
    chunks: list[Chunk] = []
    seq = 0
    for page_num in range(len(doc)):
        text = doc[page_num].get_text().strip()
        if not text:
            continue
        paragraphs = re.split(r"\n{2,}", text)
        for para in paragraphs:
            para = " ".join(para.split())
            if len(para) < 10:
                continue
            for piece in _split_long(para):
                chunks.append(
                    Chunk(
                        chunk_id=f"{path.stem}:p{page_num + 1}:{seq}",
                        file_name=path.name,
                        page=page_num + 1,
                        text=piece,
                    )
                )
                seq += 1
    doc.close()
    return chunks


def load_documents(directory: Path) -> list[Chunk]:
    chunks: list[Chunk] = []
    for pdf_path in sorted(directory.glob("*.pdf")):
        chunks.extend(extract_pdf(pdf_path))
    return chunks
