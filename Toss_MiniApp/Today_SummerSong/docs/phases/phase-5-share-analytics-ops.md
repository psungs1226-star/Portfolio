# Phase 5. 공유/지표/운영 기능

## 목표

8월 지표 평가에 필요한 유입, 재방문, 행동 데이터를 확보한다.

## 작업

1. 공유 기능을 구현한다.
   - 곡 공유
   - 플레이리스트 공유
   - 공유 문구 작성
   - Apps in Toss 공유 SDK 또는 공식 공유 링크 생성 API 사용
   - 유튜브 외부 URL 직접 공유 금지
2. Analytics 이벤트를 설계한다.
   - 홈 진입
   - 오늘의 곡 노출
   - 곡 카드 클릭
   - 유튜브 열기
   - 유튜브뮤직 열기
   - 찜하기
   - 공유하기
3. referrer를 확인한다.
   - 공유 유입
   - 일반 진입
   - 캠페인성 유입
4. 인기/추천 섹션을 구성한다.
   - 초기에는 정적 우선순위 사용
   - 운영 중 지표 기반으로 교체 가능하게 구조화
5. 운영용 체크 포인트를 만든다.
   - 매일 링크 오류 확인
   - 공유 문구 A/B 후보
   - 반응 좋은 무드 확인

## 공유 기능 계약

공유는 앱 내부 진입 링크를 공유하는 용도다. 유튜브 외부 URL을 직접 공유하지 않는다. 구현은 Apps in Toss 공식 공유 SDK 또는 공유 링크 생성 API를 우선 사용한다.

### 곡 공유 payload

```ts
type SongSharePayload = {
  type: "song";
  songId: string;
  title: string;
  artist: string;
  entryPath: `/song/${string}`;
  shareText: string;
};
```

공유 문구 예시:

```text
오늘은 이 여름노래 어때요? {artist} - {title}
```

### 플레이리스트 공유 payload

```ts
type PlaylistSharePayload = {
  type: "mood" | "moment" | "year";
  key: string;
  label: string;
  entryPath: `/playlist/${string}`;
  shareText: string;
};
```

공유 문구 예시:

```text
지금 듣기 좋은 {label} 여름 플레이리스트
```

### 공유 정책 기준

- 공유 링크는 앱으로 재진입하는 링크여야 한다.
- 사설 스킴 `intoss-private://`는 사용하지 않는다.
- SDK가 생성하지 않은 사설 스킴을 직접 조립하지 않는다.
- 유튜브 영상 URL을 공유 링크의 최종 목적지로 쓰지 않는다.
- 공유 진입 후 앱 안에서 곡 정보를 보여주고, 사용자가 직접 유튜브 CTA를 눌러야 한다.

## Analytics 이벤트 계약

이벤트명은 snake_case로 고정한다.

| 이벤트명 | 발생 시점 | 필수 속성 |
| --- | --- | --- |
| `home_viewed` | 홈 화면 진입 | `referrer`, `dailySongId` |
| `daily_song_viewed` | 오늘의 곡 카드 노출 | `songId`, `dateKey` |
| `song_card_clicked` | 곡 카드 선택 | `songId`, `source` |
| `youtube_open_clicked` | 유튜브 CTA 클릭 | `songId`, `source` |
| `youtube_music_open_clicked` | 유튜브뮤직 CTA 클릭 | `songId`, `source` |
| `favorite_added` | 찜 추가 | `songId`, `source` |
| `favorite_removed` | 찜 해제 | `songId`, `source` |
| `share_clicked` | 공유 버튼 클릭 | `shareType`, `targetId`, `source` |
| `playlist_viewed` | 무드/순간/연도 리스트 진입 | `playlistType`, `playlistKey` |

허용 `source` 값:

- `home_daily`
- `home_playlist`
- `mood_list`
- `moment_list`
- `year_list`
- `favorites`
- `shared_entry`

## referrer 계약

앱 진입 시 referrer는 아래 값 중 하나로 정규화한다.

| 값 | 의미 |
| --- | --- |
| `direct` | 일반 진입 또는 출처 없음 |
| `share_song` | 곡 공유 링크 진입 |
| `share_playlist` | 플레이리스트 공유 링크 진입 |
| `challenge_surface` | 챌린지/테마 지면 진입 |
| `unknown` | 파싱 실패 또는 미지원 값 |

referrer 원본에 개인정보가 포함될 가능성이 있으면 저장하지 않고 정규화 값만 이벤트 속성으로 남긴다.

## Pass/Fail 기준

PASS:

- 곡 공유와 플레이리스트 공유가 앱 내부 진입으로 동작함
- 필수 Analytics 이벤트가 모두 기록됨
- 이벤트 속성이 계약과 일치함
- referrer가 허용값으로 정규화됨

FAIL:

- 공유 링크가 유튜브 외부 URL로 바로 이동함
- `intoss-private://`를 사용함
- SDK 대신 직접 조립한 비공식 사설 스킴을 사용함
- 핵심 CTA 클릭 이벤트가 누락됨
- referrer 원본 개인정보 또는 민감 정보가 저장됨

## 완료 조건

- 공유가 실제 링크로 동작함
- 핵심 행동 이벤트가 기록됨
- 유입 경로 확인이 가능함
- 운영 중 개선할 수 있는 지표 포인트가 있음
- 공유 payload, 이벤트명, referrer 값이 위 계약과 일치함

## 산출물

- 공유 기능 코드
- 이벤트 정의표
- 공유 payload 정의
- referrer 정규화 규칙
- 공유 문구 목록
- 운영 체크리스트

## 리뷰 요청 기준

리뷰어는 다음을 확인한다.

- 공유 기능이 정책에 맞는가
- 이벤트명이 일관되고 분석 가능한가
- 이벤트 속성과 referrer 값이 계약과 일치하는가
- 개인정보나 민감 정보 수집 리스크가 없는가
- 지표 평가에 필요한 행동이 빠짐없이 기록되는가
