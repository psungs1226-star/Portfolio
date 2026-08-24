# CLAUDE.md — Evry Times (evrytimes)

> 앱인토스 바이브코딩 챌린지 출품작. 매일 여는 개인화 데일리 대시보드 미니앱.
> 상세 기획·설계는 `docs/` 참조: [PRD](docs/PRD.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [TECH_STACK](docs/TECH_STACK.md) · [MONETIZATION](docs/MONETIZATION.md)
> SDK·컴포넌트 레퍼런스: [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/) (벤더 문서 사본은 포트폴리오 공개분에서 제외)

## 프로젝트 개요
- **앱 이름:** Evry Times / **appName:** `evrytimes`
- **한 줄:** 날씨·사주 운세·D-day·메모·일기를 "오늘"이라는 한 축에 모은 개인화 홈. 간판 = 사주 운세.
- **플랫폼:** 앱인토스 미니앱 — **`@apps-in-toss/web-framework`(React 18 + react-dom + Vite) 웹 React**. (React Native 아님. `<div>`+inline style / `@emotion/react`.)

## 기술 스택 (실측 — create-ait-app 산출물)
- **프레임워크:** `@apps-in-toss/web-framework` ^2.7 · React 18 · react-dom 18 · Vite 6 · TypeScript
- **UI:** `@toss/tds-mobile`(TDS 컴포넌트) + `@toss/tds-mobile-ait`(`TDSMobileAITProvider`) + `@toss/tds-colors`(`colors`, `adaptive`, 타이포 토큰 t1~t7/st1~st13) + `@emotion/react`
- **설정:** `granite.config.ts`(appName/brand/permissions/web/outdir)
- **엔트리:** `src/main.tsx`(`createRoot` + `TDSMobileAITProvider`), `src/App.tsx`

## 빌드 / 테스트 커맨드
```bash
npm run dev       # granite dev (로컬 개발)
npm run build     # ait build (.ait 산출, 에러 0)
npm test          # vitest run (순수 로직 단위 테스트)
npm run lint      # eslint
```
- 순수 로직 모듈(types·storage·saju-engine·grid-convert·share-builder 등)은 반드시 단위 테스트(vitest)를 동반한다.

## 자주 쓰는 TDS 컴포넌트 (재구현 금지, 이걸 쓴다)
- 별점: **`Rating`** / 기분 그래프: **`BarChart`** / 하단 탭: **`Tabbar`**·상단 탭: `Tab`
- 리스트: `ListRow`/`List` · 입력: `TextField`(+`.Clearable`) · 토글: `Switch`/`Checkbox`
- 상단 영역: `Top` · 카드 버튼: `Button`/`TextButton`/`IconButton` · 뱃지: `Badge`
- 바텀시트/다이얼로그/토스트: `useBottomSheet`/`useDialog`/`useToast`(`@toss/tds-mobile`)
- 색/타이포: `import { colors, adaptive } from '@toss/tds-colors'` — 하드코딩 대신 토큰 사용

## CRITICAL 규칙 (위반 금지)
1. **로컬 저장 전용.** 데이터는 앱인토스 `Storage`(setItem/getItem/removeItem)에만 저장. 자체 서버/DB·외부 백엔드 전송 금지. (예외: 날씨 공공 API 읽기.) 이유: 로컬-only 확정, 개인정보(생일·일기) 기기 밖 금지.
2. **데이터 조달 IP 리스크 0.** 외부 크롤링·라이선스 데이터 금지. 운세=자체 계산, 날씨=공공 API(기상청/에어코리아), 나머지=사용자 입력. 이유: 챌린지 IP 규정.
3. **사주는 주류 만세력 디폴트에 정합.** 입춘 년주·절기 월주·60갑자 일주·음력/윤달은 `lunar-javascript`(MIT)에 위임, 직접 재구현 금지. 유파 갈리는 지점(야자시·경도보정)은 주류 디폴트 + 캘리브레이션 검증. 이유: "우리만 사주가 다르다" = 신뢰 파괴.
4. **컨테스트 빌드에 수익화 코드 금지.** 결제(IAP/subscription)·광고 SDK 활성화 금지. 콘텐츠 모델에 `tier: 'free' | 'premium'` 플래그만(토글 off). 이유: AU 마찰 + 단순 리워드성 규정. 수익화는 7/26 이후.
5. **스택 고정 = 웹 React + TDS.** `@apps-in-toss/web-framework` + React DOM + `@toss/tds-mobile`. React Native 프리미티브(View/Text/Image from react-native) 쓰지 마라. 임의 UI 프레임워크·상태관리 라이브러리 추가 금지. UI는 TDS 우선, 스타일은 inline/@emotion + tds-colors 토큰.
6. **푸시/로컬 알림 사용 금지(이번).** 클라 로컬 알림 불가, 실발송은 서버 필요. 재방문은 운세 일일 갱신+공유로 유도.
7. **컨텍스트 예산.** 각 step은 step 파일의 "읽어야 할 파일" 목록만 읽는다. src 전체·벤더 SDK 문서 통째로 임의 로드 금지(step당 입출력 300K 토큰 이내).
8. **시인성·강조 최우선(UI 철칙 — 반복 피드백).** 색을 옅게·비슷비슷·반투명으로 깔지 마라. 강조 요소(별점·하트·뱃지·점수·포인트·CTA)는 **채도 높고 대비 큰 색으로 한눈에 확 띄게**. "은은하게/파스텔이라" 핑계로 흐릿하게 두지 말 것 — 배경만 파스텔, **강조는 선명**. 여백은 최소화(사용자는 빈 공간을 싫어함). 변경 후엔 반드시 **직접 렌더(스크린샷)로 시인성 확인** 후 보고. 이유: "시인성 안 좋다 / 색이 옅다 / 강조가 없다 / 여백이 크다"가 가장 자주 반복된 지적.

## 데이터 모델 (로컬 Storage, 권위 출처 = docs/ARCHITECTURE.md §4)
```
settings: { widgets:[{type,enabled,size,order}],
            weather:{regions:[{name,lat,lon,nx,ny}]},   // 최대 2
            saju:{ birthDate, birthTime?, isLunar, cached:{...} } }
diaries: [{ date, mood, weatherSnapshot, fortuneSnapshot, text }]
memos:   [{ id, date, text, checked, isTodo }]
ddays:   [{ id, title, targetDate, size }]
```
- 위젯 type: `weather|fortune|dday|memo|diary`, size: `small|medium|large`.
- Storage 키 네임스페이스: `evrytimes:settings` 등.

## Harness 워크플로우
- 구현은 `phases/{phase}/step{N}.md` 단위로 `python3 scripts/execute.py {phase}` 실행.
- 각 step 완료 시 `phases/{phase}/index.json`의 status/summary 갱신.
- 변경 검토는 `/review` 스킬: 이 CLAUDE.md + docs/ARCHITECTURE.md 기준.
