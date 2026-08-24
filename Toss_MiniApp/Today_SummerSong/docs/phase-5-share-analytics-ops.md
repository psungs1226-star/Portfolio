# Phase 5 구현 메모

## 공유 payload

곡 공유는 `SongSharePayload`, 플레이리스트 공유는 `PlaylistSharePayload` 타입으로 고정했다. 공유 링크는 `getTossShareLink()`로 생성한 앱 내부 진입 링크만 사용하며, 유튜브 URL은 공유하지 않는다.

## 이벤트 정의

구현 이벤트는 Phase 5 계약의 snake_case 이름을 그대로 사용한다.

- `home_viewed`
- `daily_song_viewed`
- `song_card_clicked`
- `youtube_open_clicked`
- `youtube_music_open_clicked`
- `favorite_added`
- `favorite_removed`
- `share_clicked`
- `playlist_viewed`

이벤트 속성은 `src/lib/analytics.ts`의 union type으로 제한한다.

## referrer 정규화

`src/lib/referrer.ts`에서 원본 referrer를 저장하지 않고 아래 값으로만 정규화한다.

- `direct`
- `share_song`
- `share_playlist`
- `challenge_surface`
- `unknown`

## 공유 문구 후보

곡 공유:

- `오늘은 이 여름노래 어때요? {artist} - {title}`
- `지금 듣기 좋은 여름노래를 보냈어요. {artist} - {title}`

플레이리스트 공유:

- `지금 듣기 좋은 {label} 여름 플레이리스트`
- `{label} 분위기에 맞는 여름노래를 모았어요`

## 운영 체크리스트

- 매일 공유 진입 링크가 앱 내부 `/song/:id`, `/playlist/:type/:key` 화면으로 열리는지 확인
- YouTube/YouTube Music CTA가 공유 링크가 아닌 사용자 클릭 이후에만 열리는지 확인
- `share_clicked` 이후 공유 유입이 `home_viewed.referrer`에서 `share_song` 또는 `share_playlist`로 잡히는지 확인
- `favorite_added`, `youtube_open_clicked`, `youtube_music_open_clicked` 상위 곡을 주 1회 확인해 홈 추천 우선순위 교체
- `mood`, `moment`, `year`별 `playlist_viewed`를 보고 반응 좋은 무드와 빈약한 구간 보강

