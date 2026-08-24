# Step 1: dday-datepicker (D-day 달력 입력 + 전역 크기 정리)

D-day 목표일을 손으로 `YYYY-MM-DD` 치지 말고 **네이티브 달력**으로 고르게 한다. 헷갈리는 위젯편집의 전역 D-day 크기 컨트롤을 정리한다(개별 크기가 진짜다).

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 스택, #7 예산)
- `src/widgets/DdayWidget.tsx` (DdayForm — 목표일 TextField, SizePicker(개별 크기 작게/보통/크게, small=2열))
- `src/components/BirthInputs.tsx` (네이티브 `<input type="date">` 스타일 패턴 — 참고/일관)
- `src/screens/widgets/WidgetsScreen.tsx` (WidgetEditRow — 위젯별 크기 SegmentedControl + SizePreview)
- `src/features/widgets/widget-config.ts` (ALLOWED_SIZES)
- `src/types/index.ts` (Dday: id/title/targetDate/size — 개별 size 이미 있음)
- `src/theme/tokens.ts`

## 배경 (사용자 피드백/질문)

- **#6:** "디데이 숫자입력 or 달력 넣게해." → 목표일 입력을 **네이티브 date 달력**으로(타이핑 제거). (D-N 자동 계산은 이미 있음.)
- **#1(답):** D-day는 **항목별 크기**가 이미 동작(작게/보통/크게, 작게끼리 2열). 위젯편집 탭의 *전역 D-day 크기* 컨트롤은 개별과 충돌·혼란 → **정리**.

## 작업

### A) `DdayWidget.tsx` DdayForm — 목표일 달력
- 목표일 `TextField`(YYYY-MM-DD 수기)를 **네이티브 `<input type="date">`** 로 교체(BirthInputs와 동일 톤·inline 스타일). value=targetDate(`YYYY-MM-DD`). 과거/미래 모두 허용(D+N도 의미 있음 — max/min 강제하지 말 것). 라벨/aria 부여.
- 제목 입력·개별 SizePicker(작게/보통/크게)·저장/삭제/취소는 유지. 검증(isValidDate)은 그대로 쓰되 date input이라 형식은 자동 보장.

### B) 위젯편집 전역 D-day 크기 정리 — `WidgetsScreen.tsx`
- D-day(그리고 동일하게 항목별 크기를 쓰는 위젯이 있다면)의 **전역 size SegmentedControl을 숨기거나** "항목별로 설정해요" 안내로 대체. 그래서 사용자가 같은 크기를 두 곳에서 만지지 않게.
  - 구현: WidgetEditRow에서 `type==='dday'`면 size SegmentedControl/Preview 대신 "D-day는 항목마다 크기를 정해요" 보조문구 + (선택) 홈에서 D-day 위젯으로 안내. on/off 토글·순서·드래그는 유지.
  - 메모 등 다른 위젯의 전역 size는 그대로(영향 X). ALLOWED_SIZES/정책 보존.

### C) 테스트/스모크
- DdayWidget 스모크: 폼에 date input 존재, 저장 경로 동작(기존 유지).
- WidgetsScreen 스모크: dday 행에 전역 size 컨트롤 미노출(또는 안내문) — 간단 검증. 기존 테스트 유지.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: D-day 목표일=달력 선택(타이핑 X), 개별 크기 유지, 위젯편집 전역 D-day 크기 중복 제거. CRITICAL #1(저장 storage만)·#5(웹 input/TDS·새 라이브러리 0·RN 0).
3. `phases/11-cute-records/index.json` step 1 갱신.

## 금지사항

- 캘린더 라이브러리 설치 금지 — 네이티브 `<input type="date">`(#5). D-day 개별 크기(작게=2열) 로직을 없애지 마라(그게 #1 답).
- 메모·캘린더·운세·일기·헤더는 건드리지 마라(다른 step). 새 의존성·대량 탐색 금지(#7).
