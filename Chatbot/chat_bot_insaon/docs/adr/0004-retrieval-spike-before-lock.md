# ADR-0004: 한국어 법령 검색 spike 뒤 lexical 구현 확정

## Context

SQLite FTS5는 배포가 단순하지만 기본 tokenizer가 한국어 법령의 띄어쓰기 변형, 복합어와 조문 표현에서 충분한 검색 품질을 내는지는 인사ON 데이터로 확인되지 않았다. 구현 전에 특정 검색 기술을 고정하면 B0 기준선이 약해지거나 불필요한 인프라를 선택할 수 있다.

## Options

1. SQLite FTS5 기본 tokenizer를 바로 확정
2. 형태소 분석 기반 검색 엔진을 바로 확정
3. 동일한 공개 sample·query·top-k에서 최소 두 lexical 후보를 spike한 뒤 선택

## Decision

3번을 선택한다. `02-retrieval-spike/step0`에서 조문번호, 법률 용어, 띄어쓰기 변형과 단서 검색 slice를 비교한다. 선택 전에는 SQLite를 metadata 저장소로만 확정하고 lexical 구현은 provisional로 둔다.

선택 기준은 다음을 별도 표로 본다.

- Set Recall@5와 MRR@10
- 결정적 예외·단서 회수
- index 생성 시간과 크기
- 로컬 재현성, 설치·운영 복잡도

단일 가중 종합점수는 사용하지 않는다. spike 결과, 환경과 한계를 ADR에 추가한 뒤 구현을 잠근다.

### 2026-07-29 spike 결과와 구현 잠금

`insaon-synthetic-retrieval-spike-v0.1` 개발 전용 합성 corpus에서 SQLite FTS5
`unicode61` 기본 tokenizer와 공백을 제거한 2-gram 문자 검색을 같은 10개 문서,
4개 query, `top_k=5`로 비교했다. 실행 manifest는
`artifacts/spikes/lexical/manifest.json`에 보존한다.

| 후보 | Set Recall@5 | MRR@10 | 선택 |
|---|---:|---:|---|
| SQLite FTS5 기본 | 0.375 | 0.500 |  |
| 문자 2-gram | 1.000 | 1.000 | 선택 |

따라서 MVP의 `LexicalRetriever` 구현은 `char-ngram-v1`로 잠근다. B0의 이름은
평가계획과 호환되도록 BM25 baseline을 유지하지 않고 **B0 lexical**로 해석하며, 공개
비교표에는 실제 구현 ID를 함께 표시한다. 이 결과는 기술 선택용 합성 개발 spike이지
한국어 법령 전체나 잠금 테스트셋의 성능이 아니다. 승인된 실제 공개 법령 snapshot에서
동일 slice를 다시 실행해 선택을 재검토해야 한다.

## Consequences

- foundation 단계의 기술 과잉 확정을 피한다.
- 검색 phase에 짧은 spike 비용이 추가된다.
- spike sample은 기술 선택용 개발 자료이며 holdout 성능으로 발표하지 않는다.
- 선택된 구현은 `LexicalRetriever` port 뒤에 있어 후속 교체가 가능하다.
- SQLite는 metadata 저장소로 유지하며 FTS5 결과도 비교 근거로 보존한다.

## Revisit

승인된 법령 snapshot 규모가 크게 변하거나, 형태소 사전 유지비가 검색 개선보다 커지거나, 새 후보가 결정적 예외 회수를 유의하게 개선할 때 재실행한다.
