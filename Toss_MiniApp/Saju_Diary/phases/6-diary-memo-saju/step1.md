# Step 1: diary-memo-ui (UI 배선)

step 0에서 만든 순수 로직(완료일·근거 한 줄)을 UI에 연결한다. 화면 두 곳: MemoWidget(완료일 부여·재지정), DiaryScreen("그날 완료한 일" 섹션 + 근거 한 줄 표시).

## 읽어야 할 파일

먼저 아래를 읽고 step 0 산출물과 기존 UI 패턴을 파악하라:

- `CLAUDE.md` (CRITICAL — #1 로컬 전용, #5 웹 React+TDS·RN 프리미티브 금지·임의 라이브러리 금지, #7 컨텍스트 예산)
- `src/types/index.ts` (Memo.completedDate)
- `src/widgets/memo-ops.ts` (step 0: `toggleMemo(memos,id,opts?)`, `setMemoCompletedDate`, `completedTodosForDate`)
- `src/screens/diary/diary-ops.ts` (step 0: `FortuneSnapshot.basisLine`, `completedTodosForDate`는 memo-ops에 있음)
- `src/widgets/MemoWidget.tsx` (수정 대상)
- `src/screens/diary/DiaryScreen.tsx` (수정 대상)
- `src/theme/tokens.ts` (palette/spacing/radius/BRAND — inline style 토큰)
- `src/features/storage/index.ts` (loadMemos/saveMemos/loadDiaries 등 접근자 시그니처 확인)
- `src/__smoke__/widgets.smoke.test.tsx`, `src/__smoke__/harness.tsx` (스모크 테스트가 깨지지 않게)

## 작업

### A) `src/widgets/MemoWidget.tsx` — 완료 시 오늘 디폴트 + 과거분 날짜 재지정

1. **완료 시 오늘 디폴트:** `handleToggle`이 `toggleMemo(memos, id, { completedDate: today })`를 호출하도록 변경. (체크 ON이면 오늘이 완료일로, OFF면 step 0 로직이 자동 제거.)
2. **완료된 할 일에 날짜 재지정 affordance:** 완료된(`isTodo && checked`) 메모 행에 작은 날짜 컨트롤을 노출.
   - 표시: 현재 `completedDate`(없으면 오늘) 라벨 + 바꾸기.
   - 입력: 네이티브 `<input type="date">` 사용(HTML 기본 요소 — 새 라이브러리 아님, CRITICAL #5 위반 아님). `value`=completedDate(또는 today), `max`=today(미래 금지). onChange → `persist(setMemoCompletedDate(memos, m.id, e.target.value))`.
   - inline style·토큰 사용. 미완료/일반 메모 행에는 노출하지 않는다.
   - 작게, 방해되지 않게(예: 행 아래 12px 보조 텍스트 "완료일 6/14 · 바꾸기"). 접근성 위해 `<input>`에 `aria-label` 부여.
3. 안내 한 줄(선택): 완료한 할 일이 그날 일기에 모인다는 힌트("완료하면 그날 일기에 모여요" 류)를 작게. 과하지 않게.

기존 add/remove/일반 토글 동작·레이아웃은 보존. `newId`·날짜 주입(today) 패턴 유지.

### B) `src/screens/diary/DiaryScreen.tsx` — "그날 완료한 일" 섹션 + 근거 한 줄

1. **memos 로드:** 기존 `Promise.all([loadDiaries(), loadSettings()])`에 `loadMemos()`를 추가해 memos 상태를 둔다. 실패 시 빈 배열.
2. **"그날 완료한 일" 카드:** `completedTodosForDate(memos, viewDate)`로 그날 완료한 할 일을 라이브 조회해 리스트로 보여준다(체크 표시 + 텍스트, 읽기 전용 — 여기선 토글/삭제 안 함). 0건이면 카드 생략(빈 카드 강제 X). 위치: 자동 헤더(SnapshotHeader) 아래, 기분/본문 위 또는 본문 아래 — 자연스러운 곳.
3. **근거 한 줄 표시:** `SnapshotHeader`의 운세 영역에 `fortune.basisLine`이 있으면 작게(textTertiary, 12px) 한 줄 추가. iljin 줄과 같은 톤.
4. memos는 라이브 조회만(여기서 변형/저장하지 않음 — 완료일 변경은 MemoWidget 담당). 일기 저장 로직(upsertDiary 등)은 그대로.

### C) 스모크/회귀

- `src/__smoke__/widgets.smoke.test.tsx`가 MemoWidget을 마운트한다면 깨지지 않게(필요 시 harness에 memos seed). DiaryScreen 스모크가 있으면 loadMemos mock 포함 확인.
- 새 UI가 크래시 없이 마운트되는지 스모크로 가볍게 커버(완료된 todo가 있는 memos seed → 날짜 input·완료 섹션 렌더).

## Acceptance Criteria

```bash
npm run build    # tsc 컴파일 에러 0
npm test         # vitest 전부 통과(스모크 포함)
npm run lint     # eslint 0
```

## 검증 절차

1. 위 AC 3개 실행.
2. 체크리스트:
   - CRITICAL #1: 저장은 storage 접근자(loadMemos/saveMemos/loadDiaries)만. 외부 전송 0. 일기·메모=민감정보 기기 밖 금지.
   - CRITICAL #5: TDS 우선, `<input type="date">` 외 새 라이브러리 0, RN 프리미티브(View/Text/Image) 0, 상태관리 라이브러리 0. 스타일은 inline + tokens.
   - 완료 시 completedDate=today 디폴트, 과거 완료분은 date input(max=today)으로 재지정 → 그 날짜 일기에 노출.
   - 일기 헤더에 운세 근거 한 줄 노출.
   - 빈 상태(완료한 일 0건, 운세 미입력)에서 빈 카드/깨짐 없음.
3. `phases/6-diary-memo-saju/index.json`의 step 1 갱신(완료/에러/blocked 규칙은 step 0와 동일). 모든 step 완료 시 이 파일 전체가 일관된지 확인.

## 금지사항

- DiaryScreen에서 memos를 변형·저장하지 마라(완료일 변경은 MemoWidget 단일 책임). 이유: 출처 분산 방지·라이브 조회 일관성.
- `<input type="date">` 외의 캘린더/데이트픽커 라이브러리를 설치하지 마라. 이유: CRITICAL #5(임의 라이브러리 금지) + 웹뷰에서 네이티브 date input이 충분.
- 완료한 할 일을 Diary 레코드에 복사 저장하지 마라(step 0 결정 유지 — memos 라이브 조회).
- 기존 일기 자동 헤더(날씨·운세 박제)·메모 던지기 UX를 깨뜨리지 마라.
- 대량 파일 탐색·새 의존성 금지(CRITICAL #7).
