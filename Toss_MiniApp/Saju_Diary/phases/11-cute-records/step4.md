# Step 4: fortune-home-redesign (홈 사주 = 별자리 이미지 + 운별 별점 + 기본 샘플)

홈 사주 카드를 **이미지 자리(별자리) + 전체/재물/애정/건강을 별점(몇 칸)으로** 보여주는 형태로 바꾸고, 생일이 없어도 **기본 샘플값**이 보이게 한다(빈 CTA만 두지 않기). 파스텔 소프트 톤.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 웹 React+TDS·RN/라이브러리 금지, #7 예산)
- `src/widgets/FortuneWidget.tsx` (현재 — 요약 카드 + "운세 보기 ›" + BirthCTA + onRequestOpen/onRequestBirth)
- `src/widgets/fortune-today.ts` (`computeTodayFortune`, `TodayFortune.result.{overall,scores}`, `buildSummaryLine`)
- `src/screens/today/TodayScreen.tsx` (FortuneWidget에 saju/onOpenFortune 주입)
- `src/types/index.ts` (FortuneResult.scores{wealth,love,health}, SajuInput)
- `src/theme/tokens.ts` (cute 토큰 — step 0: lavender/peach/softShadow/radius.cute)
- `src/components` (Rating 재노출), `public/`(이미지 자리용 자산)

## 배경 (사용자 피드백)

- **#8:** "홈 사주는 별자리에 이미지 넣을거고, 나머지에 전체·00운·00운…을 별 몇칸인지 만들어서 보이게만." → 홈 카드 = **이미지 자리(별자리/사인)** + **전체운/재물운/애정운/건강운 각각 별점(Rating)** 표시만. 상세는 운세 화면(이미 별도).
- **#7:** "사주운세도 초기화면에서 디폴트값으로 넣어놔." → 생일 미입력이어도 **샘플 기본값**(별점)이 보이고, "내 생일 넣기"로 개인화 유도(빈 홈/맨 CTA 금지).

## 작업

### A) `FortuneWidget.tsx` — 별점 그리드 카드
- 레이아웃(파스텔 카드, cute 토큰 — lavenderBg/softShadow/둥근 모서리):
  - **왼쪽: 이미지 자리**(별자리/사인). 지금은 placeholder(`<img>` 또는 둥근 파스텔 박스 + 이모지 ✨/🔮). 나중에 별자리 이미지로 교체 가능하게 분리(예: `signImage?: string` prop 또는 고정 placeholder + 주석 "별자리 이미지 자리"). 웹 `<img>`만(RN 금지).
  - **오른쪽: 운별 별점**(표시 전용, TDS `Rating` readOnly):
    - 전체운 = `result.overall`
    - 재물운 = `result.scores.wealth`
    - 애정운 = `result.scores.love`
    - 건강운 = `result.scores.health`
    - 각 줄: 라벨 + 별점(몇 칸). 긴 문장 나열 금지(별점 위주, "보이게만").
  - 하단/우측에 **"운세 보기 ›"** → `onRequestOpen?.()`(상세 화면, 기존).
- 압축/요약 카피(buildSummaryLine)는 선택적으로 한 줄만(없어도 됨 — 별점이 주인공).

### B) 기본 샘플값(#7) — 생일 미입력 처리
- saju 없거나 birthDate 빈 경우: BirthCTA만 두지 말고 **샘플 운세 별점**을 보여준다.
  - 방법: 고정 샘플 생일(예: '2000-01-01')로 `computeTodayFortune` 산출해 별점 표시 + **"예시예요 · 내 생일 넣고 내 운세 보기"** 배너/버튼(`onRequestBirth`). (샘플임을 분명히 표기 — 오해 금지.)
  - 탭/CTA → `onRequestBirth?.()`(설정 생일 입력으로, 기존 동작).
- saju 있으면 실제 값. 같은 입력·같은 날 동일(결정론) 유지. 만세력/점수 재계산 금지(fortune-today 재사용).

### C) 스모크
- FortuneWidget: saju 있을 때 4개 운 별점 렌더 + "운세 보기" 콜백; saju 없을 때 **샘플 별점 + 생일 넣기 배너** 렌더(빈 CTA 아님). 크래시 0.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: 홈 사주 = 이미지 자리 + 전체/재물/애정/건강 별점(표시 전용), "운세 보기"로 상세. 생일 없으면 샘플 기본값+개인화 유도(빈 화면 아님). 파스텔 톤. CRITICAL #1·#5.
3. `phases/11-cute-records/index.json` step 4 갱신.

## 금지사항

- 홈 사주를 긴 문장 나열로 두지 마라(별점 위주 "보이게만", #8). 샘플을 실제 내 운세처럼 오인되게 표기하지 마라("예시" 명시).
- 별자리 이미지를 외부에서 무단 가져오지 마라(placeholder/추후 교체 자리). 만세력 재계산 금지. 일기·캘린더·헤더는 건드리지 마라(다른 step). 새 의존성·대량 탐색 금지(#7).
