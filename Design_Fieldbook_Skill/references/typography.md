# 타이포그래피

서체 3분류, 타이포 용어 6종, 역할 기반 타입 스케일 10토큰, 한글 조판 실측 밴드. 출처: UI:UX Fieldbook `FONTS`/`TERMS`/`TYPE_COMPARE`/`PG_GUIDE` + app.css `--fs-*` 토큰.

## 서체 3분류와 분위기

| 분류 | 샘플 문구 | 설명 | 분위기 태그 |
|---|---|---|---|
| Serif(세리프) | "Quiet luxury" | 선(line)이 달린 활자. 고전·권위·에디토리얼의 분위기 | Luxury, Editorial, Trust, Classic |
| Sans Serif(산세리프) | "Modern product" | 장식 없는 단순한 활자. 현대적·기술적·중립적 | Modern, Technology, Neutral, Clean |
| Monospace(모노스페이스) | "const design = 1;" | 모든 글자 폭이 같은 활자. 코드·데이터·기술 문서 | Developer, Code, Technical, Precise |

## 타이포 용어 6종

| 용어 | 정의 |
|---|---|
| 커닝(Kerning) | 특정 글자 쌍(AV, To) 사이의 간격을 개별 조정. 로고·헤드라인에서 중요 |
| 트래킹(Tracking) | 문자 전체의 자간을 균등하게 넓히거나 좁힘. 대문자 라벨에 넓게 쓰면 격식이 생김 |
| 행간(Leading) | 줄과 줄 사이의 수직 간격 — 타이포그래피가 숨 쉬는 속도를 결정 |
| 베이스라인(Baseline) | 글자가 "앉아 있는" 기준선. 대부분 글자의 하단이 맞닿는 가상의 선 |
| 캡 하이트(Cap Height) | 대문자의 높이. 헤드라인에서 소문자 x-하이트와 함께 시각 균형을 좌우 |
| 엑스 하이트(X Height) | 소문자 x의 높이. 크면 작은 크기에서도 가독성이 좋다 |

## 역할 기반 타입 스케일 10토큰

값이 바뀌어도 역할명은 유지된다는 것이 이 스케일의 설계 원칙이다 — "이 스타일시트의 모든 font-size는 이 10개 중 하나로 귀결된다."

> **아래 px값은 사례다** — Fieldbook 사이트(문서 밀도)의 실측값이며, 이식 대상은 "모든 크기를 역할 토큰 10개로 귀결시킨다"는 구조이지 값 자체가 아니다. 장르가 다르면 값을 재정의한다: 마케팅 히어로라면 disp를 48–72px대로 새로 정한다(34px는 앱·문서 밀도의 값이다). 역할명과 "토큰 밖 크기 금지" 규율만 유지하면 된다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--fs-micro` | 10px | hex 코드, 축 눈금, 와이어프레임 라벨 |
| `--fs-label` | 11px | 모노 아이브로우·범례 |
| `--fs-cap` | 12px | 캡션·메타데이터 |
| `--fs-sm` | 13px | 보조 본문 |
| `--fs-ctl` | 14px | 컨트롤 — 버튼·칩·인풋 |
| `--fs-body` | 15px | 본문 |
| `--fs-lead` | 18px | 리드 문단 |
| `--fs-h3` | 20px | 카드 제목 |
| `--fs-h2` | 24px | 소제목 |
| `--fs-disp` | 34px | 디스플레이(대형 제목) |

**폰트 스택**: `--mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace` / `--disp: 'Space Grotesk', 'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif` / `--sans: 'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif`

**폰트 로딩 — 이름만 스택에 적는 것으로는 아무 일도 안 일어난다**: `font-family`에 웹폰트 이름을 적어도 그 폰트가 로드되지 않았다면 브라우저는 그 이름을 무시하고 스택의 다음 폰트(대개 시스템 기본 산세리프)를 그린다 — 화면에는 항상 시스템 폰트만 보이고, 지정한 폰트 이름은 코드 안에서만 존재하는 죽은 값이 된다. `Pretendard`는 Google Fonts에 없다 — Noto Sans KR로 대충 대체해서 "로드했다"고 착각하지 않는다. 위 스택을 실제로 쓰려면 `<head>`에 아래를 함께 넣는다:

```html
<!-- Pretendard(한글 산세리프, jsdelivr CDN — Google Fonts에 없음) -->
<link rel="stylesheet" as="style" crossorigin
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/dist/web/static/pretendard.css">

<!-- Space Grotesk + JetBrains Mono(라틴 전용 — 한글은 위 Pretendard가 커버) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

CDN이 막혀 있거나(Artifact처럼 외부 요청이 차단되는 환경) 오프라인 산출물이 필요하면, 웹폰트 이름을 스택에서 아예 빼고 시스템 폰트 스택(`-apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif`)만 남긴다 — 로드 안 될 폰트 이름을 죽은 장식으로 남겨두는 것보다, 정직하게 시스템 폰트로 스타일을 만드는 쪽이 낫다. 이 경우 서체로 개성을 못 내는 만큼 weight·트래킹·크기 대비로 위계를 더 강하게 만든다(`references/principles.md`).

## 렌더링 스타일 비교

동일 텍스트를 6가지 스타일로 나란히 렌더링해 비교하는 방법론. 라벨: Display(Grotesk Bold) / Serif(Georgia·Noto Serif) / Mono(JetBrains Mono) / Sans(Pretendard Regular) / Letterspaced Caps(Grotesk·0.22em) / Italic(Georgia Italic).

## 한글 타이포그래피 실측 밴드

Fieldbook 원본에 있던 한글 본문 전용 파라미터 권장 범위. 영문 타입 스케일만으로는 한글 조판(받침, 자소 결합)의 문제를 못 잡는다 — 별도로 확인한다.

