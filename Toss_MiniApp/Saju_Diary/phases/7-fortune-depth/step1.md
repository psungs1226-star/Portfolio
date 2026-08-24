# Step 1: detail-copy-bank (자세한 문구 + 회고형 일기 + 문구뱅크)

step 0의 구조화 detail(시간대 segments + caution)과 basis를 받아 **한국어 문구**로 조립하고, 필요한 문구 풀을 뱅크(JSON)에 채운다. 순수 로직 + 데이터만. UI는 step 2.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — **#2 문구 자체 작성**, **#3 정합**, #1 로컬, #5 스택, #7 예산)
- `docs/skills/tds-mobile.md`의 UX 라이팅 톤(해요체) — 또는 `https://developers-apps-in-toss.toss.im/design/ux-writing.md` 정신(해요체·능동·한 줄). 읽지 못하면 해요체·단정 예언 금지 원칙만 지켜라.
- `src/types/index.ts` (FortuneDetail, TimeSegment, DayPart, DailyCaution, FortuneBasis, FortuneStance, TenGodGroup, WuXing)
- `src/widgets/fortune-today.ts` (전부 — 특히 `buildBasisLine`, `groupWuXing`, WU_XING_NAME/SEASON/STRENGTH_LABEL 상수, `computeTodayFortune`)
- `src/features/fortune/phrases.ts` (전부 — 선택자/검증 패턴: `pickBandedPhrase`, `pickCategoryPhraseByScore`, `seed`/`seedIndex` 사용법, `validateBank`, MIN_* 상수)
- `src/features/fortune/phrases.test.ts` (뱅크/선택 테스트 패턴)
- `data/fortune-phrases.json` (schemaVersion 2 — iljin/phrases/banded 구조)
- `src/screens/diary/diary-ops.ts` (+ `diary-ops.test.ts`) — FortuneSnapshot, buildFortuneSnapshot

## 배경 (왜) — 톤이 핵심

사용자 피드백 두 가지:
1. **더 자세히, 서술/예측형:** "이런이런 사주로(내 사주 설명), 이 시간엔 이렇고 저 시간엔 저럴거다(시간대별), 오늘은 ~을 조심(주의점)." → **오늘(홈 위젯)** 문구는 서술·예측형. 예: "낮에는 추진력이 붙는 때예요", "저녁에는 한 박자 쉬어가요."
2. **일기는 회고/질문형:** "그렇게 ~해줘요가 문제가 아니라. 오늘의 사주는 이랬는데 어떠셨나요? 이런 느낌으로." → **일기**에서는 명령·약속("채워줘요")이 아니라 **지난 일을 돌아보게 하는 질문**. 예: "오늘은 재물 기운이 좋은 날이었어요. 어떤 선택을 하셨나요?"

두 맥락(오늘=예측서술 / 일기=회고질문)을 **분리**해 빌드한다. 단정적 예언("반드시", "꼭 ~된다")·운명 확정 금지. 해요체.

## 작업

### A) `src/widgets/fortune-today.ts` — 문구 빌더 추가(순수)

기존 `buildBasisLine`/상수를 재사용한다. 새 export:

1. **`describeChart(basis: FortuneBasis): string`** — "이런 사주" 설명(2문장 정도, 한 문자열에 줄바꿈 없이 또는 배열). 일간·오행 성정 + 신강/신약 + 계절 + **무엇이 필요한 사주인지(희신 방향)**. buildBasisLine보다 풍부. 예:
   - 신약: "일간 庚金, 여름에 태어나 기운이 빠진 신약 사주예요. 곁에서 받쳐주는 인성·비겁의 기운이 들어올 때 힘이 나요."
   - 신강: "일간 甲木, 봄 기운을 듬뿍 받은 신강 사주예요. 넘치는 힘을 식상·재성으로 풀어낼 때 일이 잘 풀려요."
   - 성정 한 조각은 일간 오행별 풀(아래 뱅크)에서 birthDate 시드로 고른다(사주는 고정 → 날짜 무관, salt 'chart').
2. **`buildSegmentLine(seg: TimeSegment, birthDate: string, dateKey: string): string`** — 한 시간대 한 줄. part 한글(아침/낮/저녁/밤) + 기운 서술. stance(favor/avoid/neutral)별 톤:
   - favor: 그 시간대가 본인에게 좋은 기운("~하기 좋은 때", "흐름을 타기 좋아요")
   - avoid: 무리 금지·완급("한 박자 쉬어가요", "욕심은 잠시 내려놔요") — 부드럽게, 겁주지 않기
   - neutral: 담백("무난하게 흘러요")
   - 문구는 (part × stance) 풀에서 (birthDate,dateKey,salt `seg|{part}`) 시드로 선택.
3. **`buildCautionLine(detail: FortuneDetail, basis: FortuneBasis): string | null`** — "오늘 조심" 한 줄. 우선순위로 한 줄 생성, 조심거리 없으면 null:
   - `caution.avoidGroup`이 있으면 그 계열 영역 주의(재성→지출/충동구매, 관성→윗사람·규칙·과로, 식상→말실수·과욕, 비겁→경쟁·고집, 인성→게으름·미루기). (계열→영역 풀에서 시드 선택)
   - `caution.chong`이면 변동·마찰 주의 한 조각 덧붙이거나 단독.
   - `cautionPart`가 있으면 "특히 {시간대}엔 ~" 결합 가능.
   - 톤: "~을 한 번 더 확인해요", "~은 서두르지 않기" 식 — 단정 예언·공포 조성 금지.
