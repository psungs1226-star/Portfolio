"""Launch the PDF chatbot server."""

from __future__ import annotations

import argparse
import os
import sys
import threading
import webbrowser
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="PDF 규정 챗봇")
    parser.add_argument(
        "--profile", choices=["offline", "local"], default="offline",
        help="offline: 검색 결과만 표시 / local: Ollama로 답변 생성",
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()

    docs_dir = Path(__file__).parent / "documents"
    docs_dir.mkdir(exist_ok=True)
    pdf_count = len(list(docs_dir.glob("*.pdf")))

    if pdf_count == 0:
        print(f"documents/ 폴더에 PDF 파일을 넣어 주세요: {docs_dir}")
        sys.exit(1)

    print(f"프로필: {args.profile}")
    print(f"문서: {pdf_count}개 PDF")

    if args.profile == "local":
        from ollama import OllamaClient

        if not OllamaClient().is_available():
            print("\nOllama 서버에 연결할 수 없습니다.")
            print("  1. ollama serve")
            print("  2. ollama pull qwen3:4b-instruct")
            sys.exit(3)
        print("Ollama 연결 확인")

    os.environ["PDF_CHATBOT_PROFILE"] = args.profile

    if not args.no_open:
        def _open() -> None:
            import time
            time.sleep(1.0)
            webbrowser.open(f"http://{args.host}:{args.port}")
        threading.Thread(target=_open, daemon=True).start()

    import uvicorn
    uvicorn.run("app:create_app", host=args.host, port=args.port, factory=True)


if __name__ == "__main__":
    main()
