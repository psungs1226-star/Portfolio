# Step 0: cute-tokens-header (귀여운 파스텔 토큰 + 상단 로고/앱이름 헤더)

전체 비주얼 기반을 깐다: **파스텔 소프트** 디자인 토큰(라벤더+피치)과, 앱 상단에 **로고 + Evry Times** 헤더. 이후 step들이 이 토큰을 재사용한다.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #5 웹 React+TDS·RN/라이브러리 금지, #7 예산)
- `src/theme/tokens.ts` (palette/spacing/radius/elevation/BRAND — 여기에 cute 토큰 추가)
- `src/App.tsx` (셸 — `<main>{renderScreen(tab)}</main> + <BottomTabBar>`, gate)
- `src/components/index.ts` (공용 컴포넌트 배럴 — AppHeader export 위치)
- `public/` (logo-192.png, logo-512.png 존재)
- `src/screens/today/TodayScreen.tsx` (홈 상단 Top — 헤더와 중복되지 않게 조정 참고)

## 배경 (사용자 피드백)

- **#9:** "사주랑 일기, 이런류는 무조건 여성용이라 디자인이 귀여워야." → 디자인 방향 **파스텔 소프트(라벤더+피치, 둥근 카드, 부드러운 그림자, 친근)** 확정. 토큰화해서 일관 적용.
- **#10:** "로고랑 우리 어플이름 상단에 왜 안넣어놔." → 앱 상단에 로고 + "Evry Times".

## 작업

### A) `src/theme/tokens.ts` — cute 토큰 추가(기존 토큰 보존)
- 파스텔 소프트 팔레트 추가(예시 hex — 보기 좋게 조정 가능, BRAND #534AB7와 어울리게):
  ```ts
  export const cute = {
    lavender: '#8B7FE8', lavenderBg: '#F3F0FF',
    peach: '#FF9E80', peachBg: '#FFF1EA',
    pink: '#FF8FB1', pinkBg: '#FFEAF1',
    cream: '#FFFBF5',
    softShadow: '0 6px 20px rgba(123, 97, 255, 0.12)',
  } as const;
  ```
- radius에 큰 둥글기 추가: `cute: 24`(또는 lg 활용). 기존 radius/elevation 유지.
- 하드코딩 남발 금지 — 이후 step은 이 cute 토큰을 참조.

### B) `src/components/AppHeader.tsx` 신설 + 배럴 export
- 상단 헤더: 왼쪽 **로고**(`<img src="/logo-192.png" width=28 height=28 alt="" />`, 웹 img·RN 금지) + **"Evry Times"** 워드마크(브랜드 보라/라벤더, 둥근 느낌). 작고 깔끔하게(높이 ~52px), safe-area 상단 패딩 고려(`env(safe-area-inset-top)`).
- props 최소(`{ right?: ReactNode }` 정도). inline style + 토큰.

### C) `src/App.tsx` — 헤더 배치
- gate==='app'일 때 `<AppHeader />`를 `<main>` 위에 고정/상단 렌더. 콘텐츠가 헤더에 가리지 않게 여백 처리(헤더가 sticky면 main padding 불필요).
- 온보딩/오버레이(FortuneScreen) 화면은 자체 상단이 있으니 중복 노출하지 않게(앱 셸 헤더는 탭 화면에만, 또는 온보딩 제외). 기존 gate/overlay/탭 로직 보존.
- TodayScreen의 큰 Top "오늘"과 **이중 타이틀로 어색하지 않게** 조정(예: 헤더는 브랜드, Top은 화면 제목 — 간격/크기만 자연스럽게). 과한 리팩터 금지.

### D) 스모크
- AppHeader 렌더(로고 img + 앱이름) 크래시 0. App 스모크가 헤더 포함해 마운트되는지.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: 상단에 로고+Evry Times 보임. cute 토큰 추가됨(이후 step 재사용). CRITICAL #5(웹 img/TDS·새 라이브러리 0·RN 0·inline+토큰).
3. `phases/11-cute-records/index.json` step 0 갱신(summary에 cute 토큰·AppHeader 명시 — 이후 step이 참조).

## 금지사항

- 기존 palette/spacing/radius를 깨지 마라(추가만). 이미지 RN `Image` 금지(웹 `<img>`). 새 라이브러리·폰트 패키지 설치 금지(#5).
- D-day/메모/캘린더/운세/일기 화면 로직은 건드리지 마라(다른 step — 여기선 토큰+헤더 기반만). 대량 탐색 금지(#7).
