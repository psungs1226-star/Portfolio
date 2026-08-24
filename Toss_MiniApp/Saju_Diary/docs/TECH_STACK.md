# Evry Times — Tech Stack

> 함께 보기: [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)
> SDK·컴포넌트 레퍼런스: [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/)

## 플랫폼 / 빌드
- **앱인토스 미니앱 — 웹 React.** `@apps-in-toss/web-framework`(^2.7) 기반. React Native 아님(토스앱 WebView 호스팅).
- **언어:** TypeScript(~5.7). **번들러:** Vite(6). **엔트리:** `src/main.tsx`(`createRoot`+`TDSMobileAITProvider`).
- **설정:** `granite.config.ts`(appName `evrytimes` / brand{displayName "Evry Times", primaryColor #534AB7, icon} / permissions / web / outdir `dist`).
- **스캐폴드:** `npx create-ait-app evrytimes --inline --tds --skills --ai claude`.
- **커맨드:** dev `npm run dev`(granite dev) · build `npm run build`(ait build, `.ait` 산출) · deploy `ait deploy` · lint `eslint`.
- **테스트:** vitest(추가 예정) — 순수 로직 단위 테스트.

## UI
- **`@toss/tds-mobile`(^2.4) 컴포넌트 우선** + `@toss/tds-mobile-ait`(`TDSMobileAITProvider`).
- 본 앱에서 바로 쓰는 TDS: `Rating`(별점) · `BarChart`(월간 기분 그래프) · `Tabbar`(하단 4탭) · `Tab` · `ListRow`/`List` · `TextField`(+`.Clearable`) · `Switch`/`Checkbox` · `Top` · `Button`/`TextButton`/`IconButton` · `Badge` · `useBottomSheet`/`useDialog`/`useToast`.
- **스타일:** `@emotion/react` + inline style. **색/타이포:** `@toss/tds-colors`(`colors`, `adaptive`, 타이포 토큰 t1~t7·st1~st13). 하드코딩 대신 토큰.
- 포인트 보라 `#534AB7`(brand primaryColor) / 틴트 `#EEEDFE`. 모바일 폭 ~340, safe-area 적용.

## 앱인토스 SDK (`@apps-in-toss/web-framework`)
- 위치 `getCurrentLocation`(웹; `useGeolocation`은 RN 전용 미사용)
- 저장 `Storage`(setItem/getItem/removeItem/clearItems)
- 네트워크 `http` 모듈
- 공유 `share`(텍스트)/`getTossShareLink`/`contactsViral`
- 알림 `requestNotificationAgreement`(동의만, 이번 미사용) · 화면 safe-area/`openURL`/`closeView`

## 라이브러리 / 데이터
- **`lunar-javascript`(6tail, MIT)** — 만세력/팔자/일진/오행/십신/방위. 순수 JS·무의존(웹 번들 안전). 타입 없으면 `src/types/lunar-javascript.d.ts` 선언.
- 정적 데이터: `data/fortune-phrases.json`(문구뱅크), `data/tarot.json`(메이저22).
- **공공 API:** 기상청 단기예보(getVilageFcst) + 에어코리아 미세먼지 + 생활기상지수 자외선 (data.go.kr 인증키). 격자 변환은 자체 함수(Lambert Conformal Conic).

## 저장 / 백엔드
- **로컬 Storage만.** 서버/DB 없음(동기화·푸시 없음).
- *향후 옵션: Supabase 연동(앱인토스 WebView용 공식 가이드 존재) — 7월 이후.*

## 제외 기술
런타임 LLM(운세는 정적 계산), 외부 크롤링/라이선스 데이터, 서버 푸시(이번 미사용), 이미지 카드 공유(미지원), React Native 프리미티브.
