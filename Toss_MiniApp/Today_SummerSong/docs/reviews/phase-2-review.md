# Phase 2 Review

## Verdict

PASS

## Blocking Issues

- 없음.

## Major Issues

- 없음.

## Minor Issues

- `granite.config.ts`의 `brand.icon`은 콘솔 업로드 URL 확보 전이라 빈 값이다. Phase 6 릴리스 준비에서 실제 아이콘 URL로 교체해야 한다.
- `ait build`에서 500kB 초과 chunk 경고가 발생한다. 현재 MVP 기능에는 영향이 없지만, Phase 6 배포 전 성능 검토 대상이다.
- 템플릿 의존성 설치 과정에서 npm audit 경고가 있었다. Phase 6에서 의존성 업데이트 가능 범위를 다시 확인한다.

## Policy/Risk Check

- 앱은 음원 파일을 포함하지 않고 Phase 1에서 검증한 YouTube `videoId`만 사용한다.
- 외부 재생은 `@apps-in-toss/web-framework`의 `openURL`을 통해 `youtu.be` 및 `music.youtube.com` 링크로 연결한다.
- 로컬 개발 환경에서만 `window.open` fallback을 사용한다.
- 찜 화면은 Phase 3 저장소 구현 전 빈 상태로만 제공된다.

## Target Fit Check

- 홈 첫 화면에서 오늘의 곡, 무드, 순간, 연도 진입점을 제공한다.
- 무드 화면에서 카테고리와 전체 곡 리스트를 함께 탐색할 수 있다.
- 연도 화면에서 2012~2024년 필터 진입점을 제공한다.
- 하단 탭은 홈, 무드, 연도, 찜 4개 핵심 흐름으로 제한했다.

## Verification

- `npm run lint`: PASS
- `npm run build`: PASS
- AIT artifact: `summer-song/summer-song.ait`
- Latest deploymentId: `019f3f81-5a2a-7535-93bd-11cd18b96460`
- Local dev URL: `http://localhost:5173/`

## Visual Evidence

- Home: `summer-song/screenshot-phase2-mobile.png`
- Mood: `summer-song/screenshot-phase2-mood.png`
- Year: `summer-song/screenshot-phase2-year.png`

## Required Fixes

- 없음. Phase 3 진행 가능.
