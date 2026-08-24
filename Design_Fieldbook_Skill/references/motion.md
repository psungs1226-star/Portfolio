# 모션

Fieldbook 이식 챕터들과 짝을 이루는 신설 챕터. 이식 챕터가 "정적 화면을 어떻게 짤 것인가"를 다룬다면, 이 챕터는 "그 화면이 시간 축에서 어떻게 움직여야/움직이지 말아야 하는가"를 다룬다.

원칙은 하나: **크래프트와 슬롭 방어를 함께 갖춘다.** 방어(5절)만 있으면 화면이 밋밋해지고, 크래프트(1~3절)만 있으면 그럴듯한 슬롭을 필수로 승인하게 된다. 모든 원칙·패턴은 금지를 두 축으로 갖는다 — **실수**(명백한 실수)와 **슬롭**(멀쩡해 보이는 슬롭). 슬롭은 못생긴 게 아니라 무난한 것이다.

레퍼런스 태그: `[Disney]`(원문 그대로 인용) · `[MD3]`(m3.material.io) · `[Carbon]`(carbondesignsystem.com, IBM) · `[자체]`(위 세 소스에 없는 이 스킬의 자체 판단). 출처 상세는 각 절 하단.

## 작업별 진입점

이 파일은 전부 읽는 것을 전제하지 않는다. 아래에서 작업에 해당하는 절만 읽는다 — 절 안에서 다른 절을 참조하면 그때 따라간다.

| 작업 | 읽을 절 |
|---|---|
| duration·easing 구체값만 필요(버튼 press, 툴팁, 드로어 등 개별 요소) | §3.1–3.3 규격표 → §3.4 금지 패턴 |
| 특정 패턴 구현(fade / slide / scale / collapse / stagger / morph / press / scroll-reveal / parallax) | §4의 해당 항목 1개 + §3.3 |
| 페이지의 signature motion 하나를 설계 | §5.3 선정·체감 가능성 → §5.4 replaceability test (성격 판정이 필요하면 §2.1) |
| 기존 모션이 슬롭인지 감사 | §5.1 시그니처 7종 → §5.2 예산 → §6.5 정적 탐지 → §6.4 4-gate 순서로 판정, §6.6 feel review로 마감 |
| 접근성·성능 게이트만 점검(reduced-motion, hover, 60fps) | §6.1–6.3 |
| 페이지 전체 모션을 처음부터 설계 / 왜 이렇게 움직여야 하는지 근거가 필요 | §1(WHY) → §2(WHEN) → 그 뒤 위 항목들 |

빈도가 높은 요소(100+/일)를 다룰 때는 어느 경로로 들어왔든 §2.3 빈도 감쇠를 먼저 확인한다 — 여기서 "모션 제거"로 끝나는 경우가 많다.

---

## 1절. 움직임의 원리 — WHY

### 1.1 인간은 움직임을 어떻게 인식하는가 — 지각 임계값 4단계 `[자체]`

| 구간 | 지각 | UI 함의 |
|---|---|---|
| <100ms | 즉각(instantaneous) — 원인과 결과가 동시에 일어난 것으로 지각 | press feedback은 이 구간 안에 시작돼야 한다(체감 지연 없음) |
| 100–300ms | 반응적(responsive) — 인과관계는 느끼지만 지연은 인지 | 대부분의 UI 전환(툴팁, 드롭다운, 카드 확장)이 여기 속한다 |
| 300–1000ms | 애니메이션(animated) — 움직임 자체가 주목의 대상이 됨 | 의도적으로 주목시킬 전환에만(모달, 페이지 전환). 남용하면 느리게 느껴짐 |
| >1000ms | 느림(slow) — 사용자가 "기다림"으로 인지, 이탈 위험 | UI 모션에는 쓰지 않는다. 이 구간은 로딩/프로그레스 표시의 영역 |

### 1.2 UI에 적용되는 6원칙 `[Disney]` `[자체]`

Disney 12원칙 정의와 UI 적용 예시는 [Disney]다(IxDF 원문은 12원칙 전부에 UI 적용 사례를 제시한다). 그러나 **"보편적으로 항상 쓸 6개"라는 선별 자체는 IxDF 원문에 없는 이 스킬의 자체 판단**이다 — 채택 기준은 "범용 UI 컴포넌트에 항상 적용 가능하고, 캐릭터·서사·장식이 필요 없다"(§1.3에서 배제 근거와 함께 상술).

#### ① Slow In and Slow Out (Ease in/out) `[Disney]`
시작·종료 속도를 변화시켜야 자연스럽다. 등속(linear)은 기계적으로 느껴진다.

- 금지: `transition: all 300ms linear;`을 등장/퇴장 모두에 사용
- 금지: 브라우저 기본값 `ease`(`cubic-bezier(0.25,0.1,0.25,1)`)를 등장·퇴장·이동 구분 없이 전부에 적용
- 필수: 등장 `cubic-bezier(0,0,0,1)`(standard-decelerate), 퇴장 `cubic-bezier(0.3,0,1,1)`(standard-accelerate)

#### ② Anticipation `[Disney]`
움직임이 일어나기 전 관찰자를 준비시키는 작은 예비 동작.

