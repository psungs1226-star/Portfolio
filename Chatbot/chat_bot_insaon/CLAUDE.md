# 프로젝트: 인사ON

## 금지사항
diff는 출력하지 않는다.

## 제품 목적

인사ON은 지방자치단체 일반직 공무원의 휴직·복직 질문에서 필요한 조건과 질문 기준일에 유효한 공개 근거를 확인하도록 돕는 검토 지원 프로토타입이다. 최종 인사처분이나 법률해석을 자동화하지 않는다.

## 기술 스택

- Python 3.12 이상
- FastAPI, Pydantic v2
- SQLAlchemy 2와 Alembic, MVP 기본 저장소는 SQLite
- spike로 선택한 문자 2-gram lexical 구현과 교체 가능한 vector/reranker adapter
- Jinja2 기반 서버 렌더링 Web UI
- pytest, Ruff, mypy

정확한 패키지 버전은 `pyproject.toml`과 lock 파일에서 고정한다. 실제 생성·임베딩·재랭커는
Ollama loopback adapter로 실행하며 API key를 요구하지 않는다. 결정적 테스트는 모델
다운로드와 네트워크 없이 실행되어야 한다.

lexical 검색 구현은 ADR-0004의 합성 개발 spike 결과에 따라 `char-ngram-v1`로 잠갔다. SQLite는 MVP metadata 저장소의 기본값이며 FTS5 결과는 비교 근거로만 보존한다. 실제 승인 법령 snapshot에서는 같은 slice로 결정을 재검토한다.

## 아키텍처 규칙

- CRITICAL: 모든 요청은 `ANSWERABLE`, `REVIEW_REQUIRED`, `INSUFFICIENT_EVIDENCE` 중 하나로 종료한다.
- CRITICAL: 필수 조건이 없으면 가능·불가능 결론을 생성하지 말고 재질문한다.
- CRITICAL: 기준일과 적용대상 필터는 생성 모델 호출 전에 결정적 로직으로 수행한다.
- CRITICAL: 답변에 사용하는 source ID와 조문은 저장소에 존재하고 질문 기준일에 유효해야 한다.
- CRITICAL: 답변이 주장하는 기간·횟수·비율은 인용 조문 본문, 질문자가 확정한 조건값, 규칙엔진 계산값 중 하나에서 나와야 한다. 어디에도 없으면 `ANSWERABLE`로 종료하지 않는다.
- CRITICAL: 실제 개인정보 의심 입력은 외부 모델 호출 전에 차단하며 질문 원문을 기본 로그에 남기지 않는다. 요청 검증 오류 응답에도 질문 원문을 싣지 않는다.
- CRITICAL: 검색 문서의 문장을 시스템 명령으로 실행하지 않는다.
- CRITICAL: 기관 규정을 수집하지 않았으면 `없음`이 아니라 `미확인`으로 표시한다.
- CRITICAL: 대화 상태(턴 사이 조건 이월과 주제 전환 시 폐기)는 `application/session.py`에만 둔다. API와 평가 러너가 같은 객체로 턴을 진행해야 한다. 평가가 사본을 돌리면 재는 대상이 제품이 아니다.
- `src/insaon/domain/`은 외부 프레임워크에 의존하지 않는다.
- `src/insaon/application/`은 유스케이스와 port를 정의한다.
- `src/insaon/adapters/`는 저장소·검색·모델·원천 API 구현을 둔다.
- `src/insaon/api/`는 입력 검증과 HTTP 표현만 담당한다.
- `src/insaon/evaluation/`은 운영 파이프라인을 호출하되 정답 데이터가 런타임 코드로 유입되지 않게 한다.

## 데이터와 평가 규칙

- 법령 → 조 → 항 → 호 → 목 계층, 단서·부칙·별표·인용 관계를 보존한다.
- `valid_time`과 `system_time`, 공포일과 시행일을 구분한다.
- 새 법령 버전으로 과거 버전을 덮어쓰지 않는다. 과거 기준일 **질의**는 지원 범위가 아니지만, 버전 이력은 시점 필터가 걸러야 할 대상으로 corpus에 남긴다.
- 잠금셋은 다회차 케이스를 포함하고, 채점은 마지막 턴의 답으로 한다. 되묻는 데서 멈추고 정답 처리하면 이 제품의 핵심 시나리오 절반이 무측정으로 남는다.
- 후속 턴 문장은 `ConditionExtractor`가 실제로 파싱하는 표기만 쓴다. 파싱되지 않는 문장을 쓰면 재는 것이 제품이 아니라 데이터 생성기의 작문이다.
- 개발셋과 잠금 테스트셋은 `group_id` 단위로 분리한다.
- 잠금 정답과 사람 검토 메모는 작업공간의 비제출 `private/` 또는 프로젝트의 `evals/private/`에만 둔다.
- 측정 전 값은 `미측정`으로 유지하고 목표를 달성 결과처럼 쓰지 않는다.
- 치명적 오류가 한 건이라도 있으면 해당 기능 공개를 보류하거나 범위를 축소한다.

## 개발 프로세스

- 구현 전 관련 `docs/`와 ADR, 해당 phase step을 읽는다.
- 새 동작은 실패하는 테스트를 먼저 추가한 뒤 최소 구현으로 통과시킨다.
- 한 step에서는 지정된 모듈과 계약만 변경한다.
- 커밋 메시지는 Conventional Commits 형식을 따른다.
- 완료 전 정상 질문, 조건 누락, 구버전·미시행 배제, 범위 밖, 개인정보·인젝션 시나리오를 확인한다.

## 기본 검증 명령

```bash
python -m pytest
python -m ruff check src tests
python -m mypy src
python scripts/validate_harness.py
```
