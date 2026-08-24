# Step 0: daily-detail-engine (시간대별 기운 + 조심 포인트 — 구조화, 순수)

운세를 더 자세하게 만들기 위한 **구조화 데이터**를 엔진에 추가한다. 이 step은 점수/판정 같은 **순수 로직과 타입만** 다룬다. 문구(한국어 조립)와 UI는 다음 step. 한자 문자열은 만들지 말고 구조(계열/입장/오행/지지)만 산출한다.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — 특히 **#3 사주는 주류 만세력 디폴트에 정합**, #1 로컬·외부 0, #5 스택, #7 컨텍스트 예산)
- `docs/ARCHITECTURE.md` §5(사주 엔진 — 부억/월령/희기, 시간 산출은 시주 부분)
- `src/types/index.ts` (FortuneResult, FortuneBasis, FortuneStance, TenGodGroup, WuXing, DayGanZhi, NatalChart, Pillar)
- `src/features/fortune/engine.ts` (전부 — 특히 export된 `wuXingToGroup`, `favorableGroups`, `dayMasterStrength`, `dayRelation`, `tenGodGroup`, `branchAdjust`는 private이니 같은 로직 재사용 주의, `fortuneBasis`, `buildFortune`)
- `src/features/fortune/engine.test.ts` (테스트 패턴)
- `src/screens/diary/diary-ops.test.ts` 의 `makeFortune` 픽스처(line ~42) — FortuneResult를 직접 만든다. `detail` 필수 추가 시 여기도 갱신해야 함.

## 배경 (왜)

사용자: "좀 더 자세하게 써줘야지. 이런이런 사주로, 이 시간에는 이렇고, 이 시간에는 저럴거다. 오늘은 어떤쪽을 조심하고."

