# Step 2: fortune-detail-ui (위젯 상세 재구성 + 일기 회고형 헤더)

step 0(구조 detail)·step 1(문구 빌더)을 화면에 연결한다. 홈 위젯 상세를 「내 사주 → 시간대별 기운 → 오늘 조심」으로 자세히 펼치고, 일기 헤더를 회고형으로 바꾼다.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 웹 React+TDS·RN/임의 라이브러리 금지, #7 예산)
- `src/types/index.ts` (FortuneResult.detail, FortuneDetail, TimeSegment, DayPart, DailyCaution)
- `src/widgets/fortune-today.ts` (step1: `describeChart`, `buildSegmentLine`, `buildCautionLine`, `buildReflectiveLines`, `buildBasisLine`, `TodayFortune`)
- `src/widgets/FortuneWidget.tsx` (수정 — 상세 펼침 `FortuneDetail` 컴포넌트)
- `src/screens/diary/diary-ops.ts` (step1: FortuneSnapshot.basis 등)
- `src/screens/diary/DiaryScreen.tsx` (수정 — SnapshotHeader)
- `src/theme/tokens.ts` (palette/spacing/radius/BRAND)
- `src/__smoke__/widgets.smoke.test.tsx`, `src/__smoke__/harness.tsx` (스모크 깨지지 않게)

## 작업

### A) `src/widgets/FortuneWidget.tsx` — 상세를 자세히 (오늘=서술/예측)

압축 1행(별점+일진 뱃지+요약+화살표)은 **유지**. 펼침(`FortuneDetail`)을 아래 순서로 재구성:

1. **내 사주** — `describeChart(result.basis)` 한 단락(보조 텍스트, lineHeight 여유). 기존 basisLine(`buildBasisLine`) 한 줄은 이 단락으로 대체하거나 그 아래 작게 1줄로 남길 수 있음(중복 줄이기 — describeChart가 더 풍부하면 그것만).
2. **시간대별 기운** — `result.detail.segments` 4개를 `buildSegmentLine(seg, birthDate, date)`로 한 줄씩. 아침/낮/저녁/밤 라벨 + 문구 + 작은 stance 표시(favor=좋음/avoid=주의/neutral=보통; 색/뱃지로 가볍게, TDS Badge 또는 점). 세로 리스트. (birthDate는 saju.birthDate가 필요 → `TodayFortune`/props로 전달되도록 배선; computeTodayFortune가 dateKey를 알고 있으니 fortune-today에서 segment 문구까지 미리 조립해 `TodayFortune`에 담아 넘기는 방식도 가능 — 재량. **권장: fortune-today.computeTodayFortune가 segmentLines/chartText/cautionText/reflect를 미리 조립해 TodayFortune에 포함**시켜 위젯은 표시만 하게. 그러면 위젯이 birthDate를 다룰 필요 없음.)
3. **오늘 조심** — `buildCautionLine`(없으면 섹션 생략). 경고스럽지 않게, 정보 톤으로(아이콘/색 과하지 않게).
4. 이어서 기존 **세부운(재물·애정·건강)·행운색·행운방향·오늘의 일진·한 줄 조언·타로** 유지.

→ 위 "권장"을 택하면 `fortune-today.ts`의 `TodayFortune`에 필드 추가(예: `detailText: { chart: string; segments: { part: DayPart; label: string; stance: FortuneStance; text: string }[]; caution: string | null }`)하고 `computeTodayFortune`에서 채운다. 위젯은 그 값만 렌더. (이 경우 fortune-today.ts 수정은 표시 문자열 조립까지 — step1 빌더 호출. 만세력/점수 재구현 아님.)

레이아웃은 기존 inline style/토큰 패턴을 그대로 따른다. 새 라이브러리 0.

### B) `src/screens/diary/DiaryScreen.tsx` — 회고형 헤더 (일기=회고/질문)

- `SnapshotHeader`의 운세 영역에서 **명령·약속형 basisLine 노출을 회고형으로 교체**. snapshot에 저장된 `basis`(step1)로 `buildReflectiveLines(basis, ...)`를 만들어:
  - summary 한 줄("오늘은 ~한 하루였어요") + question 한 줄("~ 어떠셨나요?")을 보여준다.
  - 기존 별점·행운색·일진 박제는 유지(그날의 기록).
  - basis가 없는 과거 스냅샷(하위호환)은 기존 표시로 폴백(깨짐 0).
- 별점/색/일진 등 기존 박제와 "그날 완료한 일"(phase 6) 섹션은 그대로.

### C) 스모크/회귀

- `widgets.smoke.test.tsx`: FortuneWidget 펼침 상태에서 시간대 4줄·조심 섹션이 크래시 없이 렌더되는지 가볍게. DiaryScreen 회고 헤더 렌더(basis 있는 snapshot seed) 크래시 0.
- 기존 스모크/단위 테스트 전부 유지.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - CRITICAL #5: TDS 우선, 새 라이브러리 0, RN 프리미티브 0, inline style+토큰.
   - CRITICAL #1: 일기·운세 표시 계산은 메모리(fortune 모듈)·저장은 storage 접근자만. 외부 전송 0.
   - 톤: 홈 위젯 상세=서술/예측(시간대·조심), 일기 헤더=회고/질문. 사용자 요청 정합.
   - 빈 상태(조심 없음, 사주 미입력, 과거 basis 없는 스냅샷)에서 깨짐/빈 섹션 0.
3. `phases/7-fortune-depth/index.json` step 2 갱신 + 모든 step 일관 확인.

## 금지사항

- 압축 1행 UX·기존 세부운/행운/타로/일기 자동 박제·"그날 완료한 일" 섹션을 깨뜨리지 마라.
- 일기 헤더에 명령·약속 톤을 다시 넣지 마라(회고/질문 유지).
- 위젯/화면에서 만세력·점수·시간대 stance를 재계산하지 마라 — fortune 모듈 결과만 표시(CRITICAL: 재구현 금지).
- 새 의존성·캘린더/차트 라이브러리 설치 금지(#5). 대량 탐색 금지(#7).