- 금지: 드롭다운이 클릭 즉시 예고 없이 나타나게 구현
- 금지: 클릭 가능성과 무관하게 모든 요소에 hover lift(`translateY(-4px)`) 적용(`SLOP-HOVER-LIFT-ALL`)
- 필수: 드롭다운 트리거의 chevron 아이콘만 hover 시 아래로 2px 이동(`short2` 100ms)

#### ③ Staging `[Disney]`
시선을 유도해 지금 중요한 것 하나에 주의를 모은다.

- 금지: 모달이 뜰 때 배경의 다른 요소들도 함께 흔들리거나 스케일 변경되게 구현
- 금지: 히어로 섹션의 모든 카드를 스크롤 진입 시 동시에 fade-up(`SLOP-STAGGER-ALL`)
- 필수: 새 알림 배지가 뜰 때 나머지 UI는 완전 정지, 배지만 opacity+scale로 등장

#### ④ Arc `[Disney]`
자연스러운 이동은 대개 곡선 궤적을 그린다. 단, UI 이동 대부분은 직선/축 정렬이 자연스러우므로 좁은 범위에만 적용한다.

- 금지: 스와이프해 삭제하는 아이템을 휴지통 아이콘으로 순간이동(텔레포트)시킴
- 금지: 모든 요소 전환에 곡선 경로 적용(패널 슬라이드·리스트 재배치 등 대부분의 UI 이동은 직선이 맞다)
- 필수: 스와이프-투-삭제 제스처에서만 아이템이 짧은 포물선을 그리며 휴지통 아이콘으로 이동

#### ⑤ Timing `[Disney]`
속도 자체가 정보(무게·중요도)를 전달한다.

- 금지: 10MB 파일과 10KB 파일의 업로드 진행 애니메이션을 똑같이 200ms로 종료
- 금지: 저장 버튼과 삭제 확인 버튼의 press feedback을 둘 다 동일하게 120ms로 설정
- 필수: 파괴적 액션(삭제) 확인 버튼은 press feedback을 `short4`(200ms)까지 지연, 일반 액션은 `short2`(100ms)로 즉각 반응

#### ⑥ Follow Through and Overlapping Action `[Disney]`
모든 부분이 동시에 멈추지 않는다 — 주요소가 멎은 뒤 부속 요소가 뒤따라 반응한다.

- 금지: 리스트에서 카드 하나를 삭제할 때 나머지 카드들을 레이아웃 점프로 순간 재배치
- 금지: 페이지 로드 시 헤더·본문·푸터를 전부 동일 duration으로 동시에 fade-in
- 필수: 카드 삭제 시 카드 자신은 `short4`(200ms) fade+scale로 사라지고, 아래 카드들은 50ms 지연 후 `medium2`(300ms)로 위치 이동

### 1.3 UI에 적용하지 않는 6원칙과 그 이유 `[자체]`

> IxDF 원문은 이 6개를 "UI 부적합"이라 배제하지 않는다 — 오히려 전부에 UI 적용 사례를 제시한다. 아래 배제는 원문의 주장이 아니라, "보편 UI 모션 원칙"(범용성 + 정량화 가능 + 슬롭과 경계가 뚜렷함)이라는 이 스킬의 채택 기준에서 저자가 내린 판단이다.

| 원칙 | 정의 `[Disney]` | 배제 이유 `[자체]` |
|---|---|---|
| Squash and Stretch | 중력·유연성의 착각을 위한 탄성 변형 | 캐릭터 애니메이션 관용구. 버튼이 눌릴 때 찌그러지면 스큐오모픽 인상을 주기 쉽고 flat/modern 톤과 충돌 — "보편 원칙"이 아니라 개별 스타일 선택에 가깝다 |
| Exaggeration | 재미·초점을 위한 과장 | IxDF 원문도 "과도하면 사용자를 짜증나게 한다"고 경고한다. 원칙 자체가 신중한 예외 취급을 요구해 보편 목록에 넣기엔 리스크가 크다 |
| Appeal | 관찰자의 주의를 끄는 매력 | IxDF 원문이 "수학적 공식이 없다"고 명시. 정량화 불가능한 미적 판단이라 토큰/규칙 기반인 이 스킬의 방법론에 담기 어렵다 |
| Secondary Action | 주 동작을 보조하는 추가 동작(예: 제출 후 색종이 효과) | 장식적 보조 동작은 슬롭 시그니처(과잉 축하 이펙트류)와 경계가 모호해 5절 슬롭 방어 원칙과 충돌 소지가 있다 |
| Straight-Ahead Action / Pose to Pose | 프레임 단위 제작 vs 키프레임 제작 — 애니메이터의 제작 방식 | 사용자가 지각하는 모션의 성질이 아니라 제작 워크플로우(CSS keyframes vs JS 프레임 제어)에 대응하는 개념. "왜 이렇게 움직여야 하는가"를 설명하는 지각 원칙이 아니라서 WHY층에서 제외 |
| Solid Drawing | 원근·볼륨의 견고함 | 정적 비주얼(그림자, elevation) 문제이지 모션 문제가 아니다 — 이식 챕터(디자인 시스템)의 shadow 토큰 영역과 중복되고 모션 챕터 범위 밖 |

