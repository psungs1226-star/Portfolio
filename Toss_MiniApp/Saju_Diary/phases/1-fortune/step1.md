# Step 1: saju-engine

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md` (CRITICAL #3)
- `/docs/ARCHITECTURE.md` (§5 사주 엔진 — 파이프라인 3~5)
- `src/types/index.ts`, `src/features/fortune/manse.ts` (이전 step)

## 작업
만세력 산출값을 받아 **결정론적 운세 결과**를 만드는 순수 해석 엔진. 랜덤 금지(문구 선택의 시드 외).

`src/features/fortune/engine.ts`:
- `tenGod(dayStem, otherStem): TenGod` — 일간과 상대 천간을 오행 생극 + 음양으로 비교해 십신 10종 판정.
  - 생: 木→火→土→金→水→木 / 극: 木→土→水→火→金→木
  - 같은 오행(동음양=비견/이음양=겁재), 일간이 생(식신/상관), 일간이 극(편재/정재), 일간을 극(편관/정관), 일간을 생(편인/정인).
- `totalScore(natal, day): 1|2|3|4|5` — 십신 유형별 기본 길흉 + 일지/오늘 지지 충·합 가감.
- `subFortunes(natal, day)` — 재물(재성 강도+재신 방위), 애정(성별 관점), 건강·안정(인성/비겁).
- `luckyColor(natal): WuXing→색` (木초록·火빨강·土노랑·金흰색·水검정), `luckyDirection(day)` = 그날 재신/희신 방위.
- `buildFortune(natal, day, opts): FortuneResult` — 위를 모아 FortuneResult 조립(문구는 비워두고 다음 step에서 주입하는 구조, 또는 phraseProvider 콜백 주입).

핵심 규칙: 모든 함수는 **순수·결정론적**. 입력 같으면 출력 같아야 한다.

## Acceptance Criteria
```bash
npm run build
npm test    # tenGod 10케이스 + totalScore 경계 테스트 통과
```
- 테스트: 십신 10종이 각각 올바른 케이스를 반환 / 동일 입력 동일 출력(결정론).

## 검증 절차
1. AC 실행.
2. 체크리스트: 순수 함수(부수효과·랜덤 없음) / 오행 생극 규칙 정확 / 타입 재사용.
3. `phases/1-fortune/index.json` step1 업데이트(summary에 export 함수·점수 규칙 요약).

## 금지사항
- `Math.random()`을 쓰지 마라. 이유: 같은 날 재진입 시 결과가 바뀌면 신뢰 붕괴(결정론 원칙).
- UI/Storage를 import하지 마라. 이유: 엔진은 순수 로직.
