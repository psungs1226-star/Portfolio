# Step 0: dday

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/PRD.md` (§6.3 D-day)
- `src/types/index.ts`, `src/features/storage/index.ts`, `src/components/`, `src/theme/tokens.ts`, `src/screens/today/`

## 작업
D-day 위젯과 입력을 구현한다.

1. `src/widgets/DdayWidget.tsx`: 제목+목표일 입력(추가/수정/삭제), 남은 일수 계산(`YYYY-MM-DD` 기준, 타임존 안전). 크기별 렌더: 작게(2열 그리드)/보통(1열)/크게(강조 큰 수치).
2. 저장은 storage `ddays` 접근자 사용. today 홈 "확인" 섹션에 끼움.

핵심 규칙: 일수 계산은 로컬 날짜 경계 기준 정수일(시/분 무시), 타임존 버그 금지.

## Acceptance Criteria
```bash
npm run build
npm test    # D-day 일수 계산 경계 테스트(오늘=D-DAY, 미래/과거)
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 3크기 렌더 / 일수 계산 정확(경계) / storage 접근자 사용.
3. `phases/3-records/index.json` step0 업데이트(summary).

## 금지사항
- `Date` 차이를 ms로 단순 나눗셈하지 마라. 이유: DST/타임존으로 하루 오차. 날짜 문자열 기준 계산.
- Storage 직접 호출 금지(접근자 사용). 이유: CRITICAL #1.