### 1.4 이징 곡선의 심리학 `[MD3]`

| 커브 | 인상 | 적합한 맥락 |
|---|---|---|
| ease-out(decelerate) | 도착·안착 — 빠르게 시작해 부드럽게 멈춤 | 등장(entrance) |
| ease-in(accelerate) | 출발·이탈 — 천천히 시작해 빠르게 사라짐 | 퇴장(exit) |
| linear | 기계적·일정 — 가속·감속 없음 | 진행률 바처럼 "일정한 진행"을 표현할 때만. 진입/이동/이탈에는 쓰지 않는다 |
| ease-in-out(standard) | 이동·전환 — 시작도 끝도 부드러움 | 화면 내 위치 이동, 크기 변형 |

원칙: **등장은 decelerate(ease-out), 퇴장은 accelerate(ease-in), 이동은 standard(in-out).** `ease-in`으로 등장시키는 것은 3.4의 금지 구현 패턴이다.

---

## 2절. 모션의 성격 — WHEN

### 2.1 Productive vs Expressive `[Carbon]`

Carbon의 이분법. 판정 기준은 "이 인터랙션이 사용자의 작업 흐름 안에 있는가(→ productive) 아니면 감정적으로 의미 있는 순간인가(→ expressive)"다.

| | Productive | Expressive |
|---|---|---|
| 목적 | 작업 완수에 집중 | 중요한 순간을 강조 |
| 성격 | 빠르고 미묘(subtle) | 느리고 뚜렷 |
| easing 형태 `[Carbon]` | `cubic-bezier(0.2,0,0.38,0.9)`(standard) — 시작이 급하고 끝이 절제됨 | `cubic-bezier(0.4,0.14,0.3,1)`(standard) — 시작이 완만하고 끝이 더 유동적 |
| 실제 컴포넌트 예 | 툴팁, 탭 전환, 리스트 아이템 선택 | 온보딩 모달, 성공 확인 화면, 페이지 전환 |

> **차이는 속도만이 아니라 곡선 형태 자체다.** expressive 커브는 시작 지점(0.4, 0.14)이 완만해 "더 유동적/생동감 있는" 인상을 준다 — productive처럼 급출발하지 않는다.

컴포넌트 3종에 적용한 예: **좋아요 버튼**(하루 100+회 클릭 가능 → productive, `short1`(50ms) 이하의 미묘한 scale만) / **탭 전환**(반복 내비게이션 → productive, `short3` 150ms standard) / **결제 완료 화면**(간헐적·감정적 순간 → expressive, `medium3` 350ms emphasized-decelerate).

### 2.2 모션 시맨틱스 5분류 `[자체]`

| 분류 | 성격 배정 | easing |
|---|---|---|
| entrance(등장) | productive 기본, 강조 시 expressive | standard-decelerate / emphasized-decelerate |
| exit(퇴장) | entrance보다 항상 짧게 | standard-accelerate / emphasized-accelerate |
| transition(전환) | 화면 내 이동 | standard |
| feedback(피드백) | 항상 productive, `short` 계층만 | standard |
| ambient(장식) | 원칙적으로 모션 없음 | 해당 없음 — §5.1 `SLOP-AMBIENT-LOOP` 참조 |

### 2.3 빈도와 감쇠 `[자체]`

사용 빈도가 높을수록 모션을 줄인다 — 반복 노출되는 모션은 빠르게 피로도를 만든다.

| 빈도 | 예 | 처리 |
|---|---|---|
| 100+/일 | 좋아요, 체크박스 토글 | 애니메이션 제거 또는 `short1`(50ms) 이하의 즉각 피드백만 |
| 빈번한 내비게이션 | 탭 전환, 아코디언 | 최소 피드백(`short2–3`, 100–150ms) |
| 간헐적 표면 | 모달, 온보딩, 성공 화면 | 표준 모션(`medium`, 250–400ms) — 감쇠 대상 아님 |

### 2.4 거리-duration 관계 `[Carbon]`

원칙(다수 소스 확인): 이동 거리·크기 변화가 클수록 duration이 길어지되, **비례식이 아니라 비선형 스케일**이다("모든 거리에서 일관된 체감 속도를 만들기 위한 non-linear scale"). Carbon 공개 문서에도 정확한 수학 공식은 없다 — 없는 공식을 지어내지 않는다.

실무 휴리스틱 `[자체]`:

| 이동/크기 변화 | duration 계층 |
|---|---|
| 화면 내 짧은 이동(<100px), 미세 크기 변화 | short2–short4(100–200ms) |
| 화면 절반 이상 이동, 컴포넌트 단위 크기 변화(카드 확장 등) | medium1–medium4(250–400ms) |
| 전체 화면 전환, 레이아웃 재구성 | long–extra-long(450–1000ms) |

### 2.5 연출(choreography) `[MD3]`

