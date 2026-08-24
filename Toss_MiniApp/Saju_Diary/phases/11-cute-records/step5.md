# Step 5: cute-fortune-diary (사주·일기 파스텔 소프트 리디자인)

운세 화면과 일기(위젯·화면)를 **파스텔 소프트(라벤더+피치, 둥근 카드, 부드러운 그림자, 친근)** 톤으로 다듬는다. 기능은 그대로, 비주얼만.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 웹 React+TDS·RN/라이브러리 금지, #7 예산)
- `src/theme/tokens.ts` (step 0의 cute 토큰: lavender/lavenderBg/peach/peachBg/pink/cream/softShadow, radius.cute)
- `src/screens/fortune/FortuneScreen.tsx` (운세 상세 화면 — step 10에서 신설)
- `src/widgets/FortuneWidget.tsx` (step 4에서 별점 카드 — 톤만 보강)
- `src/widgets/DiaryWidget.tsx` (홈 일기 위젯 — step 10)
- `src/screens/diary/DiaryScreen.tsx` (일기 작성 화면)
- `src/components/Card.tsx` (공용 카드 — 톤 변형 가능 여부 확인)

## 배경 (사용자 피드백)

"#9 사주랑 일기, 이런류는 무조건 여성용이라 디자인이 귀여워야." → 방향 확정 = **파스텔 소프트**. 이 step에서 운세·일기에 일관 적용.

## 작업

적용 원칙(모두 cute 토큰 + inline style, 새 라이브러리/폰트 0):
- **색:** 카드 배경에 lavenderBg/peachBg/cream, 포인트는 lavender/peach/pink. 과채도 금지(은은).
- **모양:** 더 둥근 모서리(radius.cute ~20-24), 부드러운 그림자(softShadow), 여백 넉넉.
- **친근:** 섹션에 작은 이모지/아이콘(✨🔮🌙💗📖 등 — 텍스트 이모지, 새 에셋 0), 부드러운 라벨. 별점·뱃지는 TDS 유지(재구현 금지).

대상:
1. **FortuneScreen** — 헤더·각 섹션(내 사주/시간대별/조심/세부운/행운/타로) 카드에 파스텔 톤·둥근 카드·이모지 헤딩. 타로 카드 뒷면/공개를 더 귀엽게(파스텔 카드). 가독성 유지.
2. **FortuneWidget(홈)** — step 4 별점 카드에 파스텔 배경·softShadow·둥근 모서리로 마감(레이아웃 변경 X, 톤만).
3. **DiaryWidget(홈)** — 일기 요약/CTA 카드를 파스텔·둥근·친근하게(별점·발췌 유지).
4. **DiaryScreen** — 작성 화면(기분 별점·본문·그날의 기록·완료한 일·저장)을 파스텔 톤으로. 입력 가독성·접근성 유지.

주의:
- 명도 대비(접근성) 유지 — 연한 배경 위 텍스트 충분히 진하게. 다크모드 토큰(adaptive)과 충돌하지 않게(과한 고정 hex 남발 자제, cute 토큰 경유).
- 기능/마크업 구조·테스트 셀렉터를 깨지 않게(스타일 위주). 다른 위젯(날씨·메모·D-day·캘린더)은 이 step 범위 밖(톤 통일은 후속 — 단, 명백히 어색하면 최소 보정 가능).

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: 운세 화면·홈 운세·일기 위젯·일기 화면이 파스텔 소프트로 통일, 가독성/접근성 유지, 기능 무변경. CRITICAL #5(새 라이브러리/폰트/RN 0·inline+토큰), #1(저장 storage만).
3. `phases/11-cute-records/index.json` step 5 갱신 + 모든 step 일관 확인.

## 금지사항

- 기능/데이터 흐름·테스트를 깨지 마라(비주얼 위주). 새 폰트·아이콘 패키지·애니메이션 라이브러리 설치 금지(#5 — 텍스트 이모지/CSS만).
- 명도 대비를 해치는 과한 연색 텍스트 금지(접근성). cute 토큰 우회 없이 하드코딩 색 남발 금지. 메모/캘린더/헤더 로직은 건드리지 마라(다른 step).
