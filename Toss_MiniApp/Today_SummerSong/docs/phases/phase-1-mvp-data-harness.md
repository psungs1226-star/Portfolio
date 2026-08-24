# Phase 1. MVP 데이터 하네스

## 목표

전체 300곡 검증 전에, 앱 화면과 링크 동작을 확인할 수 있는 최소 데이터셋을 만든다. MVP 데이터는 20곡을 기준으로 한다.

## 입력 자료

- `여름노래_큐레이션_마스터.xlsx`
- 300곡으로 압축된 큐레이션 마스터
- 기존 videoId 보유 곡

## 선별 기준

1. 총 20곡을 우선 목표로 한다.
2. 무드 4종이 모두 포함되어야 한다.
   - 상큼발랄
   - 청량시원
   - 설렘두근
   - 센치감성
3. 순간 4종이 모두 포함되어야 한다.
   - 바다
   - 드라이브
   - 밤바다
   - 비오는날
4. 2010년대와 2020년대 곡이 모두 포함되어야 한다.
5. 이미 videoId가 있는 곡은 우선 검증한다.
6. 기존 videoId라도 404, 비공식 채널, 일반 가사 영상, 팬메이드 영상이면 MVP에서 제외한다.
7. 공식 영상이 없거나 애매한 곡은 MVP에서 제외한다.

## 작업

1. 300곡 마스터에서 MVP 후보 20곡을 고른다.
2. 각 곡의 공식 유튜브 videoId를 채운다.
   - 아티스트 공식 채널
   - 소속사/레이블 공식 채널
   - 아티스트 Topic 채널
3. 비공식 재업로드, 가사 영상, 팬메이드 영상은 제외한다.
4. 가능한 경우 YouTube oEmbed 또는 실제 페이지 접근으로 videoId 접근성을 확인한다.
5. videoId에서 다음 URL이 파생되는지 확인한다.
   - `https://youtu.be/{videoId}`
   - `https://music.youtube.com/watch?v={videoId}`
   - `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`
6. MVP용 `songs.json`을 만든다.
7. JSON에는 최소 필드를 포함한다.
   - `id`
   - `title`
   - `artist`
   - `year`
   - `mood`
   - `moments`
   - `group`
   - `videoId`

## songs.json 스키마 계약

MVP와 출시 버전 모두 아래 스키마를 기준으로 한다.

```ts
type Song = {
  id: string;
  title: string;
  artist: string;
  year: number;
  mood: "상큼발랄" | "청량시원" | "설렘두근" | "센치감성";
  moments: Array<"바다" | "드라이브" | "밤바다" | "비오는날">;
  group: "여돌" | "남돌" | "솔로" | "밴드" | "그룹" | "힙합" | "기타";
  videoId: string;
};
```

필드 규칙:

- `id`: 앱 내부 고유값. `S001` 형식을 유지한다.
- `title`: 곡명. 괄호 표기는 원곡 표기를 유지하되 불필요한 부제는 줄인다.
- `artist`: 대표 아티스트명.
- `year`: 숫자형 연도. 문자열 금지.
- `mood`: 대표 감정 1개만 허용한다.
- `moments`: 상황 태그 배열. 최소 1개, 최대 3개를 권장한다.
- `group`: 아티스트 분류 1개만 허용한다.
- `videoId`: 유튜브 영상 ID. URL 전체가 아니라 11자리 전후의 ID만 저장한다.

파생 URL 규칙:

```ts
const youtubeUrl = `https://youtu.be/${videoId}`;
const youtubeMusicUrl = `https://music.youtube.com/watch?v=${videoId}`;
const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
```

예시:

```json
{
  "id": "S001",
  "title": "How Sweet",
  "artist": "NewJeans",
  "year": 2024,
  "mood": "상큼발랄",
  "moments": ["바다", "드라이브"],
  "group": "여돌",
  "videoId": "example12345"
}
```

## 완료 조건

- MVP 곡 20곡 모두 videoId가 있음
- MVP 곡 20곡 모두 공식/접근 가능 링크 검증을 통과함
- 무드/순간/연도 테스트가 가능함
- 앱에서 외부 링크와 썸네일 URL을 파생할 수 있음
- `songs.json`이 앱에 바로 import 가능한 구조임
- 모든 곡이 `songs.json 스키마 계약`을 통과함

## 산출물

- MVP 곡 20곡 목록
- `songs.json`
- 링크 검증 메모

## 리뷰 요청 기준

리뷰어는 다음을 확인한다.

- MVP 데이터가 기능 검증에 충분한가
- 공식 링크 기준을 지켰는가
- JSON 구조가 앱 구현에 적합한가
- 필드 타입과 허용값이 스키마 계약과 일치하는가
- 무드/순간 분포가 테스트에 충분한가
