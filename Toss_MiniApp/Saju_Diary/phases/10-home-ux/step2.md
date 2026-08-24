# Step 2: fortune-screen-tarot (운세 = 별도 화면 + 홈 요약 + 타로 뽑기)

운세를 홈에서 펼치는 드롭다운 대신 **별도 운세 화면**으로 연다. 홈에는 **요약식**만 보여주고, 상세는 운세 화면에서. 타로는 **카드 뽑기(탭해서 뒤집기)** 로.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 웹 React+TDS·RN/라우터 라이브러리 금지, #7 예산)
- `src/App.tsx` (셸 — gate + tab 상태, `<main>{renderScreen(tab)}</main> + <BottomTabBar>`; 오버레이 화면을 여기서 관리)
- `src/screens/today/TodayScreen.tsx` (FortuneWidget 렌더·`onNavigate` 패턴)
- `src/widgets/FortuneWidget.tsx` (현재 압축 1행 + 인라인 펼침 FortuneDetail — 펼침 제거, 요약 카드로)
- `src/widgets/fortune-today.ts` (`computeTodayFortune` → `TodayFortune.result/phrases/detailText`, `buildBasisLine`)
- `src/types/index.ts` (FortuneResult, FortuneDetail, TarotCard, SajuInput)
- `src/screens/index.ts` (스크린 배럴 — 새 화면 export 위치)
- `src/theme/tokens.ts`, `src/components` (Card, Rating, Badge)

## 배경 (사용자 피드백)

- **#2:** "운세는 드롭식이 아니라 별도 운세창으로 입력되게 만들고, 문장단위로 적지말고 요약식으로 일단 보여줘라." → 홈=요약(짧게), 상세=별도 화면.
- **#3(타로):** "타로는 또 타로카드 뽑게해주기라도 해야지." → 자동 노출 말고 **뒷면 카드를 탭해 뒤집어 뽑는** 인터랙션.

## 작업

### A) 별도 운세 화면 네비게이션 (App 오버레이 — 라우터 라이브러리 0)
- `App.tsx`에 오버레이 상태 추가: `const [overlay, setOverlay] = useState<null | 'fortune'>(null)`.
- `overlay === 'fortune'`이면 탭/홈 위에 **풀스크린 `FortuneScreen`** 렌더(상단 뒤로가기). 닫으면 `setOverlay(null)`.
- `TodayScreen`에 `onOpenFortune?: () => void` prop 추가 → App에서 `() => setOverlay('fortune')` 주입. `TodayScreen`은 이를 `FortuneWidget`에 넘긴다.
- 기존 `onNavigate`(탭 전환)·gate 로직 보존.

### B) `FortuneWidget.tsx` — 홈 요약 카드(펼침 제거)
- 인라인 `expanded`/`FortuneDetail` 제거. 홈 카드는 **요약식**:
  - 별점(Rating) + 일진 뱃지 + **짧은 요약**(문장 나열 X — 예: "오늘 ⭐⭐⭐⭐ · 재물 좋음 · 낮에 추진력" 같은 핵심 키워드 요약 한 줄, 또는 별점+오늘의 십신+핵심 1개). `phrases.overall` 전체 문장 대신 압축.
  - 우측 "운세 보기 ›" → `onRequestOpen?.()` 호출(상세 화면 열기). props에 `onRequestOpen?: () => void` 추가.
  - 생일 미입력 CTA(BirthCTA)·onRequestBirth는 유지.
- 요약 카피 압축 헬퍼는 fortune-today에 추가해도 됨(예: `buildSummaryLine(result)` — 키워드형). 단정 예언 금지·기존 톤 규칙 유지.

### C) `src/screens/fortune/FortuneScreen.tsx` 신설
- props: `{ saju: SajuInput; today?: string; gender?; natal?; onClose: () => void }`.
- `computeTodayFortune(saju, today, ...)`로 산출(만세력/점수 재구현 금지 — 재사용).
- 표시(상세, 기존 FortuneDetail 내용 이전 + 정돈): 내 사주(detailText.chart) → 시간대별 기운(detailText.segments) → 오늘 조심(detailText.caution) → 세부운(재물/애정/건강) → 행운색/방향 → 오늘의 일진 → 한 줄 조언 → **타로(뽑기)**.
- 상단 뒤로가기(`onClose`) + 타이틀(TDS Top 또는 헤더). 스크롤 가능.

### D) 타로 뽑기 인터랙션 (FortuneScreen 내)
- 결과 카드(`result.tarot`)는 이미 그날 결정론적으로 정해져 있다(같은 날 같은 카드 — 재현성 유지). UX만 "뽑기"로:
  - 처음엔 **뒷면 카드** + "탭해서 오늘의 타로 뽑기" 안내.
  - 탭하면 뒤집혀 `result.tarot`(이름·정/역·의미) 공개. 간단한 뒤집기/페이드(인라인 CSS transition, 라이브러리 0).
  - 같은 날 다시 들어와 뽑으면 같은 카드(결정론) — "오늘의 카드는 정해져 있어요" 느낌. 재추첨 버튼은 만들지 마라(일일 1장).
- 상태는 화면 로컬(useState revealed). 저장 불필요.

### E) 정리/스모크
- 홈 FortuneWidget에서 더 이상 상세를 인라인으로 렌더하지 않음(요약+열기). 기존 FortuneDetail 마크업은 FortuneScreen으로 이전(중복 제거).
- `src/__smoke__`: FortuneScreen 마운트(saju seed)·타로 탭 전후 크래시 0; FortuneWidget 요약 카드 렌더·onRequestOpen 콜백; App 오버레이 열고 닫기(간단).

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - 홈 운세=요약(드롭다운 없음), "운세 보기"→별도 화면. 상세는 화면에서. 타로=탭해서 뽑기(일일 결정론 유지).
   - CRITICAL #5: 라우터/애니메이션 라이브러리 0, RN 0, TDS/웹+inline. CRITICAL #1: 계산 메모리·저장 storage만.
3. `phases/10-home-ux/index.json` step 2 갱신(summary에 신설 FortuneScreen·App 오버레이 명시).

## 금지사항

- 홈에서 운세를 인라인 드롭다운으로 펼치지 마라(#2 — 별도 화면). 홈 요약을 긴 문장 나열로 두지 마라(요약식).
- 타로를 자동 공개로 두지 마라(뽑기 인터랙션). 일일 재추첨/랜덤 금지(결정론 유지).
- 라우팅/제스처/애니메이션 라이브러리 도입 금지(#5). 만세력·점수 재계산 금지(fortune-today 재사용). 새 의존성·대량 탐색 금지(#7).