- **Outgoing → incoming**: 나가는 요소가 먼저 움직이기 시작하고, 들어오는 요소가 뒤따른다. 동시에 시작하면 화면이 겹쳐 어수선하다
- **공유 축(shared axis)**: 같은 축(x/y/z) 위에서 나가는 요소와 들어오는 요소가 반대 방향으로 이동해 계층 관계를 표현. x축=같은 계층 간 이동, y축=상하 계층, z축=포워드/백워드 내비게이션
- **Container transform**: 한 요소(카드)가 다른 요소(상세 화면)로 형태를 유지하며 변형 — "어디서 왔는지" 공간 논리를 시각적으로 보존
- **Fade through**: 공유 축이 없는(서로 무관한) 두 화면 사이의 전환. 나가는 요소가 페이드아웃 후 들어오는 요소가 페이드인

> 슬롭 모션은 방향이 없다 — 좋은 모션은 페이지 전체에 걸쳐 하나의 일관된 공간 모델(요소가 어디서 와서 어디로 가는가)을 암시한다.

---

## 3절. 토큰과 규격 — WHAT

### 3.1 Duration 토큰 (16단계) `[MD3]`

m3.material.io/styles/motion/easing-and-duration 원문과 100% 일치 확정.

| 계층 | 1 | 2 | 3 | 4 | 용도 |
|---|---|---|---|---|---|
| `--dur-short` | 50ms | 100ms | 150ms | 200ms | 피드백, 아이콘, 셀렉션, press |
| `--dur-medium` | 250ms | 300ms | 350ms | 400ms | 카드 확장, bottom sheet, 컴포넌트 전환 |
| `--dur-long` | 450ms | 500ms | 550ms | 600ms | 대형 전환, 화면 내 큰 이동 |
| `--dur-extra-long` | 700ms | 800ms | 900ms | 1000ms | 전체 화면 전환, 최대 규모 변화 |

참고 `[Carbon]`: Carbon은 별도 6단계 체계(`fast-01` 70ms ~ `slow-02` 700ms)를 쓴다. 이 스킬은 MD3의 16단계를 채택한다 — 두 체계를 섞어 쓰지 않는다. Carbon 값은 "press 피드백에 70ms를 쓰는 다른 시스템도 있다"는 식의 참고로만 인용한다.

### 3.2 Easing 토큰 매트릭스 `[MD3]`

| 토큰 | cubic-bezier | 용도 |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 화면 내 이동·변형 기본값 |
| `--ease-standard-decel` | `cubic-bezier(0, 0, 0, 1)` | 등장(entrance) |
| `--ease-standard-accel` | `cubic-bezier(0.3, 0, 1, 1)` | 퇴장(exit) |
| `--ease-emphasized-decel` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | 강조 등장 |
| `--ease-emphasized-accel` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | 강조 퇴장 |

> `--ease-emphasized`(대칭형, 강조 이동 전반)는 MD3 원문에서 단일 cubic-bezier가 아니라 두 구간을 잇는 복합 곡선으로 정의된다. 단일 4포인트 값으로 확정하지 않는다 — 강조 모션이 필요하면 `--ease-emphasized-decel`(등장) / `--ease-emphasized-accel`(퇴장) 두 방향값만 쓴다.

**`--lift`/`--nudge` 흡수**: Fieldbook 기존 hover/press 변위 토큰은 duration·easing이 아니라 "얼마나 움직이는가"를 정의하는 변위 토큰이므로 이 매트릭스와 별도로 유지하되 같은 모션 토큰 그룹에 둔다 — `--lift: -4px`(hover 시 상승, `--dur-short3` + `--ease-standard`와 조합), `--nudge: -2px`(press 시 미세 이동, `--dur-short1` + `--ease-standard`와 조합).

### 3.3 요소별 속도 규격표

| 요소 | duration | easing | 비고 |
|---|---|---|---|
| Press feedback | `short2`–`short3`(100–150ms) | `--ease-standard` | `scale(.97)`, 100+/일 액션은 모션 생략(§2.3) |
| Tooltip | `short2`–`short3` | 등장 `--ease-standard-decel` / 퇴장 `--ease-standard-accel` | opacity 단독, translate 없음(위치가 트리거에 고정) |
| Dropdown/Popover | `short3`–`short4` | `--ease-standard-decel` | `transform-origin`을 트리거에 앵커 |
| Modal | `medium1`–`medium4` | 등장 `--ease-emphasized-decel` | 배경 dim은 opacity만, `transform-origin: center` |
| Drawer | `medium2`–`long1` | `--ease-standard` | 이동 거리에 비례해 계층 내 단계 상향(§2.4) |
| Page transition | `long1`–`extra-long1` | `--ease-emphasized-decel`/`accel` | outgoing 먼저, incoming 나중(§2.5) |

### 3.4 금지 구현 패턴

- `transition: all` — 의도 없는 전면 전환. 속성을 명시한다(`transition: opacity 150ms, transform 150ms`)
- `ease-in`으로 시작하는 entrance — 출발감을 주는 커브로 등장시키면 "빨려 나오는" 부자연스러운 인상
- `scale(0)` 시작값 — 부피가 0에서 갑자기 생겨나는 인상. `scale(0.9)` 이상에서 시작
- 장식용 `animation: * infinite` — `SLOP-AMBIENT-LOOP`(§5.1)

