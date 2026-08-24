# Architecture Decision Records

| ADR | 결정 |
|---|---|
| [ADR-0001](0001-human-reviewed-support.md) | 최종 자동판정이 아닌 사람 검토 지원 |
| [ADR-0002](0002-temporal-provision-retrieval.md) | 기준일 기반 조문·버전 검색 |
| [ADR-0003](0003-modular-monolith-stack.md) | Python 모듈러 모놀리스와 교체 가능한 외부 adapter |
| [ADR-0004](0004-retrieval-spike-before-lock.md) | 한국어 법령 검색 spike 뒤 lexical 구현 확정 |
| [ADR-0005](0005-synthetic-regression-release-boundary.md) | 합성 시스템 회귀와 독립 법령 검증 release 분리 |
| [ADR-0006](0006-local-model-runtime.md) | 생성·임베딩·재랭킹 전체 로컬 실행과 artifact digest 고정 |
| [ADR-0007](0007-keyless-official-source-candidate.md) | keyless 공식 공개 본문의 current corpus candidate와 사람 승인 경계 |
| [ADR-0008](0008-controlled-pilot-hosting.md) | 단일 VM·Caddy·Ollama loopback 제한적 pilot 배포 계약 |
| [ADR-0009](0009-macos-one-click-launcher.md) | HTML에서 macOS 로컬 런처를 호출하는 원클릭 데모 진입 |
| [ADR-0010](0010-wide-evidence-deep-review-boundary.md) | 넓은 인사규정 근거 검색과 휴직·복직 심층 검토의 분리 |
| [ADR-0011](0011-case-workbench-visual-system.md) | Case Workbench 기반 soft rounded production 시각 시스템과 LINE Seed Sans KR 자체 호스팅 |
| [ADR-0012](0012-official-candidate-local-runtime.md) | 제품 local RAG의 공식 candidate 전용 경로, 과거 버전과 승인 전 보수적 상태 gate |
| [ADR-0013](0013-derived-allowance-deep-review.md) | 육아휴직 복직자의 정근수당 파생 검토와 정상 가정 경계 |
| [ADR-0014](0014-chat-first-source-preview.md) | 사용자 채팅 흐름과 화면 안 법령 근거 미리보기 |
| [ADR-0015](0015-cool-chat-answer-stream.md) | ADR-0011의 production 시각 토큰을 대체하고 ADR-0014를 구체화한 cool-white·graphite·단일 blue chat-first 답변 흐름 |
| [ADR-0016](0016-general-normal-case-policy.md) | 모든 지원 질문의 필수 사실·승인된 통상 가정·명시값 우선순위와 기본 거부형 profile registry |
| [ADR-0017](0017-public-scope-and-deep-evidence-gate.md) | 공개 범위와 심층 근거 gate 분리 |
| [ADR-0018](0018-structure-aware-chunking.md) | 문자 수가 아니라 조문 구조 단위 분할 |
| [ADR-0019](0019-query-transformation-boundary.md) | 질의 변환은 검색 후보 확장과 범위 판정에만 사용 |
| [ADR-0020](0020-claim-quantity-grounding.md) | 인용 검증에 claim 수량 근거 검사를 추가 |
| [ADR-0021](0021-multi-turn-evaluation.md) | 평가를 단발 호출이 아니라 대화 단위로 실행 |
| [ADR-0022](0022-searchable-provisions-and-version-gap.md) | 조 헤더·삭제 tombstone은 검색 후보에서 제외하고, 기준일에 버전이 없는 법령은 이름으로 알린다 |
| [ADR-0023](0023-evidence-handover-instead-of-blank-abstain.md) | 모델 초안이 검증에 걸리면 결론 대신 확인한 조건과 볼 조문을 넘긴다 |
| [ADR-0024](0024-elliptical-followup-task-carryover.md) | 생략형 어미로 끝나는 후속 턴은 앞 턴의 과업을 이어받되 조건 게이트는 유지한다 |
| [ADR-0025](0025-corpus-derived-topic-vocabulary.md) | 범위 판정 어휘를 손 목록이 아니라 색인된 조문 제목에서 뽑는다 |
| [ADR-0026](0026-reference-date-normal-assumption.md) | 넓은 lane의 기준일은 오늘로 가정하고 그 사실을 알린다. 심층 검토는 계속 묻는다 |

새 ADR은 `Context → Options → Decision → Consequences → Revisit` 순서로 작성한다.
