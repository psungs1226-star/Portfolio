# Phase 1 링크 검증 메모

## 범위

- 대상 파일: `data/songs.json`
- 검증일: 2026-07-07
- 기준: 공식 MV, 아티스트 공식 채널, 소속사/레이블 공식 채널, 아티스트 Topic 채널
- 제외 기준: 비공식 재업로드, 팬메이드, 일반 가사 영상

## 선정 요약

- 총 20곡
- 무드 포함: 상큼발랄, 청량시원, 설렘두근, 센치감성
- 순간 포함: 바다, 드라이브, 밤바다, 비오는날
- 연도 포함: 2010년대, 2020년대
- 기존 `videoId` 보유 곡 중 공식/접근 가능성이 확인된 곡 유지: `S264`, `S265`, `S269`, `S300`
- 기존 `videoId` 중 404 또는 비공식/가사 영상으로 확인된 곡은 MVP에서 제외하고 공식 MV가 확인된 곡으로 교체

## 파생 URL 규칙

각 곡은 `videoId` 하나로 아래 URL을 만든다.

```ts
const youtubeUrl = `https://youtu.be/${videoId}`;
const youtubeMusicUrl = `https://music.youtube.com/watch?v=${videoId}`;
const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
```

## 곡별 검증

| id | 곡 | 아티스트 | videoId | 공식성 메모 |
| --- | --- | --- | --- | --- |
| S001 | How Sweet | NewJeans | `Q3K0TOvTOno` | oEmbed 제목 `NewJeans (뉴진스) 'How Sweet' Official MV`, 채널 `HYBE LABELS` 확인 |
| S005 | Queencard (퀸카) | 여자아이들 | `7HDeem-JaSY` | oEmbed 제목 `(여자)아이들((G)I-DLE) - '퀸카 (Queencard)' Official Music Video`, 채널 `i-dle (아이들)` 확인 |
| S006 | Teddy Bear | STAYC | `SxHmoifp0oQ` | oEmbed 제목 `STAYC(스테이씨) 'Teddy Bear' MV`, 채널 `STAYC` 확인 |
| S026 | Power Up | 레드벨벳 | `aiHSVQy9xN8` | oEmbed 제목 `Red Velvet 레드벨벳 'Power Up' MV`, 채널 `SMTOWN` 확인 |
| S063 | Spicy | aespa | `Os_heh8vPfs` | oEmbed 제목 `aespa 에스파 'Spicy' MV`, 채널 `SMTOWN` 확인 |
| S075 | Alcohol-Free | 트와이스 | `XA2YEHn-A8Q` | oEmbed 제목 `TWICE "Alcohol-Free" M/V`, 채널 `JYP Entertainment` 확인 |
| S080 | 치맛바람 (Chi Mat Ba Ram) | 브레이브걸스 | `e70PkoJhQYM` | oEmbed 제목 `브레이브걸스(Brave Girls) - 치맛바람 (Chi Mat Ba Ram) MV`, 채널 `Brave Entertainment` 확인 |
| S120 | Hype Boy | NewJeans | `11cta61wi0g` | oEmbed 제목 `NewJeans (뉴진스) 'Hype Boy' Official MV (Performance ver.1)`, 채널 `HYBE LABELS` 확인 |
| S121 | LOVE DIVE | IVE | `Y8JFxS1HlDo` | oEmbed 제목 `IVE 아이브 'LOVE DIVE' MV`, 채널 `STARSHIP` 확인 |
| S127 | What is Love? | 트와이스 | `i0p1bmr0EmE` | oEmbed 제목 `TWICE "What is Love?" M/V`, 채널 `JYP Entertainment` 확인 |
| S264 | 비도 오고 그래서 | 헤이즈 | `afxLaQiLu-o` | oEmbed 제목 `헤이즈 (Heize) - 비도 오고 그래서 ... MV`, 채널 `Stone Music Entertainment` 확인 |
| S265 | Rain | 태연 | `eHir_vB1RUI` | oEmbed 제목 `TAEYEON 태연 'Rain' MV`, 채널 `SMTOWN` 확인 |
| S269 | Rain | 김예림 | `qlMXZvY-_cM` | oEmbed 제목 `김예림 Lim Kim - Rain (Official MV)`, 채널 `미스틱스토리 MYSTIC STORY` 확인 |
| S300 | 비가 와 | 소유, 백현 | `1Q8J5nghxiM` | oEmbed 제목 `[MV] SOYOU(소유), BAEKHYUN(백현) _ Rain(비가와)`, 채널 `1theK (원더케이)` 확인 |
| S169 | Butter | 방탄소년단 | `WMweEpGlu_U` | oEmbed 제목 `BTS (방탄소년단) 'Butter' Official MV`, 채널 `HYBE LABELS` 확인 |
| S178 | Left & Right | 세븐틴 | `HdZdxocqzq4` | oEmbed 제목 `SEVENTEEN (세븐틴) 'Left & Right' Official MV`, 채널 `HYBE LABELS` 확인 |
| S188 | Everybody | 샤이니 | `hKbNV-4b_g8` | oEmbed 제목 `SHINee 샤이니 'Everybody' MV`, 채널 `SMTOWN` 확인 |
| S190 | Sherlock (셜록) | 샤이니 | `8kyG5tTZ1iE` | oEmbed 제목 `SHINee 샤이니 'Sherlock•셜록 (Clue + Note)' MV`, 채널 `SMTOWN` 확인 |
| S205 | 사랑을 했다 (Love Scenario) | 아이콘 | `vecSVX1QYbQ` | oEmbed 제목 `iKON - ‘사랑을 했다(LOVE SCENARIO)’ M/V`, 채널 `iKON` 확인 |
| S207 | 으르렁 (Growl) | EXO | `I3dezFzsNss` | oEmbed 제목 `EXO 엑소 '으르렁 (Growl)' MV (Korean Ver.)`, 채널 `SMTOWN` 확인 |

## 제외한 기존 videoId

| id | 곡 | 기존 videoId | 제외 사유 |
| --- | --- | --- | --- |
| S215 | 투명 우산 | `DbaLDf7gmTQ` | oEmbed 404 |
| S266 | 비 | `9jFZdu0zTEA` | 가사 비디오로 확인되어 MVP 공식 영상 기준에서 제외 |
| S267 | 푸르던 | `m-V6Ec73dVA` | 비공식 채널로 확인되어 제외 |
| S268 | 비가 내린다 | `nQljDG_yaH0` | oEmbed 404 |
| S270 | 비온다 | `lpcl9TRshlk` | 비공식 채널로 확인되어 제외 |
| S271 | 장마 | `weqPom5x9YI` | 비공식 채널로 확인되어 제외 |

## 파생 URL 샘플

`S001` 기준:

- YouTube: `https://youtu.be/Q3K0TOvTOno`
- YouTube Music: `https://music.youtube.com/watch?v=Q3K0TOvTOno`
- Thumbnail: `https://img.youtube.com/vi/Q3K0TOvTOno/hqdefault.jpg`

전체 20곡은 동일한 규칙으로 URL 생성 가능하다.
