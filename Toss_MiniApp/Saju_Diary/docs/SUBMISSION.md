# SUBMISSION — Evry Times 콘솔 제출 체크리스트 (6/30 첫 빌드)

> 앱인토스 바이브코딩 챌린지 제출용. 빌드 산출물 `evrytimes.ait`를 콘솔에 업로드하고 신청폼을 제출하기 전 점검.
> 권위 출처: [PRD.md](./PRD.md)(§9~§14) · [ARCHITECTURE.md](./ARCHITECTURE.md)(§1) · [/CLAUDE.md](../CLAUDE.md)(CRITICAL 1~7).

---

## 1. 빌드 산출물 (코드 — 완료)

| 항목 | 상태 | 비고 |
|---|---|---|
| `npm run build` (`ait build`) | ✅ 에러 0, `.ait` 산출 | 산출물: `evrytimes.ait` (루트), `dist/` |
| `npm test` (vitest) | ✅ 전체 통과 | 순수 로직 모듈 단위 테스트 |
| `npm run lint` (eslint) | ✅ 무에러 | |
| 수익화 코드 (CRITICAL #4) | ✅ 활성 코드 0 | 결제(IAP/subscription)·광고(AdMob/Banner) SDK 미사용. `Tier='free'\|'premium'` 타입만 존재(미사용·토글 off) |
| 로컬 전용 저장 (CRITICAL #1) | ✅ | 모든 사용자 데이터 = 앱인토스 `Storage`. 외부 전송 0. 예외: 날씨 공공 API **읽기**만 |
| 외부 호출 도메인 (CRITICAL #2) | ✅ 공공 API만 | `apis.data.go.kr` (기상청 단기예보·에어코리아 미세먼지·생활기상지수 자외선). 크롤링·라이선스 데이터 0 |
| safe-area | ✅ | 앱 셸 하단 탭(`env(safe-area-inset-bottom)`) · 온보딩 CTA · TDS `Top` 상단. PRD §11 |
| 개인정보 고지 노출 | ✅ | 온보딩 2개소 + 위젯(설정) 탭 하단 상시 1줄. PRD §12 |

---

## 2. 콘솔 등록 필요 항목 (사용자 수동 — 코드 밖)

앱인토스 개발자센터 콘솔에서 미니앱 등록 시 입력. (빌드 블로커 아님)

- [ ] **appName**: `evrytimes` (granite.config.ts와 일치 — 변경 금지)
- [ ] **앱 이름(displayName)**: `사주다이어리` (granite.config.ts·index.html·AppHeader 일치)
- [ ] **앱 로고/아이콘**: 원본 `Logos/로고.png`(600×600) → `public/logo-512/192/32.png` 생성, `granite.config.ts`의 `brand.icon: "/logo-512.png"` 설정 완료. 콘솔 업로드 시 512px 아이콘 사용. (AU 1순위 전환 레버, PRD §9)
- [ ] **리스팅 썸네일**: `Logos/썸네일.png`(1932×828) — 콘솔 등록 시 업로드(번들 미포함).
- [ ] **한 줄 카피**: 테마 지면 큐레이션 노출 문구 (PRD §9 — 1급 산출물, 출시 전 확정)
- [ ] **사용 연령**: 전체 이용가 (운세 = 비사행성·정보성)
- [ ] **카테고리/검색 키워드**: 비게임 — 라이프스타일/유틸 계열
- [ ] **고객센터**: 이메일 / 연락처 / (선택) 채팅 상담 주소
- [ ] **개인정보 처리방침**: 출시 신청에 요구되는지 콘솔에서 확인(PRD §12). 로컬 전용·외부 전송 0 기조로 작성

---

## 3. 배포 시 주입 필요 (시크릿 — 코드에 넣지 말 것)

- [ ] **data.go.kr 인증키**: 환경 변수 `VITE_DATA_GO_KR_KEY` 로 빌드/배포 시 주입.
  - 출처: `src/features/weather/config.ts` (하드코딩 금지, CRITICAL #1/#2).
  - 미주입 시 날씨 위젯은 `MISSING_API_KEY` 폴백 표시(앱은 정상 동작 — 운세·D-day·메모·일기는 키 불필요).
- [ ] **외부 호출 도메인 허용 등록**: `apis.data.go.kr`.
  - `@apps-in-toss/web-framework` config에는 네트워크 allowlist 필드가 없음 → **콘솔/배포 설정**에서 도메인 허용 처리(granite.config.ts 주석 참조).

---

## 4. 권한 고지 (콘솔 + 앱 내 — 점검)

- [x] **위치(geolocation)**: `granite.config.ts` `permissions`에 선언. 사유 = 현재 위치 → 기상청 격자 변환(날씨). PRD §10.
- [ ] 콘솔 권한 사유 문구도 동일 취지로 기재(위치=날씨 지역 확인).

---

## 5. 출시 전 수동 검증 (사람이 1회 — PRD §14)

> 신뢰 = 운세앱 생명. `lunar-javascript`(MIT) 위임 결과를 사람이 눈으로 대조.

- [ ] **만세력 외부 눈대조**: 샘플 날짜 10여 개를 공개 만세력(플러스만세력 등)과 대조.
  - 점검: 일진·일주·절기 경계(입춘/월 경계)·자시(23~01시) 날짜 처리·윤달.
  - 코드 픽스처: `src/features/fortune/calibration.fixture.ts` / `calibration.test.ts`(자동 대조). 외부 만세력과의 **수동 눈대조**는 코드가 못 함 → 사람이 1회 수행.
- [ ] **타로 텍스트·아이콘 라이선스**: 사용 시 라이선스 확인(PRD §10). (이번 빌드 타로 = Could/7월, 미포함 시 N/A)

---

## 6. 제출 순서 (요약)

1. `VITE_DATA_GO_KR_KEY` 주입 → `npm run build` 로 `.ait` 재산출(에러 0 확인).
2. 만세력 눈대조(§5) 1회.
3. 콘솔에 미니앱 등록(§2) — appName·아이콘·카피·연령·고객센터.
4. 외부 도메인 허용(§3) 등록.
5. `.ait` 콘솔 업로드 → 검토 요청 → 출시.
6. 챌린지 신청폼 제출.

> 3~6은 **사용자 수동**(콘솔 접근·실키·계약·신청폼). 코드/빌드는 §1에서 완료됨.
