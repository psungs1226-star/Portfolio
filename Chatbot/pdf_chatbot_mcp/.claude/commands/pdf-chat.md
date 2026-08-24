PDF 규정 문서를 검색하고 질문에 답변합니다.

사용 가능한 MCP 도구:
- `search_documents(query, top_k)` — 관련 문서 검색
- `ask_documents(question)` — 검색 + Ollama 자연어 답변 생성

사용자의 질문을 `ask_documents`에 전달하고 결과를 정리해서 답하세요.
Ollama가 연결되지 않으면 `search_documents`로 검색 결과만 보여주세요.

$ARGUMENTS