---

## 4절. 패턴 카탈로그

각 패턴은 금지 / 금지 / 필수 순서로 제시한다. 라이브 데모는 `demos/`에 버튼 클릭으로 bad/good을 토글하는 형태로 구현한다(Step 4).

### 4.1 Fade
opacity 단독 vs opacity+translate 조합.

- 금지: 팝업 등장에 `transition: opacity 800ms` 사용
- 금지: 예외 없이 모든 요소에 `opacity:0; translateY(20px)` fade-up 적용(`SLOP-FADE-UP-ALL`, §5.1)
- 필수: 툴팁은 opacity만(`short2`, translate 없음), 카드 등장은 opacity+`translateY(8px)`(`medium1`)

### 4.2 Slide
방향성 있는 진입, 트리거 위치에 앵커된 방향 결정.

- 금지: 우측 알림 아이콘 클릭 시 패널을 좌측에서 슬라이드시킴
- 금지: 트리거 위치와 무관하게 모든 슬라이드를 하단→상단으로 통일
- 필수: 우측 상단 아이콘 → 패널이 우측에서(`translateX`), 하단 탭 → 바텀시트가 하단에서(`translateY`)

### 4.3 Scale
modal centering vs popover origin.

- 금지: 트리거 버튼 근처에 떠야 할 팝오버를 화면 중앙에서 확대되며 나타나게 구현
- 금지: 모달과 popover 모두에 동일하게 `scale(0.9)→scale(1)` 적용
- 필수: 모달 `transform-origin: center`, dropdown/popover `transform-origin: top left`(트리거 앵커)

### 4.4 Collapse/Expand
아코디언, 드롭다운. height 애니메이션의 성능 문제와 대안.

- 금지: `height: auto`를 직접 transition
- 금지: `max-height: 1000px` 트릭으로 우회하고 콘텐츠 길이와 무관하게 고정 duration 사용
- 필수: `grid-template-rows: 0fr → 1fr`(높이 자동 대응) 또는 실측 높이 계산 후 콘텐츠 길이에 비례해 duration 조정

### 4.5 Stagger
목록 순차 등장. delay 간격과 최대 개수.

- 금지: 항목당 delay 500ms 적용
- 금지: 항목 수 무관하게 `delay: i * 100ms` 일괄 적용(`SLOP-STAGGER-ALL`, §5.1, 예산 §5.2 초과)
- 필수: 최대 6개까지만 80ms 간격 개별 delay(총 400ms 이내), 7번째부터는 배치로 동시 등장

### 4.6 Morph/Shared-element
요소 간 연속성. container transform 패턴.

- 금지: 카드 클릭 시 상세 페이지 전체를 카드와 무관하게 새로 fade-in시킴
- 금지: 모든 카드→상세 전환에 레이아웃 구조 차이와 무관하게 동일한 container transform 적용
- 필수: 카드의 이미지·제목만 상세 페이지의 동일 요소 위치로 morph, 나머지 콘텐츠는 뒤이어 fade-in(follow-through)

### 4.7 Press feedback
`scale(.97)` 100–150ms(`short2`–`short3`).

- 금지: press feedback을 생략하거나 `scale(0.8)`처럼 과도하게 축소
- 금지: 버튼·카드·아이콘·텍스트 링크 전부에 동일한 `scale(.97)` 100ms 적용
- 필수: 버튼/카드류는 `scale(.97)` `short2`(100ms), 텍스트 링크는 scale 대신 color/underline 전환, 100+/일 액션은 모션 생략

### 4.8 Scroll-reveal
슬롭의 진원지. 허용 조건(페이지당 상한, JS 실패 시 콘텐츠 노출 보장)과 금지 조건.

- 금지: JS 로드 실패 시 `opacity:0`가 그대로 남아 콘텐츠가 영구히 숨겨지게 구현
- 금지: 페이지의 모든 섹션에 스크롤 진입 시 fade-up 적용(`SLOP-FADE-UP-ALL`의 스크롤 버전)
- 필수: 페이지당 최대 1개 섹션만(§5.2), CSS 초기값은 항상 보이는 상태로 두고 JS가 있을 때만 `opacity:0` 클래스 추가(no-JS/실패 시 자동으로 콘텐츠 노출)

### 4.9 패럴랙스 / Scroll-jacking
원칙적 금지, 예외가 성립하는 좁은 조건.

- 금지: 스크롤 방향을 가로채 사용자가 원하는 위치로 이동하지 못하게 구현(scroll-jacking)
- 금지: 히어로 배경 이미지에 제품·주제와 무관하게 패럴랙스 적용(`SLOP-PARALLAX-HERO`)
- 필수: 원칙적으로 사용하지 않는다. 예외는 스크롤 자체가 제품 주제인 경우(지도 앱의 공간 탐색, 사진 포트폴리오의 시차 연출)뿐이며 이 경우도 `prefers-reduced-motion`에서 완전히 제거

---

## 5절. 슬롭 방어 — WHAT NOT

### 5.1 모션 슬롭 시그니처 7종

