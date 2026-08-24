# Step 3: completed-memo-calendar (완료 메모 캘린더 모아보기)

완료한 메모를 날짜별로 모아보는 **캘린더**를 돌아보기(회고) 탭에 추가한다. 완료(completedDate)·일기와 연동.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 웹 React+TDS·라이브러리 금지, #7 예산)
- `src/screens/review/ReviewScreen.tsx` (회고 탭 — 월간 기분 그래프·일기 모아보기·요약·공유)
- `src/screens/review/review-stats.ts` (yearMonthOf, daysInMonth, isInMonth, monthsWithDiaries 등 순수 집계 — 재사용)
- `src/widgets/memo-ops.ts` (`completedTodosForDate(memos, date)` — 그날 완료 메모)
- `src/features/storage/index.ts` (loadMemos, loadDiaries)
- `src/types/index.ts` (Memo.completedDate, Diary)
- `src/theme/tokens.ts` (cute 토큰 — step 0)
- `src/screens/diary/diary-ops.ts` (diaryForDate)

## 배경 (사용자 피드백)

- **#4·#5:** "완료시 계속 남기면 어느세월에 관리해 → 아예 완료된 메모 모음을 캘린더로 만들어라." → 완료 메모는 활성 목록(step 2)에서 빠지고, 여기 **월 캘린더**에서 날짜별로 본다. 일기와 같은 날짜 축이라 함께 보여주면 좋다(그날 완료한 일 + 일기).

## 작업

### A) 순수 집계 보강 (review-stats.ts 또는 신규 memo-calendar util)
- `completedMemosInMonth(memos, yearMonth)` / 날짜→완료메모 매핑, `daysWithCompleted(memos, yearMonth): Set<day>` 같은 순수 함수. completedDate 기준. (review-stats의 daysInMonth/isInMonth 재사용.)
- 일기 점 표시도 원하면 `daysWithDiary` 재사용/추가. 전부 순수·테스트 가능.

### B) 캘린더 컴포넌트 (`src/screens/review/CompletedCalendar.tsx` 또는 components)
- 라이브러리 없이 **월 그리드 달력**(7열, 요일 헤더, 그 달의 1~말일). 네이티브 구현(date-fns/캘린더 라이브러리 금지, #5).
- 각 날짜 칸: 완료 메모 있으면 **점/개수 뱃지**(+ 일기 있으면 다른 색 점). 파스텔 톤(cute 토큰).
- 날짜 탭 → 그날 **완료한 메모 목록 + (있으면) 일기 요약** 패널 표시(읽기 전용). 완료 메모는 `completedTodosForDate`.
- 월 이동(이전/다음) — review-stats yearMonth 패턴 재사용. 빈 달 친절 처리.

### C) ReviewScreen 배선
- 회고 탭에 "완료한 일" 섹션으로 `CompletedCalendar` 추가(기존 기분 그래프·일기 모아보기·공유 보존). 위치는 자연스러운 곳(상단 또는 일기 모아보기 옆).
- 데이터는 loadMemos + loadDiaries(읽기, storage 접근자만). 저장 없음.

### D) 테스트/스모크
- memo-calendar util 단위 테스트(완료메모 월 필터·날짜 매핑·점 집합, 결정론).
- CompletedCalendar 스모크: 완료메모 seed로 달력 렌더·날짜 탭 시 그날 목록 표시 크래시 0.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: 완료 메모가 월 캘린더에 날짜별로(점/개수), 날짜 탭 시 그날 완료목록+일기. CRITICAL #1(읽기 storage만·외부 0)·#5(캘린더 라이브러리 0·TDS/웹·RN 0).
3. `phases/11-cute-records/index.json` step 3 갱신.

## 금지사항

- 캘린더/date 라이브러리 설치 금지 — 네이티브 그리드(#5). 완료 메모를 여기서 변형/삭제하지 마라(읽기 전용 모아보기).
- 메모 위젯·운세·일기 입력·헤더는 건드리지 마라(다른 step). 새 의존성·대량 탐색 금지(#7).
