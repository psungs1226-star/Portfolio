# Step 0: day-modulated-engine (시간대 = 오늘 일진 혼합 + 전문가 구조)

시간대별 기운이 **매일 일진에 따라 바뀌도록** 하고, 전문가 수준 문구에 필요한 구조(정확한 십신·득령/실령·지지 합충)를 엔진이 노출하게 한다. 순수 로직 + 타입만. 문구·UI는 step 1.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — **#3 주류 만세력 정합·근거 고정**, #1 로컬, #5 스택, #7 예산)
- `docs/ARCHITECTURE.md` §5(사주 엔진 — 부억/월령/희기, #12 四正 왕지 해석 레이어)
- `src/types/index.ts` (FortuneResult, FortuneBasis, FortuneDetail, TimeSegment, DayPart, DailyCaution, FortuneStance, TenGod, TenGodGroup, WuXing, DayGanZhi, NatalChart)
- `src/features/fortune/engine.ts` (전부 — 특히 `tenGod`(precise 십신), `dayMasterStrength`(내부 deLing 계산 line ~318), `wuXingToGroup`, `favorableGroups`, `ZHI_CHONG`/`ZHI_HE`/`branchAdjust`(private, line ~374~398), `timeSegments`/`dailyCaution`/`fortuneBasis`/`buildFortune`)
- `src/features/fortune/engine.test.ts`
- `src/screens/diary/diary-ops.test.ts`(makeFortune)·`src/features/share/index.test.ts`(makeFortune) — FortuneResult/Basis 직접 생성 픽스처(타입 추가 시 갱신)

## 배경 (왜)

사용자: "어지간하면 다 섞어라. 좀 전문가스러운 느낌이 나야지."

현재 `timeSegments`는 **본인 희기로만** 판정(day 미사용) → 매일 같은 패턴(정적). 일진을 섞어 **날마다 바뀌게** 하고, 전문가 느낌을 위해 **정확한 십신(정/편)·득령/실령·지지 합충**을 구조로 노출한다. 근거는 기존 부억/희기 + 六合/六沖에서만 — 새 유파·임의 길흉표 금지(CRITICAL #3).

## 작업

### 1) `src/types/index.ts` — 타입 보강

- `TimeSegment`에 일진 상호작용 필드 추가:
  ```ts
  export interface TimeSegment {
    part: DayPart;
    zhi: string;        // 왕지(卯/午/酉/子)
    wuXing: WuXing;
    group: TenGodGroup; // 그 시간대 오행의 십신 계열(본인 기준)
    stance: FortuneStance;
    /** 그 시간대 왕지와 오늘 일진 지지의 관계 — 합/충/같음/무. 문구·근거용. */
    dayBranch: 'he' | 'chong' | 'same' | 'none';
  }
  ```
- `FortuneBasis`에 전문가 표기용 필드 추가:
  ```ts
  export interface FortuneBasis {
    // ...기존...
    /** 일간×오늘 천간의 정확한 십신(정/편 구분). 예: '편재'. */
    todayTenGod: TenGod;
    /** 월령 득실 — true=得令(월지가 비겁/인성, 뿌리 든든), false=失令. */
    deLing: boolean;
  }
  ```

### 2) `src/features/fortune/engine.ts` — 일진 혼합 + 구조 노출

- **지지 관계 헬퍼 export:** `branchRelation(a: string, b: string): 'he' | 'chong' | 'same' | 'none'` — `a===b`면 'same', `ZHI_HE[a]===b`면 'he', `ZHI_CHONG[a]===b`면 'chong', else 'none'. (기존 ZHI_HE/ZHI_CHONG 재사용 — 새 표 금지.)
- **`timeSegments(natal, day)`가 day를 실제로 사용:** 각 블록(왕지 Zb, 오행 Wb)에 대해
  - 체질 base: `wuXingToGroup(natal.dayWuXing, Wb)`의 계열이 favor면 +1, avoid면 −1, neutral 0.
  - 일진 보정: `branchRelation(Zb, day.pillar.zhi)` → 'he'/'same' +1, 'chong' −1, 'none' 0.
  - blockScore = base + 보정. stance = score>0 favor / score<0 avoid / 0 neutral.
  - `dayBranch` = branchRelation 결과 그대로 채움.
  - 결과: **오늘 일진 지지에 따라 적어도 한 블록(충 들어온 블록)이 매일 반응** → 날마다 변동. 결정론.
- **`fortuneBasis(natal, day)`** 에 `todayTenGod: tenGod(natal.dayGan, day.pillar.gan)`(정확한 십신)와 `deLing`(월령 득실 — `wuXingToGroup(dayWuXing, 월지오행)`가 비겁/인성인지) 채우기. (deLing 계산이 dayMasterStrength 내부와 중복되면 작은 내부 헬퍼로 공유하되 동작 동일.)
- `dailyCaution`의 `cautionPart`는 이제 day-변동 segments 기준으로 자연히 매일 달라짐(로직 유지).

### 3) 테스트 + 픽스처

- `engine.test.ts`: `branchRelation`(he/chong/same/none); `timeSegments`가 **서로 다른 일진 지지**에 대해 stance/dayBranch가 달라지는지(예: 일진 지지=午 → 밤(子) 충→avoid 경향, 일진 지지=丑 → 밤(子) 합→favor 경향), 동일 일진은 동일 결과(결정론); `fortuneBasis.todayTenGod`(정확 십신)·`deLing` 검증.
- `diary-ops.test.ts`·`share/index.test.ts`의 makeFortune 픽스처에 `todayTenGod`·`deLing`·segment `dayBranch` 추가(컴파일/테스트 green).

### 4) `docs/ARCHITECTURE.md` §5 — 갱신

#12(시간대 해석 레이어)를 **일진 혼합**으로 갱신: 시간대 stance = 사정 왕지 오행 체질 희기 ± 오늘 일진 지지와의 六合(+)/六沖(−)/同(+) → **매일 변동**, 근거는 기존 합충표·희기에서만 파생(새 유파 0), 정확한 십신·득령/실령을 표기 근거로 노출함을 1문단으로.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: CRITICAL #3(합충×희기에서만 파생·임의 길흉 0·결정론), #1/#5(순수·새 의존성 0·RN 0·문구 0). 같은 사람도 일진 따라 시간대 stance가 날마다 변동되는지(핵심).
3. `phases/8-fortune-expert/index.json` step 0 갱신(summary에 추가 export/타입 명시).

## 금지사항

- 한국어 문구 생성 금지(step 1). `FortuneWidget.tsx`·`DiaryScreen.tsx`·`fortune-today.ts`·`phrases.ts` 수정 금지(각 step 1/별도).
- 새 유파·임의 길시/흉시·삼합/방합 표 추가 금지(v1은 六合/六沖만, #3). 시간대 변동 근거는 합충×희기로 고정.
- 새 의존성·대량 탐색 금지(#7). 기존 테스트·시그니처 깨지 마라(timeSegments는 이제 day 사용 — 호출부 그대로 동작).