| 코드 | 패턴 | 코드 시그니처 | 왜 LLM이 반복 생성하는가 | 대안 |
|---|---|---|---|---|
| `SLOP-FADE-UP-ALL` | 모든 섹션 fade-up-on-scroll | `opacity:0; translateY(20px)` + IntersectionObserver 전면 적용 | 마케팅 랜딩페이지 템플릿(Webflow/Framer류)에 과다 표집되어 "모던 웹"의 디폴트로 각인 | 섹션은 모션 없이 즉시 노출. signature motion(§5.3) 예산 1개만 의도적으로 선정 |
| `SLOP-STAGGER-ALL` | 모든 리스트/그리드에 순차 등장 | 항목 수 무관 일괄 `delay: i * n ms` | "정성스러워 보이는" 디테일로 과학습되어 리스트만 보면 무조건 순차 등장을 붙임 | §5.2 예산(최대 6개, 80ms 간격, 총 400ms) 적용, 초과 시 배치 등장 |
| `SLOP-HOVER-LIFT-ALL` | 모든 카드에 hover lift | 전 카드 `translateY(-4px)` + shadow 확대 | 카드 UI 템플릿에서 hover lift가 "인터랙티브함"의 표준 신호로 과학습 | 실제 클릭 가능한 요소에만, `@media (hover:hover) and (pointer:fine)` 내부에서만(§6.2) |
| `SLOP-TYPEWRITER` | 타이프라이터 텍스트 효과 | 글자 단위 순차 출력 | "AI스러움"을 연출하려는 챗봇/히어로 카피 템플릿에서 과사용 | 텍스트는 즉시 렌더. 강조가 필요하면 opacity fade 1회(`short4`) |
| `SLOP-COUNTUP` | 숫자 카운트업 | 스크롤 진입 시 0→N 카운트 | "성과 지표" 대시보드/랜딩 템플릿에서 극적으로 보이려 관습화 | 정적 숫자 표시. 실시간 갱신값이면 변경분만 짧게 강조(color flash, `short2`) |
| `SLOP-PARALLAX-HERO` | 히어로 패럴랙스 | 스크롤 연동 배경 이동 | 2010년대 에이전시 포트폴리오 학습 데이터에서 "고급스러움"의 시그니처로 과표집 | 정적 히어로 + 이미지 자체 품질로 임팩트(§4.9) |
| `SLOP-AMBIENT-LOOP` | 장식용 무한 루프 | 떠다니는 blob, 펄싱 그라디언트, `animation: * infinite` | "생동감 있는 배경"을 위해 습관적으로 추가 | 정적 배경. 필요하면 1개만 — opacity 변화폭 0.05 이하·주기 20s 이상으로 인지 임계 아래 유지`[자체]`, `prefers-reduced-motion`에서 완전 정지 |

### 5.2 모션 예산 (정량 상한)

| 항목 | 상한 | 근거 |
|---|---|---|
| 초기 뷰포트 내 entrance 애니메이션 요소 수 | 최대 5개 | `[자체]` nav/hero heading/hero sub/CTA/hero visual 정도가 "의미 있는" entrance 후보의 실무적 상한. 초과 시 `SLOP-FADE-UP-ALL`과 구분이 안 됨 — 그룹을 컨테이너 단위 1회 전환으로 묶거나 저우선순위 요소는 모션 생략 |
| Entrance choreography 전체 완료 | ≤600ms | 업계 UX 성능 가이드 교차확인("entrance는 최대 600ms, 버튼 press류는 200ms 이하") + MD3 duration 계층상 `long4`(600ms)가 "화면 내 큰 이동"의 상한이라는 점과 정합 |
| Stagger 개별 delay 최대 개수 / 간격 / 총 delay 상한 | 6개 / 80ms / 400ms | 600ms 예산 안에서 마지막 요소도 자기 duration(최소 `short3` 150ms)을 가지므로 delay 누적은 450ms 이내여야 함. 안전마진을 두어 400ms, 간격 80ms → 6번째 항목(5×80=400ms)에서 정확히 상한 도달. `SLOP-STAGGER-ALL`의 직접적 해독제 |
| 스크롤 트리거 모션 페이지당 횟수 | 0–1개 | §5.3 "One signature motion"과 논리적으로 동치 — 스크롤 트리거는 가장 눈에 띄는 카테고리이므로 signature motion 예산 자체를 이미 소진한다 |
| LCP 요소 초기 `opacity:0` | 금지 | LCP는 요소가 완전히 렌더된 시점을 기준으로 측정되므로, entrance 애니메이션으로 늦게 나타나면 LCP 점수가 그대로 악화됨 |
| 페이지당 signature motion | 1개 — 초과 시 우선순위 재판정 | §5.3 |

### 5.3 One signature motion

페이지는 의도적 모션 순간 **하나**를 갖고 나머지는 조용하다. 모든 것이 움직이면 아무것도 강조되지 않는다.

**설계하는 법**: 제품이 증명하려는 약속(promise) 하나를 고르고, 그 약속을 몸으로 보여주는 모션을 만든다 — 협업 도구라면 "실시간으로 함께 움직인다"는 약속을 커서/선택영역의 부드러운 추적으로, 정밀 도구라면 "정확하다"는 약속을 스냅 애니메이션의 딱 떨어지는 정지로 증명한다. 주제에서 도출되지 않은 모션(예: 아무 맥락 없는 컨페티)은 signature가 아니라 장식이다.

