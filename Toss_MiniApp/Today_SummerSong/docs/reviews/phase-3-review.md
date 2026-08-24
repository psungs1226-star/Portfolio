# Phase 3 Review

## Verdict

PASS

## Blocking Issues

- 없음.

## Major Issues

- 없음.

## Minor Issues

- 실제 Apps in Toss 네이티브 Storage 동작은 샌드박스/실기기 QA에서 한 번 더 확인해야 한다. 로컬 개발 환경은 `localStorage` fallback으로 검증했다.
- `ait build`에서 500kB 초과 chunk 경고가 계속 발생한다. Phase 6 성능 점검 항목으로 유지한다.
- 템플릿 의존성 audit 경고는 Phase 6 릴리스 전 업데이트 가능 범위를 확인한다.

## Implemented

- Storage 기반 찜 목록 로드/저장 래퍼 추가
- 찜 버튼 저장/해제 토글 및 활성 상태 표시
- 찜 목록 화면의 로딩/빈 상태/목록 상태 처리
- 썸네일 로딩 실패 시 컬러 폴백 타일 표시
- 썸네일 로딩 전 배경 톤 보강
- 홈/플레이리스트 UX 문구 보강
- 무드 화면의 전체 곡 카운트와 실제 노출 목록 불일치 수정

## Policy/Risk Check

- 곡 이미지는 공식 YouTube 썸네일 URL을 계속 사용한다.
- 저작권 있는 앨범아트/사진을 앱 번들에 추가하지 않았다.
- 이번 Phase 3에서는 새 생성 이미지가 필요하지 않았다. 빈 상태와 폴백은 CSS 기반 그래픽으로 충분히 처리했다.
- 외부 재생은 기존과 동일하게 `openURL` 기반으로 유지한다.

## Target UX Check

- 홈에서 오늘의 곡 CTA와 찜 저장 행동이 가장 먼저 보이도록 유지했다.
- 하단 탭은 홈, 무드, 연도, 찜 4개 핵심 흐름을 유지했다.
- 문구는 20~30대 여성 중심 타겟에 맞춰 캐주얼하지만 과하게 유치하지 않게 조정했다.
- 찜 화면이 단순 오류 화면처럼 보이지 않도록 제목, 카운트, 빈 상태 메시지를 분리했다.

## Verification

- `npm run lint`: PASS
- `npm run build`: PASS
- AIT artifact: `summer-song/summer-song.ait`
- Latest deploymentId: `019f3fa3-f710-7d65-bac4-0289a3d8b1db`
- Local dev URL: `http://localhost:5173/`

## Visual Evidence

- Home: `summer-song/screenshot-phase3-home.png`
- Favorites empty: `summer-song/screenshot-phase3-favorites-empty.png`

## Required Fixes

- 없음. Phase 4 진행 가능.
