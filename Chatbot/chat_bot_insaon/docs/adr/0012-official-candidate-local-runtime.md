# ADR-0012: 제품 local RAG는 공식 candidate만 사용하고 승인 전 답변을 제한한다

## Context

Phase 06은 Qwen3 4B 생성·재랭킹과 BGE-M3 임베딩의 연결을 검증하기 위해 합성 CASE-B를 사용했다. 이 smoke를 그대로 제품 화면에 연결하면 로컬 모델은 실제로 실행되더라도 사용자가 보는 법령 근거는 합성 문서가 된다. 또한 2024년 질문을 현행 원문만으로 처리하면 기준일 효력 검증 계약을 충족할 수 없다.

공식 공개 원문을 자동 수집·파싱할 수는 있지만 candidate는 아직 독립 사람 승인을 받지 않았다. 제품 데모에서 공식 candidate를 전혀 쓰지 않는 것도, 승인 전 candidate를 확정 답변으로 쓰는 것도 적절하지 않다.

## Options

1. 제품 local RAG도 합성 corpus를 사용하고 공식 원문은 별도 보고서에서만 보여준다.
2. 승인 전 공식 candidate를 제품에 연결하고 모든 검증 통과 답변을 `ANSWERABLE`로 표시한다.
3. 제품 local RAG는 공식 candidate만 사용하되, 사람 승인 전에는 결정적 gate가 `REVIEW_REQUIRED`로 제한한다.

## Decision

옵션 3을 선택한다.

- `local` profile은 비제출 공식 candidate의 `deep_review` 조문만 사용한다.
- 공식 candidate 부재나 registry mismatch를 합성 fallback으로 숨기지 않는다. launcher가 재수집하거나 명시적 기동 오류로 종료한다.
- 합성 corpus는 `offline` 시스템 회귀와 adapter 단위 smoke에만 남긴다.
- 2024년 CASE-B에 필요한 지방공무원법·임용령·인사운영지침 과거 버전을 별도 source ID와 `effective_to`로 보존한다.
- 검색 전 효력·대상 필터, 생성 후 source·조문·claim citation 검증을 결정적 코드로 수행한다.
- 미승인 공식 candidate에서 나온 결과는 모델 권고와 무관하게 `candidate_corpus_unapproved` 사유의 `REVIEW_REQUIRED`로 제한한다.
- UI는 공식 자료명, 조문, 원문 URL, 효력기간, 짧은 발췌와 승인 대기 상태를 함께 보여준다.
- Ollama는 loopback에서만 실행하며 API key와 외부 추론 endpoint를 사용하지 않는다.

## Consequences

- 사용자가 제품 화면에서 합성 조문을 실제 근거로 오인하지 않는다.
- CASE-B로 로컬 모델·임베딩·재랭킹·공식 과거 조문·인용 gate의 전체 연결을 재현할 수 있다.
- 자동 구조감사 통과와 법률 정답성·사람 승인을 명확히 분리한다.
- 최초 실행에서 공식 본문을 수집·파싱하고 전체 심층 lane을 임베딩해야 하므로 준비 시간이 늘어난다. 동일 모델·원문·문서 ID의 비제출 vector cache로 다음 시작 비용을 제한한다.
- 사람 승인 전 공개 데모의 정상 경로도 `REVIEW_REQUIRED`로 끝나므로, 화면은 이것이 시스템 실패가 아니라 안전 gate의 결과임을 설명해야 한다.
- ADR-0013부터 제품 vector는 lexical shortlist가 아니라 심층 lane 전체를 사용한다. 이 변경은
  시점 필터 전 top-k 유실 회귀와 cache 무결성 검사와 함께 적용됐다.

## Revisit

- 독립 검토자가 source hash·조문 계층·단서·부칙과 핵심 CASE를 승인했을 때
- 승인된 versioned index와 독립 법령 holdout이 준비됐을 때
- local inference 외 배포 형태를 검토할 때