**선정 기준**: ① 제품의 핵심 약속과 직결되는가 ② 페이지에서 가장 자주 반복되는 핵심 상호작용에 붙는가(장식적 일회성 요소 제외) ③ 없애면 제품 정체성이 흐려지는가 ④ **체감 가능한가** — 페이지를 정상 속도로 훑어보는 사용자가 실제로 마주칠 확률이 높은가. 네 질문에 모두 "예"인 후보만 signature로 남긴다.

**체감 가능성 체크**: 스크롤 트리거 reveal 하나를 signature로 고를 때, 그 트리거 지점이 페이지 중하단부에 있고 애니메이션이 200–300ms 안에 끝난다면 — 사용자가 빠르게 스크롤하면 재생 중인 프레임을 아예 못 보고 지나칠 수 있다. 반복 상호작용(hover, expand/collapse, 탭 전환)에 붙일 수 있는 후보가 있다면 일회성 스크롤 reveal보다 우선한다 — 사용자가 그 요소를 건드릴 때마다 재생되므로 놓칠 확률이 낮다. 부득이 일회성 reveal을 쓴다면 above-the-fold(첫 화면)에 두거나, 최소 재생 시간을 늘려(§3.1 duration 토큰에서 한 단계 위) 지나치는 도중에도 눈에 걸리게 한다.

**나머지를 조용하게 만드는 법**: signature 외 모든 전환은 `productive`(§2.1) 성격의 짧고 미묘한 모션으로 통일하거나, 아예 모션 없이 즉시 상태 변경한다. 단, "조용하게"는 "아예 없앤다"와 다르다 — 실제로 상호작용 가능한 요소(링크·버튼·아코디언·탭)의 hover/focus/press 피드백은 signature 예산과 별개로 항상 있어야 한다. 상호작용 요소가 하나도 움직이지 않으면 "절제된 디자인"이 아니라 "모션이 안 보인다"는 인상만 남는다.

### 5.4 Motion replaceability test

제품·주제를 다른 것으로 교체해도 모션이 그대로 어울리면 generic 판정 → 재설계.

워크스루: "이 페이드업 히어로 애니메이션을 이커머스에서 SaaS 대시보드로, 다시 개인 블로그로 옮겨도 위화감이 없는가?" — 위화감이 없다면 그 모션은 어떤 제품과도 무관한 장식이다. signature motion(§5.3)은 이 테스트를 통과하지 못해야 정상이다 — 다른 제품에 옮기면 어색해야, 그 제품만의 것이라는 뜻이다.

### 5.5 균일성 진단

모든 요소가 같은 duration/delay/거리로 움직이면 슬롭이다. 진짜 크래프트는 역할별로 속도가 다르다 — §1.2 Timing 원칙, §3.3 요소별 속도 규격표가 이미 역할별 차등을 전제한다. 코드에서 동일한 `transition` 선언이 3곳 이상 반복된다면 "모든 요소를 똑같이 취급하고 있다"는 신호다(§6.5 정적 탐지 규칙과 연결).

---

## 6절. 접근성과 품질 게이트 — GATE

### 6.1 prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- **제거**: travel(요소 이동), parallax, zoom, spin — 전정 장애(vestibular disorder) 유발 가능한 움직임
- **유지**: opacity/color 기반 피드백(예: 버튼 클릭 시 배경색 즉시 전환) — 상태 변화 인지는 보존해야 한다
- 위 CSS는 전역 무력화이므로, 상태 피드백까지 죽이지 않으려면 opacity 전환만은 별도로 `!important` 예외를 두거나 각 컴포넌트에서 `@media (prefers-reduced-motion: no-preference)` 안에만 이동/스케일 애니메이션을 넣는 방식을 권장한다

### 6.2 hover capability

```css
@media (hover: hover) and (pointer: fine) {
  .card:hover { transform: translateY(var(--lift)); }
}
```

터치 디바이스는 hover 상태가 없거나 불안정하게 트리거된다. hover 모션은 이 미디어쿼리 내부에서만 정의한다 — `SLOP-HOVER-LIFT-ALL`의 구조적 방지책이기도 하다.

### 6.3 성능 규칙

- **transform + opacity only** — 이 두 속성만 GPU 합성(compositing)만으로 처리되어 레이아웃/페인트를 유발하지 않는다
- **layout property 애니메이션 금지** — `width`, `height`, `top`, `left`, `margin`은 매 프레임 레이아웃 재계산을 유발한다(§4.4 Collapse/Expand의 대안 패턴 참조)
- **60fps 유지** — 브라우저는 초당 약 60프레임 렌더링을 목표로 하며 프레임당 예산은 약 16ms다. 이 예산을 넘기는 속성(레이아웃/페인트 유발)의 애니메이션은 끊김(jank)을 만든다
- **`will-change`**: 애니메이션 직전에만 추가하고 끝나면 제거한다. 상시 선언은 브라우저가 불필요한 레이어를 계속 유지하게 해 메모리를 낭비한다

