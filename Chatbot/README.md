# 🤖 인사 규정 AI 포트폴리오

사내 규정과 업무 데이터를 활용한 챗봇을 만들기 전에, 공개된 공무원 인사 법령으로 검색·근거·안전 구조를 선행 검증하고 이를 범용 PDF-to-Bot MCP로 확장한 프로젝트입니다.

```text
사내 데이터 챗봇 수요
   ↓ 실제 내부자료 대신 공개 법령으로 선행 검증
인사ON — 도메인 특화 RAG와 안전장치
   ↓ PDF 검색 계층 범용화
PDF 규정 챗봇 MCP — PDF-to-Bot 초안
```

## 🚀 Projects

### 🛡️ [chat_bot_insaon](chat_bot_insaon/) — 인사ON

기업 내부 인사규정 챗봇이 마주칠 문제를 먼저 검증하기 위해, 공개된 공무원 인사 법령을 대체 corpus로 사용한 규정 검토 챗봇.

- 조건 추출 → 시점 필터 → hybrid 검색(char-ngram + vector + RRF) → reranking → 인용 검증
- 필수 조건 누락 시 결론 대신 재질문, 근거 없으면 `INSUFFICIENT_EVIDENCE`로 종료
- Ollama 로컬 모델(`qwen3:4b-instruct`) 기반, API 키 불필요
- 평가 프레임워크 내장: B0~H3 ablation, distractor corpus, 잠금 테스트셋

```bash
cd chat_bot_insaon
python -m venv .venv && .venv/bin/pip install -r requirements-dev.lock
.venv/bin/pip install -e . --no-deps
.venv/bin/python scripts/preview_dashboard.py      # offline 프로필, 모델 불필요
```

### 🔌 [pdf_chatbot_mcp](pdf_chatbot_mcp/) — PDF 규정 챗봇

인사ON에서 검증한 PDF 추출·청킹·검색·출처 반환 계층을 범용화한 **PDF-to-Bot 초안**.
PDF를 넣으면 Claude Code가 관련 문서를 검색할 수 있는 MCP 도구와 웹 챗봇 인터페이스를 제공한다.

- PDF 텍스트 추출 → 문자 2-gram 인덱싱 → 코사인 유사도 검색 → Ollama 답변 생성
- 웹 채팅 UI(FastAPI + Jinja2)와 MCP 서버 두 가지 인터페이스
- 공개 인사규정 3건 테스트: Precision@3 = 10/10 (100%)

```bash
cd pdf_chatbot_mcp
python -m venv .venv
.venv/bin/python -m pip install -e .
cp 회사_인사규정.pdf documents/
.venv/bin/python run.py --profile local             # Ollama 필요
```

Claude Code 연결은 프로젝트 루트의 `.mcp.json`을 사용하며, `search_documents`를 주요 도구로 노출한다. MCP Inspector stdio 연결·도구 노출·호출 검증과 `top_k` 1~20 입력 제한 테스트가 포함되어 있다.

## 두 프로젝트의 관계

| | chat_bot_insaon | pdf_chatbot_mcp |
|---|---|---|
| 목적 | 도메인 특화 검토 지원 | 범용 PDF 질의응답 |
| 검색 | hybrid(lexical + vector + RRF + reranker) | char-ngram lexical |
| 도메인 로직 | 조건 추출, 시점 필터, 규칙 엔진 | 없음 |
| 인터페이스 | 웹 대시보드 | 웹 챗봇 + MCP 서버 |
| 평가 | ablation 프레임워크, 잠금 테스트셋 | Precision@3 수동 측정 |
| 모델 | qwen3:4b-instruct, bge-m3 | qwen3:4b-instruct |

`pdf_chatbot_mcp`는 별도 실험이 아니라 `chat_bot_insaon`의 검색 계층을 떼어내, 다른 사내 PDF 문서에도 적용할 수 있도록 재사용 가능한 MCP 인터페이스로 확장한 결과물이다.

## 기술 스택

Python 3.12+ · FastAPI · Pydantic v2 · Ollama(qwen3:4b-instruct, bge-m3) · SQLite · MCP SDK · pytest