4. **`buildReflectiveLines(basis: FortuneBasis, detail: FortuneDetail): { summary: string; question: string }`** — **일기 회고형**. summary=그날 사주를 과거형으로 요약("오늘은 {계열} 기운이 도드라진 하루였어요"), question=돌아보게 하는 질문("그 기운, 어떻게 흘러갔나요?" / "오늘 {영역}은 어떠셨나요?"). 명령·약속 톤 금지. (question 풀에서 stance/계열 시드 선택)

모든 빌더는 순수·결정론(같은 입력 동일 출력), `seed`/`seedIndex`(engine) 또는 phrases의 선택자 재사용. LLM/서버/네트워크 0.

### B) `data/fortune-phrases.json` — 풀 추가(자체 작성·정합)

`schemaVersion`을 3으로 올리고 새 섹션 추가(기존 iljin/phrases/banded 보존):
- `chartTraits`: 일간 오행(木/火/土/金/水) × strength(strong/weak/balanced)별 성정/필요 조각. 각 ≥ 4후보.
- `segment`: part(morning/day/evening/night) × stance(favor/avoid/neutral)별 한 줄. 각 ≥ 4후보(총 4×3).
- `cautionArea`: 계열(비겁/식상/재성/관성/인성)별 "조심 영역" 한 줄. 각 ≥ 4후보.
- `cautionChong`: 충 주의 한 줄 ≥ 4후보.
- `reflectSummary`: 계열 또는 stance별 회고 요약 ≥ 4후보.
- `reflectQuestion`: 회고 질문 ≥ 6후보(공용 + 영역별 약간).

문구 규칙(강제): 자체 창작(외부 인용·라이선스 0, CRITICAL #2), 해요체, 한 줄, 단정 예언/공포/운명확정 금지, 사주 근거에서 벗어난 미신적 단정 금지(CRITICAL #3 — "흐름/기운"으로 표현). 같은 풀 내 후보는 의미가 겹치지 않게 다양하게.

### C) `src/features/fortune/phrases.ts` — 선택자 + 검증

- 새 풀 선택자 추가: `pickChartTrait(dayWuXing, strength, birthDate)`, `pickSegmentPhrase(part, stance, seedValue)`, `pickCautionArea(group, seedValue)`, `pickCautionChong(seedValue)`, `pickReflectSummary(key, seedValue)`, `pickReflectQuestion(seedValue)` 등(이름은 재량, fortune-today가 쓰기 좋게). 결정론.
- `validateBank`에 새 섹션 최소 후보 수 검증 추가(MIN 상수 신설: 예 `MIN_SEGMENT_CANDIDATES=4` 등). 누락/부족 시 실패하도록.
- 빌더가 직접 JSON을 읽기보다 phrases.ts 선택자를 통해 접근(기존 구조 일관).

### D) `src/screens/diary/diary-ops.ts` — 회고형 스냅샷

- `FortuneSnapshot`에 `basis?: FortuneBasis`와 `detail?: FortuneDetail`(또는 회고에 필요한 최소)와 회고 문자열을 저장할 수 있게 한다. **권장**: snapshot에 `basis`(작은 구조)만 복사 저장하고, 회고 문구는 표시 시점에 `buildReflectiveLines`로 만든다. (detail까지 저장하면 커지므로 회고에 필요한 basis 우선. 시간대 recap이 일기에 필요하면 detail도 저장 — 재량이되 스냅샷은 작게.)
- `buildFortuneSnapshot(result)`가 `result.basis`(이미 있음)와 회고용 데이터를 복사하도록 보강. 기존 basisLine 필드는 보존(하위호환). 반환은 입력과 독립된 새 객체(복사 저장 안전).

### E) 테스트

- `phrases.test.ts`: 새 풀 선택자 결정론·범위, validateBank가 새 섹션을 검증하는지(부족 시 실패).
- `fortune-today.test.ts`(있으면)·신규: describeChart/buildSegmentLine/buildCautionLine/buildReflectiveLines가 고정 입력에 결정론적이고 톤 규칙(예: avoid에서 공포 단어 없음 — 최소 스냅샷 검증)을 만족하는지. caution 없을 때 null.
- `diary-ops.test.ts`: buildFortuneSnapshot이 basis(회고용)를 복사하는지.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: CRITICAL #2(자체 문구)·#3(근거 정합·단정 예언 금지)·#1/#5(순수·새 의존성 0). 오늘=서술/예측, 일기=회고/질문 **톤 분리** 확인. 결정론.
3. `phases/7-fortune-depth/index.json` step 1 갱신(summary에 추가 export·JSON 섹션 명시).

## 금지사항

- `FortuneWidget.tsx`·`DiaryScreen.tsx`를 수정하지 마라(UI는 step 2). 단, diary-ops(순수)는 이 step에서 다룬다.
- 일기 문구에 명령·약속 톤("~해줘요", "~하세요")을 쓰지 마라. 이유: 사용자가 회고·질문형을 명시 요청. 일기는 돌아보게 한다.
- 외부에서 베껴온 운세 문구·타로 텍스트를 넣지 마라(CRITICAL #2). 사주 근거 없는 미신적 단정 금지(#3).
- 한 풀의 후보 수를 MIN 미만으로 두지 마라(validateBank 실패해야 함). 기존 풀/선택자 시그니처를 깨지 마라.
- 새 의존성·대량 탐색 금지(#7).