### 6.4 4-gate 필터 적용 실습

판정 순서: **Frequency → Purpose → Speed → Function**. 각 게이트를 통과 못 하면 그 자리에서 탈락하고, 탈락 지점을 명시한다.

| Gate | 질문 | 탈락 시 |
|---|---|---|
| 1. Frequency | 이 요소는 얼마나 자주 트리거되는가? 100+/일이면 | 모션 제거 또는 `short1` 미만으로 축소 |
| 2. Purpose | 모션이 상태 변화·공간 관계·주의 유도 중 무엇을 전달하는가? 없으면(순수 장식) | `SLOP-*` 판정, 제거 |
| 3. Speed | §2 분류(entrance/exit/transition/feedback)에 맞는 duration·easing을 §3 토큰에서 찾을 수 있는가? 못 찾으면 | 규격표에 없는 임의 속도를 쓰지 말고, 가장 가까운 기존 요소 규격을 재사용 |
| 4. Function | `prefers-reduced-motion`·`hover` capability·60fps 규칙(§6.1–6.3)을 지키는가? 아니면 | 규칙 위반 부분 수정 전까지 미승인 |

**워크스루 예 — "카드에 hover 시 그림자가 커지며 3D로 살짝 기운다"**: Gate1 카드 그리드는 반복 노출이 잦지만 hover는 사용자 의도적 동작이라 통과 → Gate2 "클릭 가능함"을 전달하는가? "3D 기울임"은 순수 장식(정보 없음) → **Gate2에서 탈락, `SLOP-*`류로 재설계**(그림자 확대만 유지, 기울임 제거).

### 6.5 정적 탐지 규칙 (grep 가능)

에이전트 감사 단계에서 코드 레벨로 검출 가능한 시그니처:

- `transition:\s*all` — 의도 없는 전면 전환
- `animation:.*infinite` — 장식용 무한 루프 후보(`SLOP-AMBIENT-LOOP`)
- 동일 `duration`+`delay` 조합이 3회 이상 반복 — 균일성 자체가 슬롭 신호(§5.5)
- 초기 뷰포트 요소(특히 LCP 후보 — hero heading, hero image)에 `opacity:\s*0`
- `ease-in`으로 시작하는 entrance 관련 선언(등장 클래스/키프레임에 `ease-in` 단독 사용)
- `scale\(0\)` 시작값
- layout property(`width`, `height`, `top`, `left`, `margin`) 애니메이션에 `transition`/`@keyframes` 사용
- `delay:\s*i\s*\*` 또는 반복문 인덱스 기반 stagger 생성 코드에서 6개 초과 상한 미체크

정적 검사는 feel review(§6.6)와 짝을 이룬다 — 코드로 잡는 것과 눈으로 잡는 것을 분리한다.

### 6.6 Feel review 프로토콜

3단계 속도로 검증한다:

1. **일반 속도** — 실사용 맥락에서 위화감이 없는가(과속/과속 아님은 이 단계에서 대략적으로만 판단)
2. **0.25× 배속(느린 재생)** — 화면 녹화를 0.25배속으로 재생해 시퀀스 순서(§2.5 outgoing→incoming), 경로(§1.2 Arc), 균일성(§5.5)을 정밀 확인
3. **프레임 단위** — 시작 프레임과 끝 프레임만 정지해서 확인: 시작 프레임이 `scale(0)`이나 완전 투명이 아닌지(§3.4), 끝 프레임이 목표 상태와 정확히 일치하는지(오버슈트 잔여값 없는지)

---

## 금지/필수

- 금지: `transition: all`
- 금지: `animation: * infinite`로 만든 장식 루프
- 금지: `scale(0)` 시작값
- 금지: `width`/`height`/`top`/`left`/`margin`에 `transition`
- 금지: 등장에 `ease-in` 단독 사용
- 금지: 히어로 헤드라인 등 LCP 후보에 `opacity: 0` 시작값
- 금지: entrance 클래스를 6개 이상 요소에 부착
- 금지: stagger 7단계 이상 / 간격 81ms 이상 / 총 delay 401ms 이상
- 금지: `@media (hover:hover) and (pointer:fine)` 밖의 `translateY(-Npx)` hover lift
- 금지: `transition`·`@keyframes`를 쓰면서 `@media (prefers-reduced-motion: reduce)` 없음
- 금지: `/* plan */`의 `모션:` 칸을 비워 둠
- 필수: signature motion은 페이지당 1개. 나머지는 상태 전이(hover/press/포커스)만
- 필수: duration은 `--dur-short2`(100ms)~`--dur-long1`(450ms) 토큰에서만 고른다. `0.3s` 같은 리터럴 금지
- 필수: 등장 `cubic-bezier(0, 0, 0, 1)` · 퇴장 `cubic-bezier(0.3, 0, 1, 1)` · 이동 `cubic-bezier(0.2, 0, 0, 1)`
- 필수: entrance 연출 전체 ≤600ms
- 필수: reduced-motion에서 이동·스케일·회전은 정지, opacity·color 피드백은 유지
- 필수: 마케팅=expressive(150–450ms) / 앱·문서=productive(100–300ms)
