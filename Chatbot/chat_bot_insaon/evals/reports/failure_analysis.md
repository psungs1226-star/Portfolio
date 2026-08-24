# 실패 분석

- 평가셋: `insaon-synthetic-system-regression@0.4.0` · 70건
- 관측된 오류 유형: 5종

합성 회귀 실행의 case-level 기록은 비제출 영역에 보존한다. 공개 문서에는 질문 원문, 잠금 정답과 사람 메모를 복사하지 않는다.

## 구성별 오류 유형 분포

각 칸은 해당 유형이 관측된 case 수 / 전체 case 수다. 한 case가 여러 유형에 해당할 수 있으므로 행의 합은 `실패 case`보다 클 수 있다.

| 구성 | RETRIEVAL_MISS | WRONG_VERSION | ADJACENT_TYPE_CONFUSION | MISSING_DECISIVE_EXCEPTION | WRONG_STATUS | 실패 case | 치명적 오류 |
|---|---|---|---|---|---|---|---|
| B0 | 24/70 | 36/70 | 6/70 | 0/70 | 48/70 | 48/70 | 0 |
| B1 | 31/70 | 36/70 | 2/70 | 0/70 | 48/70 | 48/70 | 0 |
| H1 | 27/70 | 36/70 | 2/70 | 0/70 | 48/70 | 48/70 | 0 |
| H2 | 0/70 | 0/70 | 23/70 | 8/70 | 4/70 | 29/70 | 8 |
| H3 | 2/70 | 0/70 | 17/70 | 0/70 | 4/70 | 21/70 | 0 |
| H4 | 2/70 | 0/70 | 17/70 | 0/70 | 4/70 | 21/70 | 0 |

관측되지 않아 표에서 제외한 유형: `CITATION_INCOMPLETE`, `RISKY_ANSWER`. 0건이며 지어내지 않는다.

## 각 단계가 고친 것과 새로 만든 것

직전 구성 대비 증감이다. 어떤 단계도 실패를 일방적으로 줄이지 않는다.

| 전이 | 없앤 유형 | 늘린 유형 |
|---|---|---|
| B0 → B1 | `ADJACENT_TYPE_CONFUSION` 6→2 | `RETRIEVAL_MISS` 24→31 |
| B1 → H1 | `RETRIEVAL_MISS` 31→27 | 없음 |
| H1 → H2 | `RETRIEVAL_MISS` 27→0, `WRONG_VERSION` 36→0, `WRONG_STATUS` 48→4 | `ADJACENT_TYPE_CONFUSION` 2→23, `MISSING_DECISIVE_EXCEPTION` 0→8 |
| H2 → H3 | `ADJACENT_TYPE_CONFUSION` 23→17, `MISSING_DECISIVE_EXCEPTION` 8→0 | `RETRIEVAL_MISS` 0→2 |
| H3 → H4 | 없음 | 없음 |

## 치명적 오류와의 대응

`FATAL_` 접두사는 AGENTS.md의 치명적 오류에만 붙는다. 과거 리포트와 비교 가능하도록 대응 관계를 남긴다.

| 오류 유형 | 치명적 오류 라벨 |
|---|---|
| `RETRIEVAL_MISS` | 해당 없음 |
| `WRONG_VERSION` | `FATAL_INVALID_EFFECTIVE_VERSION` |
| `ADJACENT_TYPE_CONFUSION` | 해당 없음 |
| `MISSING_DECISIVE_EXCEPTION` | `FATAL_MISSING_DECISIVE_EXCEPTION` |
| `CITATION_INCOMPLETE` | 해당 없음 |
| `WRONG_STATUS` | 해당 없음 |
| `RISKY_ANSWER` | `FATAL_OUT_OF_SCOPE_DEFINITE_ANSWER` |

## 공개 가능한 대표 실패

비제출 case-level 결과에서 case ID와 오류 유형만 추출했다. 불리한 구성을 빼지 않는다.

| 구성 | case ID | 오류 유형 |
|---|---|---|
| H2 | `CASE-LOCKED-017` | FATAL_MISSING_DECISIVE_EXCEPTION |
| H2 | `CASE-LOCKED-018` | FATAL_MISSING_DECISIVE_EXCEPTION |
| H2 | `CASE-LOCKED-019` | FATAL_MISSING_DECISIVE_EXCEPTION |
| H2 | `CASE-LOCKED-020` | FATAL_MISSING_DECISIVE_EXCEPTION |
| H2 | `CASE-LOCKED-021` | FATAL_MISSING_DECISIVE_EXCEPTION |
| H2 | `CASE-LOCKED-022` | FATAL_MISSING_DECISIVE_EXCEPTION |
| H2 | `CASE-LOCKED-023` | FATAL_MISSING_DECISIVE_EXCEPTION |
| H2 | `CASE-LOCKED-024` | FATAL_MISSING_DECISIVE_EXCEPTION |
| B0 | `CASE-LOCKED-001` | STATUS_OR_ACTION_MISMATCH (ANSWERABLE/answer → INSUFFICIENT_EVIDENCE/abstain) |
| B0 | `CASE-LOCKED-002` | STATUS_OR_ACTION_MISMATCH (ANSWERABLE/answer → INSUFFICIENT_EVIDENCE/abstain) |

## 현재 한계

- Synthetic system-regression set; not an independently reviewed legal holdout.
- Legal correctness, operational effect and local-model performance remain unmeasured.
- The deterministic offline model does not represent local model variability.
