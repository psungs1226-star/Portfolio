# Phase 2. MVP 앱 구현

## 목표

20곡 MVP 데이터로 사용자가 홈에서 곡을 찾고, 유튜브 또는 유튜브뮤직으로 이동하는 핵심 흐름을 구현한다.

## 입력 자료

- Phase 1의 `songs.json`
- `assets/app-logo-600.png`
- `assets/app-thumbnail-1932x828.png`
- 디자인 정의서
- 실행계획서

## 작업

1. `npx create-ait-app summer-song`으로 프로젝트를 생성한다.
2. 공식 튜토리얼 기준으로 초기 선택값을 고정한다.
   - package manager: `npm`
   - template: `react-ts`
   - TDS: `Y`
   - 예제/샘플 기능: MVP와 직접 관련 없으면 추가하지 않음
3. `granite.config.ts`에 다음 값을 반영한다.
   - `appName`: `summer-song`
   - `displayName`: `오늘의 여름노래`
   - `primaryColor`: `#E8542E`
   - 앱 아이콘: 콘솔 업로드 URL이 있으면 `brand.icon`에 반영하고, 없으면 Phase 6 확인 항목으로 기록
   - dev server port: 기본 `5173` 우선 사용
4. 홈 화면을 구현한다.
   - 오늘의 여름노래 카드
   - 곡명, 아티스트, 연도
   - 유튜브/유튜브뮤직 CTA
   - 무드/순간 진입 영역
5. 무드/순간 리스트를 구현한다.
   - 무드 필터
   - 순간 필터
   - 곡 카드 리스트
6. 연도별 리스트를 구현한다.
   - 연도 선택
   - 해당 연도 곡 표시
7. 곡 카드 CTA를 구현한다.
   - `openURL`로 유튜브 열기
   - `openURL`로 유튜브뮤직 열기
   - `youtubemusic://` 같은 커스텀 스킴 대신 https 유니버설 링크 사용
8. 기본 반응형을 확인한다.
   - 모바일 WebView 폭
   - 긴 곡명 줄바꿈
   - CTA 겹침 없음

## 최소 화면/컴포넌트 경계

라우팅 방식은 실제 프로젝트 구조에 맞추되, MVP에서는 아래 화면 상태가 분리되어 검증 가능해야 한다.

| 화면/상태 | 역할 | 필수 요소 |
| --- | --- | --- |
| `Home` | 첫 진입 | 오늘의 곡, 무드/순간 진입, 연도 진입 |
| `PlaylistList` | 무드/순간/연도 결과 | 필터명, 곡 리스트, 빈 상태 |
| `Favorites` | 찜 목록 진입점 | Phase 2에서는 찜 없음 상태와 탭 진입만 구현, 저장/해제는 Phase 3에서 구현 |
| `SongCard` | 곡 표시 단위 | 썸네일, 곡명, 아티스트, 연도, CTA, 찜 버튼 자리 |
| `BottomNav` | 주요 화면 이동 | 홈, 무드, 연도, 찜 |

최소 함수/유틸:

| 유틸 | 역할 |
| --- | --- |
| `getDailySong(date, songs)` | 날짜 기반 오늘의 곡 선택 |
| `getYoutubeUrl(videoId)` | 유튜브 URL 파생 |
| `getYoutubeMusicUrl(videoId)` | 유튜브뮤직 URL 파생 |
| `getThumbnailUrl(videoId)` | 썸네일 URL 파생 |
| `filterSongsByMood(mood)` | 무드 필터 |
| `filterSongsByMoment(moment)` | 순간 필터 |
| `filterSongsByYear(year)` | 연도 필터 |

## 구현 증거

Phase 2 리뷰 전 아래를 제시한다.

- 로컬 실행 URL 또는 실행 방법
- 홈 화면 스크린샷
- 무드/순간 리스트 스크린샷
- 연도 리스트 스크린샷
- 유튜브 CTA 클릭 테스트 결과
- `openURL` 구현부 코드 위치
- 주요 컴포넌트/유틸 파일 경로

## 완료 조건

- 앱이 로컬에서 실행됨
- 홈, 무드/순간, 연도 화면이 동작함
- 곡 카드에서 유튜브/유튜브뮤직 링크가 열림
- 20곡 데이터로 홈, 무드/순간, 연도 화면이 빈 상태 없이 표시됨
- 찜 화면은 Phase 2에서 빈 상태가 깨지지 않게 표시되고, 실제 저장/해제는 Phase 3에서 완료함
- 최소 화면/컴포넌트 경계가 코드에서 확인 가능함

## 산출물

- `summer-song` 앱 프로젝트
- 기본 화면 구현 코드
- MVP 데이터 import 코드
- Phase 2 구현 증거 자료
- Phase 6에서 최종 빌드 검증할 수 있도록 `npm run build` 명령 구조 유지

## 리뷰 요청 기준

리뷰어는 다음을 확인한다.

- 핵심 플로우가 끊기지 않는가
- `openURL` 사용 방식이 정책에 맞는가
- 화면이 디자인 정의서와 크게 어긋나지 않는가
- 링크 연결 실패나 빈 화면 가능성이 없는가
- 최소 화면/컴포넌트 경계가 구현되어 있는가
