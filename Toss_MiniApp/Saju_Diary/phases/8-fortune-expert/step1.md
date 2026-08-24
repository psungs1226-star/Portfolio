# Step 1: expert-copy (전문가 수준 문구 + 일진 혼합 반영)

step 0이 시간대 stance를 매일 일진에 따라 바꾸고(`TimeSegment.dayBranch`), 정확한 십신(`basis.todayTenGod`)·득령(`basis.deLing`)을 노출한다. 이를 받아 **전문가스러운 한국어 문구**로 조립한다. 순수 로직 + 데이터(+ 기존 UI로 자연히 흐르는 텍스트). 구조적 UI 변경은 최소.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — **#2 자체 작성**, **#3 정합·단정 예언 금지**, #1 로컬, #5 스택, #7 예산)
- `src/types/index.ts` (TimeSegment.dayBranch, FortuneBasis.todayTenGod/deLing, FortuneDetail, DayPart)
- `src/widgets/fortune-today.ts` (전부 — `describeChart`/`buildSegmentLine`/`buildCautionLine`/`buildReflectiveLines`/`buildBasisLine`, `computeTodayFortune`의 `detailText` 사전 조립, `TodayFortune`)
- `src/features/fortune/phrases.ts` (전부 — 선택자/검증/MIN 상수/seed 사용)
- `src/features/fortune/phrases.test.ts`, `src/widgets/fortune-today.test.ts`
- `data/fortune-phrases.json` (schemaVersion 3 — 기존 섹션 보존)
- `src/widgets/FortuneWidget.tsx` (수정 금지 — 단, result.iljin/detailText를 렌더하는 위치만 파악: 텍스트 강화는 이 컴포넌트 변경 없이 흐른다)
- `src/screens/diary/DiaryScreen.tsx` (수정 금지 — SnapshotHeader가 reflective를 어떻게 쓰는지 파악)

## 배경 (왜)

"전문가스러운 느낌." → 점성술 앱 같은 막연한 문장이 아니라, **정확한 사주 용어를 바르게** 쓴 해석. 단, CRITICAL #3: 우리가 실제 계산한 것(일간·오행·신강신약·득령실령·정확한 십신·희신 계열·지지 합충)만 근거로 말하고, **단정적 예언/운명 확정/공포 금지**, 해요체. "흐름/기운/경향"으로 표현.

## 작업 (모두 fortune-today.ts 빌더 + phrases.ts 선택자 + JSON 풀, UI 컴포넌트 변경 없음)

### A) `describeChart(basis, birthDate)` 강화 — "이런 사주"
- 일간(간+오행) + **득령/실령**(basis.deLing: "월령을 얻어 뿌리가 단단한" / "월령을 잃어 기운이 빠지기 쉬운") + **신강/신약** + **희신 계열**(무엇이 들어와야 좋은지)을 정확히. 일간 오행별 성정 한 조각(풀, birthDate 시드).
- 예(신약·실령): "庚金 일간이 여름(火)에 나 월령을 잃은 신약 사주예요. 일간을 돕는 인성(土)·비겁(金)이 희신이라, 그 기운이 들어올 때 중심이 잡혀요."
- 단정 예언 없음, "경향/때" 톤.

### B) `buildSegmentLine(seg, birthDate, dateKey)` — 일진 혼합 명시
- `seg.stance` + `seg.dayBranch`를 함께 반영해 **오늘 왜 그런지**를 전문가스럽게:
  - `he`(합): "오늘 일진과 합을 이뤄 ~ 어우러지는 때" / `same`(왕): "기운이 같은 자리에 들어 ~ 힘이 실리는 때" / `chong`(충): "오늘 일진과 부딪쳐 ~ 흔들리기 쉬운 때" / `none`: 체질 stance대로 담백.
  - favor/neutral/avoid 톤은 유지(좋음/보통/주의), 거기에 합충 근거를 한 조각 더한다.
