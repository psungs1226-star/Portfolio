# Phase Documents

`오늘의 여름노래` 앱을 MVP에서 완제품까지 진행하기 위한 phase별 업무 문서다.

| Phase | 문서 | 목적 |
| --- | --- | --- |
| Phase 0 | [phase-0-console-branding.md](phase-0-console-branding.md) | 콘솔 등록과 브랜딩 자산 준비 |
| Phase 1 | [phase-1-mvp-data-harness.md](phase-1-mvp-data-harness.md) | MVP 20곡 데이터와 공식 링크 검증 |
| Phase 2 | [phase-2-mvp-app-implementation.md](phase-2-mvp-app-implementation.md) | MVP 앱 화면과 링크 연결 구현 |
| Phase 3 | [phase-3-mvp-quality-hardening.md](phase-3-mvp-quality-hardening.md) | 오늘의 곡, 찜, 오류/빈 상태 보강 |
| Phase 4 | [phase-4-data-expansion.md](phase-4-data-expansion.md) | 출시 후보 데이터 확장 |
| Phase 5 | [phase-5-share-analytics-ops.md](phase-5-share-analytics-ops.md) | 공유, 지표, 운영 기능 |
| Phase 6 | [phase-6-qa-release.md](phase-6-qa-release.md) | QA, 빌드, 콘솔 업로드, 제출 |
| Phase 7 | [phase-7-post-launch-operations.md](phase-7-post-launch-operations.md) | 출시 후 지표 개선과 링크 운영 |

## 리뷰어

phase별 검수는 루트의 [reviewer_agents.md](../reviewer_agents.md)를 따른다.

기본 리뷰어:

- reviewer_id: `summer-song-phase-reviewer`
- model: `gpt-5.4-mini`

## 진행 규칙

1. phase 문서의 완료 조건을 먼저 충족한다.
2. `reviewer_agents.md`의 리뷰 요청 템플릿으로 리뷰를 요청한다.
3. 리뷰 결과를 `docs/reviews/phase-N-review.md`에 저장한다.
4. `FAIL`이면 다음 phase로 넘어가지 않는다.
5. `PASS_WITH_FIXES`이면 blocking issue가 없을 때만 다음 phase로 넘어간다.

