# Phase 6 QA/출시 메모

## 요약

- QA 일자: 2026-07-08
- 앱 경로: `summer-song`
- 앱 이름: `오늘의 여름노래`
- appName: `summer-song`
- 빌드 번들: `summer-song/summer-song.ait`
- 최신 deploymentId: `019f400e-ba08-7c79-8aa5-c491bf08c90e`
- 콘솔 업로드: 미완료, 콘솔 접근 후 진행 필요
- 신청폼 제출: 미완료, 콘솔 업로드 후 진행 필요

## 빌드 결과

`npm run build` 성공.

- `.ait`: `summer-song/summer-song.ait` 약 4.2 MB
- Web entry: `summer-song/dist/web/index.html`
- Web JS: `summer-song/dist/web/assets/index-DRg8Ad0k.js`
- Web CSS: `summer-song/dist/web/assets/index-DEIimYdI.css`
- RN bundles: `summer-song/dist/bundle.ios.js`, `summer-song/dist/bundle.android.js`

빌드 경고:

- Vite chunk size warning: web JS가 500 kB 기준을 초과함. 기능 실패는 아니며 Apps in Toss/TDS 의존성 영향이 큼.
- Node `DEP0190` warning: AIT build 내부 child process 경고. 빌드는 성공.

## 정책 점검

소스/설정 검색 결과:

- `eval(`: 0건
- `window.location.replace`: 0건
- `document.write`: 0건
- `dangerouslySetInnerHTML`: 0건
- `intoss-private`: 앱 소스 0건
- SSR 관련 `hydrateRoot`, `createServer`, `ssr`: 앱 소스/설정 0건

번들 검색 참고:

- `dist/bundle.*.js`에는 Apps in Toss 프레임워크 내부 호환 코드의 `intoss-private` 문자열이 포함됨.
- 앱 구현은 `intoss-private://`를 직접 조립하거나 공유하지 않음.

## 외부 링크 점검

- YouTube URL 생성: `summer-song/src/lib/songUtils.ts`
- YouTube Music URL 생성: `summer-song/src/lib/songUtils.ts`
- 외부 열기: `openURL(url)` 사용
- 브라우저 개발환경 폴백: `window.open(url, "_blank", "noopener,noreferrer")`
- 공유 링크: `summer-song/src/lib/sharing.ts`에서 `getTossShareLink()`로 생성
- 공유 메시지에는 YouTube URL을 넣지 않고 앱 내부 진입 링크만 포함

## 화면 QA 증거

- 홈: `summer-song/screenshots-phase6-home.png`
- 무드/순간 탭: `summer-song/screenshots-phase6-mood.png`
- 무드 플레이리스트: `summer-song/screenshots-phase6-mood-playlist.png`
- 연도: `summer-song/screenshots-phase6-year.png`
- 찜 목록: `summer-song/screenshots-phase6-favorites.png`
- 공유받은 곡: `summer-song/screenshots-phase6-shared-song.png`

확인 결과:

- 홈 첫 화면에서 오늘의 곡과 CTA가 먼저 읽힘.
- 무드/순간/연도/찜 화면이 단순 외부 링크 목록이 아니라 곡 카드 UI로 보임.
- 버튼 텍스트 겹침 없음.
- 하단 내비게이션은 고정이며 주요 CTA를 가리지 않음.
- 공유 진입 화면은 앱 내부 곡 카드 확인 후 YouTube/YouTube Music CTA를 누르는 구조.

## 찜 저장 QA

브라우저 QA에서는 `localStorage`에 `summer-song:favorites:v1 = ["S001"]` 상태를 주입해 찜 목록 렌더링을 확인했다.

앱 구현은 Apps in Toss `Storage`를 우선 사용하고, 브라우저 개발환경에서는 `localStorage`로 폴백한다.

## 이미지/저작권 점검

- 앱 번들에 임의 앨범아트/저작권 사진을 포함하지 않음.
- 로컬 자산은 `public/appsintoss-logo.png`와 이전 QA 스크린샷 파일뿐임.
- 곡 이미지는 `https://img.youtube.com/vi/{videoId}/hqdefault.jpg` 공식 YouTube 썸네일을 원격 로드.
- 썸네일 실패 시 앱 내부 텍스트 폴백 타일을 표시.
- Playwright 로컬 캡처에서는 원격 썸네일이 회색 로딩 배경으로 보였으나, UI 레이아웃과 폴백 구조는 확인됨.

## 성능 점검

- `curl` 기준 dev server HTML 응답: HTTP 200, 약 0.011초.
- Playwright 캡처에서 첫 화면 렌더링 중 2초 이상 멈춤은 관찰하지 못함.
- 이미지에는 `loading="lazy"` 적용.
- 긴 리스트는 카드 렌더링이 많으나 25곡 무드 리스트 캡처에서 스크롤 구조가 정상.

## 내비게이션 점검

- 하단 탭: 홈, 무드, 연도, 찜 이동 확인.
- 플레이리스트/공유 곡 화면: `홈으로` 버튼으로 홈 복귀 확인.
- 네이티브 닫기/최초 화면 종료 동작은 Toss 앱 콘솔 업로드 후 실기기에서 확인 필요.

## 제출 전 남은 작업

- 콘솔 업로드.
- 콘솔 업로드 후 발급/확정된 아이콘 URL을 `summer-song/granite.config.ts`의 `brand.icon`과 대조.
- 신청폼 제출.
- 실기기 Toss 앱에서 `openURL`, 공유 시트, 네이티브 뒤로가기/닫기 확인.