→ 운세에 **시간대별 기운 흐름**과 **오늘 조심 포인트**를 더한다. 단, 시간대별 운세는 만세력의 정밀 산출이 아니라 **해석 레이어**다. 신뢰(CRITICAL #3)를 위해:
- 근거를 **사정(四正) 왕지 + 본인 희기**로 명확히 한다(아래). "운명 단정"이 아니라 "기운의 흐름"으로 본다.
- 결정론적(같은 사람·같은 날 항상 동일)이되, 과한 정밀 주장 금지.

### 시간대 모델 (四正 왕지 — 근거 고정)

하루를 4블록으로 나누고 각 블록의 대표 기운을 사정(子卯午酉) 왕지의 오행으로 둔다:

| 블록(part) | 시간대(대략) | 왕지(zhi) | 오행(wuXing) |
|---|---|---|---|
| `morning`(아침) | 새벽~오전 | 卯 | 木 |
| `day`(낮) | 한낮 | 午 | 火 |
| `evening`(저녁) | 해질녘 | 酉 | 金 |
| `night`(밤) | 밤 | 子 | 水 |

각 블록의 **입장(stance)** = 그 오행을 일간 기준 십신 계열(`wuXingToGroup(natal.dayWuXing, blockWuXing)`)로 환산 → 그 계열이 본인 `favorableGroups`의 favor면 `favor`, avoid면 `avoid`, 아니면 `neutral`. (土는 사정 시간대에 없으므로 시간 흐름에 미표현 — 의도된 단순화.)

## 작업

### 1) `src/types/index.ts` — 타입 추가

```ts
/** 하루 시간대(四正 왕지 기준). */
export type DayPart = 'morning' | 'day' | 'evening' | 'night';

/** 한 시간대의 기운(구조 — 한국어 문구는 위젯 레이어에서). */
export interface TimeSegment {
  part: DayPart;
  /** 대표 왕지 한자(卯/午/酉/子). */
  zhi: string;
  /** 그 시간대 오행(木/火/金/水). */
  wuXing: WuXing;
  /** 일간 기준 그 오행의 십신 계열. */
  group: TenGodGroup;
  /** 그 사람에게 喜(favor)/忌(avoid)/中(neutral). */
  stance: FortuneStance;
}

/** 오늘 조심 포인트(구조). */
export interface DailyCaution {
  /** 오늘 들어온 기운이 본인 기신(忌)이면 그 계열, 아니면 null(영역 조심). */
  avoidGroup: TenGodGroup | null;
  /** 일지×오늘 지지 충(沖) 여부 — true면 변동·마찰 조심. */
  chong: boolean;
  /** 가장 조심할 시간대(忌 블록 중 첫째), 없으면 null. */
  cautionPart: DayPart | null;
}

/** 오늘의 상세(시간대 흐름 + 조심). */
export interface FortuneDetail {
  segments: TimeSegment[];   // 길이 4(morning→day→evening→night 순)
  caution: DailyCaution;
}
```

그리고 `FortuneResult`에 **필수 필드** 추가:
```ts
export interface FortuneResult {
  // ...기존 필드...
  basis: FortuneBasis;
  /** 시간대별 기운 + 조심(자세한 운세). */
  detail: FortuneDetail;
}
```

### 2) `src/features/fortune/engine.ts` — 산출 함수 + buildFortune 배선

엔진에 export 추가(순수·결정론):

- `timeSegments(natal: NatalChart, day: DayGanZhi): TimeSegment[]`
  - 위 표의 4블록을 고정 순서(morning→day→evening→night)로 생성.
  - 각 블록 stance = 본인 favor/avoid에 따라(중화면 favor/avoid 모두 [] → 전부 neutral).
  - 내부에 `DAY_PARTS` 상수(part·zhi·wuXing 매핑)를 두고 `wuXingToGroup`·`favorableGroups` 재사용.
- `dailyCaution(natal: NatalChart, day: DayGanZhi): DailyCaution`
  - `avoidGroup`: `dayRelation(natal, day)`가 본인 avoid에 속하면 그 계열, 아니면 null.
  - `chong`: 일지(natal.day.zhi)×오늘 지지(day.pillar.zhi)가 충이면 true. (engine의 충 판정 로직 재사용 — `branchAdjust`가 private이면 충 여부만 보는 작은 헬퍼를 두거나 기존 ZHI_CHONG 재사용. 새 상수 중복은 최소화.)
  - `cautionPart`: `timeSegments`에서 stance==='avoid'인 첫 블록의 part, 없으면 null.
- `fortuneDetail(natal: NatalChart, day: DayGanZhi): FortuneDetail` = `{ segments: timeSegments(...), caution: dailyCaution(...) }`.
- `buildFortune`가 결과에 `detail: fortuneDetail(natal, day)`를 채우도록 한다(기존 점수/basis 경로 보존).

### 3) 테스트 + 픽스처

- `src/features/fortune/engine.test.ts`: `timeSegments`(길이 4·순서·각 part의 zhi/wuXing 고정·신강 vs 신약에서 같은 블록 stance가 뒤집히는지), `dailyCaution`(기신일 때 avoidGroup·충일 때 chong·cautionPart 선정), `buildFortune`가 detail을 채우는지 — 결정론으로 검증.
- `src/screens/diary/diary-ops.test.ts`의 `makeFortune` 픽스처에 `detail`을 채워 컴파일/테스트가 깨지지 않게 한다(고정 더미 detail).
- 그 외 FortuneResult를 직접 만드는 곳이 있으면(스모크 등) 동일하게 detail 추가. (`grep`로 `FortuneResult` 직접 생성처 확인 — 광범위 탐색 말고 타입 에러가 가리키는 곳만.)

### 4) `docs/ARCHITECTURE.md` §5 — 한 단락 추가

"시간대별 기운(四正 왕지 모델)"을 **해석 레이어**로 명시: 만세력 정밀 산출이 아니라 사정 왕지 오행 × 본인 희기로 흐름을 보여주는 결정론적 해석이며, 운명 단정이 아니라는 점, 土는 시간 흐름 미표현(단순화), 조심 포인트=기신+충 근거임을 1문단으로.

## Acceptance Criteria

```bash
npm run build    # tsc 0
npm test         # vitest 전부 통과(기존 + 신규)
npm run lint     # 0
```

## 검증 절차

1. AC 3개 실행.
2. 체크리스트:
   - CRITICAL #3: 시간대 stance·조심이 **부억/희기·충**이라는 기존 근거에서만 파생(새 유파·임의 길흉 도입 0). 결정론.
   - CRITICAL #1/#5: UI/Storage/네트워크 import 0, 새 의존성 0, RN 0. 순수 엔진.
   - `detail`이 FortuneResult 필수가 되며 모든 생성처가 갱신돼 빌드 green.
3. `phases/7-fortune-depth/index.json` step 0 갱신(완료/에러/blocked 규칙 동일 — summary에 추가한 export·타입 명시).

## 금지사항

- 한국어 문구를 만들지 마라(이 step은 구조만). 이유: 문구·톤은 step 1의 책임이고 한 곳에서 관리한다.
- `FortuneWidget.tsx`·`DiaryScreen.tsx`·`fortune-today.ts`·`phrases.ts`를 수정하지 마라. 이유: 각각 step 1/2 담당.
- 시간대별 길흉에 새 유파·새 상수표(임의 길시/흉시)를 도입하지 마라. 이유: CRITICAL #3 — 근거는 사정 왕지+본인 희기로 고정.
- 새 의존성·대량 파일 탐색 금지(#7). 기존 테스트를 깨뜨리지 마라.
