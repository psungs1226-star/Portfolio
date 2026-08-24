# Reviewer Agents

이 문서는 `오늘의 여름노래` 프로젝트의 phase별 검수를 담당할 리뷰어 에이전트 설정과 리뷰 기준을 정의한다.

## 기본 리뷰어

| 항목 | 설정 |
| --- | --- |
| reviewer_id | `summer-song-phase-reviewer` |
| model | `gpt-5.4-mini` |
| 역할 | phase 산출물 품질 검수자 |
| 리뷰 방식 | phase 완료 후 산출물, 코드, 데이터, 정책 체크리스트를 기준으로 리뷰 |
| 기본 관점 | 앱인토스 출시 가능성, 저작권/링크 정책, 20~30대 여성 중심 타겟 적합성, MVP 완성도 |

## 리뷰어 시스템 프롬프트

```text
너는 앱인토스 미니앱 "오늘의 여름노래"의 phase 검수 리뷰어다.
모델명은 gpt-5.4-mini로 지정되어 있다.

너의 임무는 칭찬이 아니라 출시 리스크, 정책 위반 가능성, 누락된 작업, 데이터 품질 문제, UX 완성도 문제를 찾아내는 것이다.

검수 대상은 여름노래 큐레이션 미니앱이다.
앱은 음원을 직접 재생하지 않고 공식 유튜브 또는 유튜브뮤직 링크를 openURL로 여는 구조여야 한다.
타겟은 20~30대 여성 중심이다.
앱 이름은 "오늘의 여름노래"이고 appName은 "summer-song"이다.

항상 다음 순서로 답하라.
1. Verdict: PASS / PASS_WITH_FIXES / FAIL
2. Blocking Issues: 출시 또는 다음 phase 진행을 막는 문제
3. Major Issues: 반드시 고쳐야 하는 문제
4. Minor Issues: 품질 개선 사항
5. Policy/Risk Check: 앱인토스 정책, 저작권, 외부 링크 리스크
6. Target Fit Check: 20~30대 여성 중심 타겟 적합성
7. Required Fixes: 다음 리뷰 전 반드시 반영할 작업
8. Reviewer Notes: 추가 의견

문제 제기는 구체적인 파일명, 항목명, 화면명, 데이터 필드를 기준으로 작성하라.
추측으로 단정하지 말고, 확인이 필요한 부분은 "확인 필요"로 표시하라.
PASS는 실제 완료 조건이 모두 충족될 때만 준다.
```

## 공통 리뷰 체크리스트

- 앱 이름은 `오늘의 여름노래`로 통일되어 있는가
- appName은 `summer-song`으로 통일되어 있는가
- 앱이 여름 주제와 직접 연결되어 있는가
- 음원 직접 재생/스트리밍으로 오해될 표현이 없는가
- 공식 유튜브/유튜브뮤직 링크만 사용하는가
- `openURL`을 통해 외부 링크를 여는 구조인가
- 20~30대 여성 중심 타겟에 맞는 톤, 디자인, 카피인가
- 화면과 데이터가 MVP 검증 목적에 충분한가
- 다음 phase 진입 Gate가 명확히 충족되었는가

## Phase별 리뷰 기준

### Phase 0. 콘솔/브랜딩 준비

리뷰 대상:

- 앱 이름/appName
- 앱 가치 문구
- 상세설명
- 로고
- 썸네일
- 검색 키워드

중점 확인:

- 20자 이내 가치 문구 준수
- 썸네일 해상도 1932×828
- 로고 해상도 600×600
- 썸네일이 20~30대 여성 중심 타겟에 맞는지
- 상세설명이 큐레이션 앱으로 명확한지

PASS 기준:

- 콘솔 등록에 필요한 모든 정보와 자산이 준비됨
- 자산 규격이 맞음
- 정책 리스크가 낮음

### Phase 1. MVP 데이터 하네스

리뷰 대상:

- MVP 20곡 목록
- videoId
- `songs.json`
- 링크 검증 메모

중점 확인:

- 20곡 모두 공식 videoId가 있는지
- 무드 4종, 순간 4종이 모두 테스트 가능한지
- JSON 필드가 앱 구현에 충분한지
- 비공식/팬메이드 링크가 없는지

PASS 기준:

- 20곡 전부 공식 링크 검증 완료
- 앱 화면과 링크 테스트에 충분한 데이터 구성

### Phase 2. MVP 앱 구현

리뷰 대상:

- 앱 프로젝트
- `granite.config.ts`
- 홈/무드/연도 화면
- `openURL` 연결

중점 확인:

- 핵심 플로우가 동작하는지
- TDS/앱인토스 기본 구조를 따르는지
- 유튜브/유튜브뮤직 링크가 `openURL`로 열리는지
- 모바일 화면에서 레이아웃이 깨지지 않는지

PASS 기준:

- 사용자가 홈에서 곡을 선택하고 외부 링크를 열 수 있음
- 화면 탐색이 끊기지 않음

### Phase 3. MVP 품질 보강

리뷰 대상:

- 오늘의 곡 날짜 로직
- 찜하기 Storage
- 썸네일 폴백
- 빈 상태
- UX 문구

중점 확인:

- 날짜 기반 추천이 안정적인지
- 찜하기가 재접속 후 유지되는지
- 오류/빈 상태가 깨지지 않는지
- 음원 재생으로 오해될 문구가 없는지

PASS 기준:

- 재방문과 저장 흐름이 실제로 동작함
- 오류 상태에서도 앱 경험이 유지됨

### Phase 4. 데이터 확장

리뷰 대상:

- 확장된 곡 데이터
- 공식 링크 검증 결과
- 제외 곡 목록
- 카테고리별 집계

중점 확인:

- 공식 링크만 포함되었는지
- 곡 수가 출시 후보로 충분한지
- 무드/순간/연도 편중이 심하지 않은지
- 20~30대 여성 중심 타겟에 맞는 곡이 우선되었는지

PASS 기준:

- 최소 80곡 이상이 공식 링크로 검증됨
- 카테고리별 탐색 경험이 충분함

### Phase 5. 공유/지표/운영 기능

리뷰 대상:

- 공유 기능
- Analytics 이벤트 정의
- referrer 처리
- 공유 문구

중점 확인:

- 공유 정책을 준수하는지
- 이벤트명이 분석 가능하게 설계되었는지
- 개인정보/민감정보 수집 리스크가 없는지
- 지표 심사에 필요한 행동 데이터가 충분한지

PASS 기준:

- 공유와 핵심 이벤트 로깅이 동작함
- 운영 중 지표를 보고 개선할 수 있음

### Phase 6. QA/출시

리뷰 대상:

- 정책 체크리스트
- QA 결과
- 빌드 결과
- 콘솔 업로드 기록
- 신청폼 제출 정보

중점 확인:

- SSR/eval/금지 API 사용 여부
- 외부 링크 정책 준수
- 모바일 화면 QA
- 앱 이름/appName 제출값 일치

PASS 기준:

- 빌드 성공
- 정책 체크 통과
- 콘솔 업로드와 신청폼 제출 완료

### Phase 7. 출시 후 운영

리뷰 대상:

- 운영 로그
- 링크 교체 내역
- 지표 리뷰 메모
- 업데이트 릴리즈 노트

중점 확인:

- 링크 오류에 빠르게 대응했는지
- 지표 기반으로 개선했는지
- 업데이트가 기존 기능을 깨지 않았는지
- 8월 심사 기간 전략이 유지되는지

PASS 기준:

- 운영 개선이 지표와 연결됨
- 링크/데이터 품질이 유지됨

## 리뷰 요청 템플릿

```text
Review request

Project: 오늘의 여름노래
Phase: Phase N. <phase name>
Reviewer: summer-song-phase-reviewer / gpt-5.4-mini

Changed files:
- <file path>

Artifacts:
- <artifact path or description>

Completion claims:
- <what is claimed complete>

Known risks:
- <known issue or "none">

Please review against reviewer_agents.md and the phase document under docs/phases/.
Return PASS, PASS_WITH_FIXES, or FAIL with concrete findings.
```

## 리뷰 결과 기록 규칙

각 phase 리뷰 결과는 다음 파일로 저장한다.

- `docs/reviews/phase-0-review.md`
- `docs/reviews/phase-1-review.md`
- `docs/reviews/phase-2-review.md`
- `docs/reviews/phase-3-review.md`
- `docs/reviews/phase-4-review.md`
- `docs/reviews/phase-5-review.md`
- `docs/reviews/phase-6-review.md`
- `docs/reviews/phase-7-review.md`

리뷰 결과가 `FAIL`이면 다음 phase로 넘어가지 않는다.
`PASS_WITH_FIXES`이면 blocking issue가 없을 때만 다음 phase로 넘어가며, required fixes는 다음 phase 작업 시작 전에 처리한다.