- 풀 키: (stance × dayBranch) 또는 (dayBranch) 보조 조각 + 기존 (part×stance) 조합. 다양하게(각 ≥ 4). 결정론(birthDate,dateKey,salt `seg|{part}`).

### C) `buildCautionLine(detail, basis, birthDate, dateKey)` — 정확한 십신
- `basis.todayTenGod`(정/편 구분)로 영역 주의를 구체화(예: 편재→큰 지출·투자 충동, 정관→규칙·상사·문서, 상관→말·구설, 겁재→동업·금전 빌려주기). 계열뿐 아니라 정/편 뉘앙스를 살린다.
- `caution.chong`(충)·`caution.cautionPart`(시간대) 결합. 톤: "~은 한 번 더 확인해요", "특히 {시간대}엔 서두르지 않기". 없으면 null.

### D) `buildReflectiveLines(basis, detail, birthDate, dateKey)` — 회고형 유지 + 전문가
- 회고/질문 톤 유지(명령·약속 금지). 정확한 십신/계열을 과거형으로 언급 가능: "오늘은 편재 기운이 도드라진 하루였어요. 들어온 기회를 어떻게 보셨나요?"

### E) 오늘의 십신 노출(UI 변경 없이) — `computeTodayFortune`
- `result.iljin`(기존 "오늘의 일진" 블록에 렌더됨)을 **정확한 십신 + 한 줄 의미**로 보강 조립. 예: 기존 일진 문구 앞/뒤에 "오늘 일진은 당신에게 편재 — 재물·기회의 기운이에요" 한 조각. (pickIljin 결과 + todayTenGod 조합. 막연한 문장 금지, 십신 의미 정확.)
- 또는 `detailText`에 십신 한 줄을 포함해 기존 렌더 경로로 흐르게 해도 됨. **FortuneWidget.tsx는 건드리지 않는다**(기존이 result.iljin/detailText.chart/segments/caution를 이미 렌더).

### F) `data/fortune-phrases.json` (schemaVersion 4) + `phrases.ts`
- 기존 섹션 보존. 강화/추가: chartTraits(득령 뉘앙스 포함하도록 재작성 또는 보조 풀), segment(dayBranch 조각 ≥4×4관계 or 통합), cautionArea를 **십신 10종**(정/편) 또는 계열+정편 보조로 세분(각 ≥4), 십신 의미 한 줄 풀(10종, 오늘의 십신 노출용), reflect 보강.
- phrases.ts 선택자 추가/수정 + `validateBank`에 새 풀 MIN 검증(부족 시 실패). 결정론.

### G) 테스트
- phrases.test: 새 풀 결정론·MIN·validateBank 실패조건.
- fortune-today.test: describeChart(득령/희신 언급), buildSegmentLine이 **dayBranch에 따라 달라지는지**(he vs chong 다른 문구), buildCautionLine 정/편 반영·null 케이스, reflective 회고/질문·금지어(해줘요/하세요/보세요/공포·운명단정) 없음, iljin에 정확한 십신 포함.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: CRITICAL #2(자체)·#3(실제 계산 근거만·단정예언 금지)·#1/#5(순수·새 의존성 0). 오늘=서술/예측+일진혼합 명시, 일기=회고/질문. 시간대 문구가 합/충에 따라 달라짐.
3. `phases/8-fortune-expert/index.json` step 1 갱신 + 모든 step 일관.

## 금지사항

- `FortuneWidget.tsx`·`DiaryScreen.tsx` 구조 변경 금지(텍스트는 기존 렌더 경로로 흐르게). 정 필요하면 멈추고 blocked로 사유 남겨라(오케스트레이터가 별도 UI step 판단).
- 우리가 계산하지 않은 것(격국·대운·신살 등)을 말하지 마라. 이유: #3 — 근거 없는 전문 용어 남발은 신뢰 파괴.
- 명령·약속 톤(일기), 단정 예언·공포 조성 금지. 외부 인용 문구 금지(#2).
- 풀 후보 MIN 미만 금지. 기존 선택자 시그니처·풀 보존. 새 의존성·대량 탐색 금지(#7).
