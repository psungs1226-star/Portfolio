# Local model integration review

검토일: 2026-08-03  
대상: Harness `06-local-model-integration`, `12-official-local-rag`

> 이 문서는 Phase 12 당시의 실행 기록이다. Phase 13에서는 lexical shortlist를 제거하고
> 심층 lane 전체 vector와 versioned private cache를 적용했으며, 생성 계약은
> `answer-v7-derived-allowance`로 갱신했다. 현재 PAY-01 결과는
> `derived-allowance-review.md`를 기준으로 확인한다.

## 판정

**official local model integration candidate: 통과**

실제 다운로드된 모델 artifact와 비제출 공식 candidate로 CASE-B의
embedding→reranker→generation→citation 검증 경로를 실행했다. API key와 외부 추론
egress는 사용하지 않았다. 이 판정은 로컬
통합 재현성에 한정하며 공식 법령 정확도나 실무 효과를 뜻하지 않는다.

## 실행 구성

| 역할 | runtime | artifact |
|---|---|---|
| Generation | Ollama 0.32.5 · `qwen3:4b-instruct` · Q4_K_M | `sha256:0edcdef34593…168ba0` |
| Embedding | Ollama 0.32.5 · `bge-m3:latest` · 1024차원 | `sha256:790764642607…146bab` |
| Reranker | Ollama 0.32.5 · `qwen3:4b-instruct` · structured JSON | generation과 동일 |
| 경계 | `http://127.0.0.1:11434/api` exact allowlist · `OLLAMA_NO_CLOUD=1` | API key 불필요 |

전체 digest는 `artifacts/provider/local-smoke.json`에 보존한다. 모델 파일은 공개
저장소에 포함하지 않는다.

## 증거

| 검증 | 결과 |
|---|---|
| 실제 generation smoke | 통과 |
| 실제 embedding smoke | 통과 |
| 실제 reranker smoke | 통과 |
| 실제 CASE-B local RAG E2E | 통과 |
| CASE-B 공식 citation | 10/10 |
| CASE-B 합성 citation | 0/10 |
| 기준일·상태 | 2024-01-01 · `REVIEW_REQUIRED` · `candidate_corpus_unapproved` |
| CASE-A/C/PII request-time 모델 호출 | 0 |
| citation allowlist·후보 집합·dimension drift | contract test 통과 |
| 전체 pytest | 최신 전체 회귀에서 확인 |
| Ruff·mypy·Harness validator | 최신 정적 검사에서 확인 |

단일 CASE-B manifest에서 embedding 4,630.164ms, reranker 27,501.641ms, generation
29,422.223ms가 기록됐다. 15개 본문 전체를 매번 임베딩하지 않고 lexical shortlist를
로컬 임베딩·재랭킹 대상으로 사용했다. 반복 측정이 아니므로 P50/P95 또는 일반 성능으로 해석하지 않는다.
API 호출 비용은 없지만 로컬 compute·전력 비용은 측정하지 않았다.

## 남은 gate

- 공식 승인 법령 snapshot과 사람이 승인한 versioned index
- 독립 검토 locked legal set의 B0~H3 비교
- 치명적 오류 0을 요구하는 legal release gate
- 실제 배포와 합성 shadow usability

따라서 Phase 06의 adapter 통합과 Phase 12의 official-only local 제품 경로는 완료다.
Phase 07의 사람 승인에서 blocked이며 Phase 08~09도 선행 증거 부재로 blocked다. local smoke의
성공을 법률 정답성, 최신 법령 보장 또는 실제 업무효과로 승격하지 않는다.
