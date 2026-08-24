# ADR-0003: Python 모듈러 모놀리스와 교체 가능한 외부 adapter

## Context

인사ON MVP는 2주 안에 법령 데이터, 시간 검색, 조건 확인, 답변 검증, Web UI와 평가를 함께 구현해야 한다. 검색 실험 B0~H3는 동일한 도메인 계약과 fixture를 공유해야 하며, 실제 개인정보나 API 키 없이도 전체 테스트를 재현할 수 있어야 한다.

## Options

1. FastAPI와 별도 JavaScript SPA, 검색·평가 서비스를 각각 배포
2. Python FastAPI 기반 모듈러 모놀리스와 서버 렌더링 UI, 외부 기능은 adapter로 분리
3. 단일 노트북 또는 UI 프레임워크에서 검색·생성·평가를 직접 연결

## Decision

2번을 선택한다.

- Python 3.12 이상, FastAPI, Pydantic v2를 API와 데이터 계약에 사용한다.
- SQLAlchemy 2와 Alembic을 저장소 경계에 사용하고 MVP 기본 저장소는 SQLite로 둔다.
- SQLite를 MVP metadata 저장소 기본값으로 사용한다.
- lexical BM25 구현은 ADR-0004의 한국어 법령 sample spike 뒤에 확정한다.
- lexical, vector, reranker, LLM은 application port 뒤의 adapter로 구현한다.
- Web UI는 FastAPI와 Jinja2 기반 서버 렌더링으로 구현한다.
- 채팅과 검토 대시보드는 같은 Jinja2 shell에서 review API를 호출하고, 공개 상태 집계만 server-side context로 제공한다.
- production CSP를 유지하기 위해 UI 동작과 스타일은 same-origin 정적 자산으로 분리한다.
- pytest, Ruff, mypy를 공통 품질 게이트로 사용한다.
- 패키지 정확 버전은 구현 시 `pyproject.toml`과 lock 파일로 고정한다.

## Consequences

- 한 언어와 한 배포 단위에서 도메인 계약과 평가 코드를 공유해 2주 MVP 복잡도를 낮춘다.
- 오프라인 fake adapter와 실제 로컬 모델 adapter를 같은 contract test로 검증할 수 있다.
- SQLite metadata 저장소는 대규모 운영 동시성에 한계가 있으므로 포트폴리오 프로토타입 범위로 제한한다.
- 별도 SPA보다 UI 상호작용의 자유도는 낮지만 근거 패널과 검토 흐름에는 충분하다.
- 로컬 모델 runtime을 변경해도 domain/application 코드를 변경하지 않아야 한다.

## Revisit

동시 사용자, 원문 규모 또는 기관별 접근통제가 SQLite와 단일 프로세스 범위를 넘거나, 독립 프런트엔드 배포가 실제 사용자 검증에서 필요해지면 PostgreSQL·전용 vector store·별도 Web app 전환을 검토한다.
