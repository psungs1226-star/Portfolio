# Step 1: diary-home-widget (일기를 홈 화면에)

홈(오늘 탭)의 일기 자리가 빈 placeholder다. 그날 일기를 요약해 보여주고 탭하면 일기 탭으로 가는 **DiaryWidget**을 만든다.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 스택, #7 예산)
- `src/screens/today/TodayScreen.tsx` (수정 — `WidgetSlot label="일기"`(line ~205)를 실제 위젯으로, `onNavigate(tab)` 이미 있음)
- `src/screens/diary/diary-ops.ts` (`diaryForDate`, FortuneSnapshot 등)
- `src/screens/diary/DiaryScreen.tsx` (참고 — 일기 모양/그날의 기록)
- `src/features/storage/index.ts` (loadDiaries)
- `src/features/fortune/manse.ts` (todayDateString)
- `src/components` (Card 등), `src/theme/tokens.ts`
- `src/widgets/MemoWidget.tsx` (홈 위젯 구조 패턴 참고)

## 배경 (사용자 피드백)

"일기도 홈 화면에 들어가야한다." → 현재 홈에서 일기는 "들어올 자리예요" placeholder. 실제로 그날 일기를 요약/유도하는 위젯을 넣는다.

## 작업

### A) `src/widgets/DiaryWidget.tsx` 신설
- props: `{ today?: string; onOpen?: () => void }`(테스트 주입 가능, 기본 오늘).
- `loadDiaries()`로 오늘(today) 일기를 `diaryForDate`로 조회:
  - **쓴 경우:** 기분 별점(TDS Rating readOnly, small) + 본문 한두 줄 요약(말줄임) + "그날의 기록" 유무. 탭하면 `onOpen()`(일기 탭으로).
  - **안 쓴 경우:** "오늘 한 줄 남기기" CTA 카드 → 탭하면 `onOpen()`.
- 저장은 안 함(읽기만, storage 접근자 loadDiaries). 콤팩트(홈 카드 1개). TDS/inline+토큰. RN 금지.

### B) `TodayScreen.tsx` 배선
- `renderWidget`의 `case 'diary'`에서 `WidgetSlot` 대신 `<DiaryWidget onOpen={() => onNavigate?.('diary')} />`.
- 일기는 "기록" 섹션(RECORD_TYPES에 이미 포함). settings에서 diary 위젯이 enabled여야 홈에 뜬다 — 기본 프리셋/온보딩에서 diary가 꺼져 있으면 홈에 안 보이므로, **diary 위젯을 홈 기본 표시에 포함**되도록 확인(필요 시 preset/widget-config 기본에 diary enabled 추가는 이 step 범위에서 최소 변경으로). 단, 온보딩 STEP1 토글 목록 변경은 하지 말 것(일기는 탭+홈 위젯 둘 다 존재 가능). 홈에서 diary가 보이게 하는 최소 경로만 보장.

### C) 스모크
- DiaryWidget: 일기 있음/없음 두 경우 크래시 없이 렌더, onOpen 콜백 동작(간단).
- TodayScreen 스모크가 있으면 diary 위젯 렌더 포함.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: 홈에 일기 위젯이 뜨고(요약 또는 CTA) 탭 시 일기 탭으로 이동. CRITICAL #1(읽기/저장 storage만)·#5(TDS/웹·새 라이브러리 0·RN 0).
3. `phases/10-home-ux/index.json` step 1 갱신(summary).

## 금지사항

- 일기 저장/편집을 이 위젯에서 하지 마라(요약 표시 + 일기 탭으로 유도만). 메모·운세·위젯편집 건드리지 마라(다른 step).
- 라우팅 라이브러리 도입 금지(App 탭 상태/onNavigate 재사용, #5). 새 의존성·대량 탐색 금지(#7).