| 파라미터 | 권장 밴드 | 낮을 때 | 높을 때 |
|---|---|---|---|
| font-weight | 400–700 | 얇다 — 작은 크기에서 획이 뭉개진다 | 헤드라인용. 본문에 쓰면 답답하다 |
| font-size | 14–17px | 캡션·라벨 영역 | 헤드라인·리드 영역 |
| line-height | 1.5–1.8 | 좁다 — 받침이 윗줄과 부딪힌다 | 넓어서 줄과 줄이 따로 논다(짧은 문단에만) |
| letter-spacing | -0.03–0.02em | 너무 좁혀 글자가 붙는다 | 대문자 라벨엔 좋지만 본문에선 흩어진다 |
| measure(줄 길이) | 45–75ch | 짧아 시선이 자주 되돌아간다 | 길어 다음 줄 첫머리를 놓치기 쉽다 |

> 한글 본문은 영문 타입 스케일 그대로 가져오면 line-height가 좁게 느껴지는 경우가 많다 — 받침 때문에 글자의 시각적 높이가 라틴 문자보다 크다. 위 밴드는 한글 본문에 최적화된 별도 기준이다.

## 한글 줄바꿈 — `word-break: keep-all` 필수

브라우저 기본값(`word-break: normal`)에서 한글은 **음절(글자) 단위**로 줄바꿈된다 — "문제를"이 줄 끝에 걸리면 "문 / 제를"처럼 단어 중간이 끊긴다. 영어는 공백 단위로 자연스럽게 끊기기 때문에 이 문제가 거의 드러나지 않아 놓치기 쉽지만, 한글이 들어가는 프로젝트에서는 헤드라인처럼 자주 줄바꿈이 일어나는 곳일수록 즉시 드러나는 결함이다.

- **전역으로 한 번 선언한다**: `body { word-break: keep-all; overflow-wrap: break-word; }` — 개별 헤드라인·문단마다 지정하지 않는다. `overflow-wrap: break-word`는 keep-all이 못 끊는 긴 영문 URL·토큰이 컨테이너를 넘칠 때의 예외 처리다.
- **keep-all의 부작용 — 고아줄**: 한글 어절은 영단어보다 길어서, `max-width`로 폭을 제한한 문단에 keep-all을 걸면 마지막 줄에 어절 하나만 혼자 남는 고아줄(orphan)이 잘 생긴다("...방식으로 / 사용합니다." 처럼). `text-wrap: pretty`(본문 문단)·`text-wrap: balance`(2~3줄짜리 헤드라인)를 함께 건다 — 두 값 다 미지원 브라우저에서는 그냥 무시되므로 부작용 없는 점진적 개선이다.
- **렌더링 직전 확인**: 실제 카피로 헤드라인·리드 문단을 뷰포트 폭을 좁혀가며 렌더링해, 단어 중간에서 끊기는 줄과 고아줄이 있는지 둘 다 확인한다 — 특히 여러 줄로 흐르는 히어로 헤드라인·리드 문단에서 가장 잘 드러난다.

## 폰트 조합 — 라틴 세리프를 한글 산세리프와 섞을 때

에디토리얼 톤을 내려고 인덱스 숫자·라벨에 라틴 세리프(Georgia, Times)를 습관적으로 섞지 않는다. Georgia/Times는 브라우저 기본 폴백 서체라 "의도해서 고른 서체"가 아니라 "폰트를 안 정했다"는 인상을 준다. 세리프를 쓰기로 했다면:

- 본문 산세리프와 무게감·x-height를 나란히 놓고 비교해 균형이 맞는지 확인한다 — 세리프가 산세리프보다 지나치게 가늘거나 올드스타일이면 옆에서 붕 떠 보인다.
- 숫자에만 세리프를 쓸 거라면 올드스타일 숫자(oldstyle figures, `font-feature-settings: "onum" 1`)를 지원하는 서체로 골라 "숫자만 다른 서체인 이유"가 시각적으로 설명되게 한다.
- 근거 없이 3번째 서체(세리프)를 추가하는 것보다, 산세리프 하나 안에서 weight·size·트래킹만으로 위계를 만드는 쪽이 더 안전하다 — 서체 수가 늘어날수록 조합 실패 위험이 커진다.

## 금지/필수

- 금지: 본문에 `--fs-micro`(10px) 사용. 헤드라인에 `line-height: 1`
- 금지: `word-break: keep-all` 미지정
- 금지: 본문에 `letter-spacing: -0.02em` 적용(트래킹은 대문자 라벨 전용)
- 금지: `max-width`로 폭을 제한한 리드 문단·헤드라인에 `text-wrap: pretty`/`balance` 없이 방치
- 금지: 같은 요소에 `text-wrap: balance`와 수동 `<br>` 동시 사용
- 금지: 40px 이상 헤드라인에 `@media` font-size 오버라이드 없음
- 금지: font-size 종류 10개 초과, 또는 인접 단계 배율 1.125배 미만
- 금지: 인라인 `style="font-size:17px"`처럼 px 하드코딩(역할 토큰 `var(--fs-*)`만)
- 필수: 역할별 10토큰 중 하나만 사용. 한글 본문 line-height 1.6 · measure 52ch(예: `PG_STATE` 기본값). `body { word-break: keep-all; overflow-wrap: break-word; }` 전역 선언
- 필수: measure를 컴포넌트마다 다른 즉흥 px 값(`max-width:520px`, `max-width:620px`...)으로 흩어놓지 않는다 — 하나의 measure 토큰(`ch` 단위, 위 52ch 기준)으로 통일한다
