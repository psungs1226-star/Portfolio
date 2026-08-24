# 스타일 백과사전 — 인덱스

활성 22종의 인덱스. **여기서 후보를 1~3개 추린 뒤, 그 후보가 속한 카테고리 파일만 읽는다** — 22종 전체 상세를 한꺼번에 읽지 않는다. 상세(사례 URL + "왜 이 사례인가", 레시피 7속성, 계보, 관찰 포인트, 메인 레퍼런스는 구현 스펙까지)는 카테고리 파일에 있다. 출처: UI:UX Fieldbook `STYLES`/`STYLE_DNA`/`STYLE_REL`/`STYLE_KW`/`STYLE_OBSERVE`/`CMP_RECIPE`/`ANALYZER`.

| 카테고리 | 활성 | 상세 파일 |
|---|---|---|
| Modern | 6 | `references/styles/modern.md` |
| Brutal | 2 ⭐ | `references/styles/brutal.md` |
| Effect | 5 | `references/styles/effect.md` |
| Art | 2 | `references/styles/art.md` |
| Emotion | 7 | `references/styles/emotion.md` |

원본 29종 중 **7종은 금지**됐다(아래 "금지 스타일"). 상세 파일의 번호는 Fieldbook 원본 순서라 중간이 비어 있다.

## 메인 레퍼런스 8종 — 여기서 먼저 고른다

사용자가 방향을 명시하지 않았다면 **이 8종 안에서 먼저 후보를 찾는다.** 깊이·질감·색을 적극적으로 쓰는 계열로, 이 프로젝트가 지향하는 방향이다. 8종에는 카테고리 파일에 **구현 스펙**(그림자 공식·보더/그림자 비율·투명도 단계 등 실측값)이 붙어 있다.

| 스타일 | 태그 | 한 줄 | 파일 |
|---|---|---|---|
| Material Design | `material` | 그림자 2겹으로 만드는 종이의 물리 | modern.md |
| Material You | `material-you` | 시드 1색 → tonal palette, 형태가 색만큼 말한다 | modern.md |
| Brutalism | `brutal` | 색 3개·radius 0·보더가 유일한 구조 | brutal.md |
| Neo-Brutalism | `neobrutal` | 하드 오프셋 섀도(blur 0)와 두꺼운 보더 한 쌍 | brutal.md |
| Glassmorphism | `glass` | 그라데이션 배경 + 4요소 유리 공식 | effect.md |
| Neumorphism | `neumorph` | 같은 톤 위 대각선 대칭 양각·음각 | effect.md |
| Claymorphism | `clay` | 세로 3중 그림자로 "앉은 토기" | effect.md |
| Memphis | `memphis` | 색 4–5개, radius가 제각각인 것이 일관성 | art.md |

하이브리드도 가능하다 — 예: `neobrutal`의 보더/하드섀도 + `clay`의 극단 radius, `glass`의 유리 패널 + `material-you`의 tonal palette. 단 DNA 8축에서 **두 스타일이 충돌하는 축(예: `brutal` border4 vs `neumorph` border0)은 한쪽을 명시적으로 이긴 것으로 정한다.**

## 색은 레시피대로 가지 않는다 — 반드시 읽을 것

카테고리 파일의 레시피·구현 스펙에는 실제 hex 값이 들어 있다(예: `neobrutal`의 `#FFD23F`, `clay`의 `#EDE7FB`). **이 값을 그대로 복사하면 만드는 것마다 같은 색이 나온다.**

- **가져갈 것은 색 관계다**: 배경과 표면을 몇 단 분리하는가 · 그림자를 몇 겹 쌓고 어느 방향인가 · 그림자 색이 중성인가 표면색의 어두운 버전인가 · 액센트를 몇 개 쓰고 어디에 반복하는가 · 보더와 그림자 오프셋의 비율.
- **실제 색은 프로젝트에서 정한다**: 브랜드·주제·타깃에 맞는 색을 먼저 고르고, 그 색으로 위 관계를 재현한다. 색 조합 자체는 `references/color.md`의 패턴 7종과 대비 기준을 따른다 — **어울리는 조합이 먼저고, 스타일 레시피는 그 조합을 어떤 구조로 배치할지를 알려줄 뿐이다.**
- **예외는 "색의 개수"다**: `memphis`(4–5색)와 `neobrutal`(카드마다 다른 색)은 색이 많은 것 자체가 스타일의 정의라, 액센트 1개 원칙보다 스타일 정의가 우선한다. 이 경우에도 각 색에 서로 다른 역할을 배정한다.

## DNA와 계보

**DNA 8축**: type(타이포 존재감) · space(여백 — 많을수록 차분, 적을수록 압축) · contrast(대비 — 셀수록 메시지가 강함) · border(보더 강도 — 두꺼울수록 단단·도식적) · round(둥글기 — 클수록 부드럽고 친근) · shadow(그림자 깊이 — 깊을수록 입체·질감) · color(색 강도 — 강할수록 감성·장식적) · deco(장식 — 많을수록 풍성·복잡). 아래 표의 DNA 열은 **이 순서대로 8개 값(0–5)**을 하이픈으로 잇는다.

**계보 관계 5종**(카테고리 파일에 수록): Related / Influenced By / Influenced / Often Confused With / Opposite Direction. **금지 7종은 계보에서 제거했다** — 계보는 "다음 후보로 뭘 볼까"를 위한 데이터인데 금지 스타일은 후보가 될 수 없어서다.

> **접근성과의 관계**: 아래 스타일 정의(특히 저대비 계열: 럭셔리, 뉴모피즘 등)는 스타일 자체의 정의이지 접근성 위반이 아니다. 스타일 방향을 정하는 단계에서는 정의를 있는 그대로 따르고, 실제 제품화 단계에서만 `references/a11y.md` 기준을 재적용한다.

---

## Modern (6) → `references/styles/modern.md`

| # | 스타일 | 태그 | 태그라인 | DNA |
|---|---|---|---|---|
| 2 ⭐ | Material Design 머티리얼 | `material` | 종이와 잉크의 물리 법칙을 화면에 옮긴 구글의 디자인 언어 | 4-3-3-1-3-4-4-2 |
| 3 ⭐ | Material You 머티리얼 유 | `material-you` | 배경화면에서 색을 뽑아내는 개인화된 디자인 시스템 | 4-4-3-1-5-3-5-3 |
| 4 | Fluent Design 플루언트 | `fluent` | 빛·음영·재질·깊이로 디지털을 물리적으로 느끼게 하는 MS의 시스템 | 4-3-3-1-3-3-4-4 |
| 6 | Luxury 럭셔리 | `luxury` | 검은 화면 위의 금색 타이포. 접근성이 아니라 희소성을 말한다 | 4-4-3-1-1-1-2-3 |
| 7 | Editorial 에디토리얼 | `editorial` | 잡지의 전통을 화면으로. 읽는 시간을 디자인한다 | 5-4-2-0-0-0-1-2 |
| 8 | Corporate Memphis | `corp-memphis` | 플랫 일러스트의 상징. 심플한 도형과 밝은 색의 팔이 긴 캐릭터 | 3-3-3-0-3-1-5-4 |

## Brutal (2) ⭐ → `references/styles/brutal.md`

| # | 스타일 | 태그 | 태그라인 | DNA |
|---|---|---|---|---|
| 10 ⭐ | Brutalism 브루탈리즘 | `brutal` | 원시적 웹. 장식을 거부하는 과감한 타이포와 구조 | 5-2-5-4-0-0-4-2 |
| 11 ⭐ | Neo-Brutalism 네오 브루탈리즘 | `neobrutal` | 브루탈리즘을 부드럽게, 밝게, 그리고 에너지 넘치게 재해석 | 4-3-4-5-2-5-5-3 |

## Effect (5) → `references/styles/effect.md`

| # | 스타일 | 태그 | 태그라인 | DNA |
|---|---|---|---|---|
| 12 ⭐ | Glassmorphism 글래스모피즘 | `glass` | 색 위에 떠 있는 유리. 블러와 투명도로 만드는 현대적 질감 | 3-3-3-2-5-4-4-4 |
| 13 ⭐ | Neumorphism 뉴모피즘 | `neumorph` | 같은 톤의 그림자로 만드는 "눌러진 소프트웨어" | 3-4-2-0-4-5-2-3 |
| 14 ⭐ | Claymorphism 클레이모피즘 | `clay` | 찰흙처럼 부드럽고 둥글고 통통한 디자인 | 3-3-3-1-5-4-4-4 |
| 15 | Skeuomorphism 스큐어모피즘 | `skeuo` | 실제 세계의 재질과 빛을 화면에 그대로 재현 | 3-3-2-2-3-4-3-5 |
| 16 | Frutiger Aero 프루티거 에어로 | `frutiger` | 2000년대의 유리 같은 미래. 반짝임과 물결로 가득한 인터넷 | 3-3-3-2-5-4-5-5 |

## Art (2) → `references/styles/art.md`

| # | 스타일 | 태그 | 태그라인 | DNA |
|---|---|---|---|---|
| 19 ⭐ | Memphis 멤피스 | `memphis` | 1980년대의 대담한 패턴과 파스텔, 그리고 장난기 | 3-3-3-1-2-1-5-5 |
| 21 | Art Deco 아르데코 | `artdeco` | 금빛의 기하학. 1920~30년대의 번영과 장식 | 4-3-3-3-0-0-3-5 |

## Emotion (7) → `references/styles/emotion.md`

| # | 스타일 | 태그 | 태그라인 | DNA |
|---|---|---|---|---|
| 23 | Retro Web 레트로 웹 | `retro` | 90년대 인터넷의 온기. 베이지와 갈색, 그리고 구식 창문 | 3-3-2-3-0-1-2-4 |
| 24 | Y2K | `y2k` | 크롬과 거품이 가득한, 2000년대가 꿈꾸던 미래 | 3-3-3-2-4-4-5-5 |
| 25 | Cyberpunk 사이버펑크 | `cyberpunk` | 네온이 터지는 디스토피아. 글리치와 광고 홀로그램 | 5-2-5-2-1-5-5-5 |
| 26 | Vaporwave 베이퍼웨이브 | `vaporwave` | 보라와 핑크의 노스탤지어. 가상의 과거, 이상적인 80년대 | 3-3-3-1-2-2-5-5 |
| 27 | Scandinavian 스칸디나비아 | `scandi` | 빛, 나무, 그리고 따뜻한 최소함 | 3-5-2-0-1-0-2-1 |
| 28 | Japanese Minimalism 일본 미니멀리즘 | `jpminimal` | 여백(間, Ma)과 침묵. 없는 것이 의미가 되는 디자인 | 4-5-2-0-0-0-1-0 |
| 29 | Acid Graphics 애시드 그래픽 | `acid` | 레이브의 색, 흐르는 무지개, 반짝이는 PVC | 4-3-5-2-2-1-5-5 |

---

## 금지 스타일 (7종) — 채택하지 않는다

아래 7종은 **후보로 올리지 않는다.** 사용자가 이름을 직접 지정한 경우에만 예외로 하되, 그때도 "왜 이 스타일이 슬롭으로 흐르기 쉬운지"를 먼저 알리고 대체안을 함께 제시한다.

금지 사유는 두 갈래다 — ① **순수주의 기하학 4종**: 100년 전 인쇄 매체의 조형 규칙이라 웹에서 재현하면 구식으로 읽히고, "원색 사각형 + 그리드"라는 뻔한 흉내로 귀결된다. ② **무난한 회색 UI 3종**: DNA 8축이 전부 중간값(1–3)이라 뚜렷한 축이 없고, "모던하고 깔끔하게"라는 요청에 AI가 기본값으로 생성하는 바로 그 결과물이다.

| 금지 | 태그 | 사유 | 대체 |
|---|---|---|---|
| Swiss Style | `swiss` | 순수주의. 그리드+그로테스크+빨간 포인트가 "깔끔한 디자인"의 자동 응답이 됨 | `neobrutal`(구조는 단단하게, 색·그림자로 개성) · `material`(그리드·타입스케일은 살리고 깊이 추가) |
| Bauhaus | `bauhaus` | 순수주의. 원색+기본도형이 웹에서 도형 나열로 귀결 | `memphis`(기하 도형을 쓰되 다색·장난기) · `neobrutal` |
| De Stijl | `destijl` | 순수주의의 극단. 수직·수평·원색만 → 몬드리안 흉내 | `memphis` · `neobrutal` |
| Constructivism | `construct` | 순수주의. 사선+빨강검정 선전 포스터 어법이 제품 UI와 안 맞음 | `brutal`(고대비 타이포가 구조가 되는 어법) · `acid` |
| Minimalism | `minimal` | **무난한 회색 UI의 최대 발생원.** DNA 3-5-3-1-1-0-1-0 — 여백 외에 뚜렷한 축이 없어 "스타일 없음"과 구별되지 않음 | `jpminimal`(여백을 극단까지 밀 때만) · `scandi`(온도 있는 색) · `neumorph`/`glass`(절제하되 질감으로 승부) |
| Flat Design | `flat` | 그림자·질감을 제거해 깊이 표현 수단이 없음. 2013년 iOS 7의 산물 | `material`(플랫의 명료함 + elevation) · `material-you` |
| Corporate | `corporate` | 네이비/화이트 "안전한 기업 톤"이 곧 슬롭의 정의 | `material`(신뢰감 + 시스템) · `glass`(전문적이되 질감 있음) |

**금지 스타일도 계보에는 역사적으로 존재한다** — `brutal`은 `construct`/`bauhaus`에서, `material`은 `flat`의 반작용에서 나왔다. 그 영향 관계를 이해하는 것은 유용하지만, **결과물의 스타일로 채택하지는 않는다.**

## 태그 → 카테고리 (계보 참조 해결용)

- **modern.md**: `material` `material-you` `fluent` `luxury` `editorial` `corp-memphis`
- **brutal.md**: `brutal` `neobrutal`
- **effect.md**: `glass` `neumorph` `clay` `skeuo` `frutiger`
- **art.md**: `memphis` `artdeco`
- **emotion.md**: `retro` `y2k` `cyberpunk` `vaporwave` `scandi` `jpminimal` `acid`
- **금지(상세 없음)**: `minimal` `flat` `corporate` `swiss` `bauhaus` `destijl` `construct`

계보 추적이 목적이라면 상세 파일을 다 열 필요는 없다 — 위 인덱스 표의 태그라인·DNA만으로도 관계가 대체로 읽힌다(예: `neumorph` 3-4-2-0-4-5-2-3 ↔ `brutal` 5-2-5-4-0-0-4-2 — border·round·shadow가 정반대라 서로 Opposite). 실제로 채택 후보에 올릴 때만 상세 파일을 연다.

## 5축 분석기 (스타일 식별용)

기존 화면의 스타일을 **식별·분석**할 때 쓴다. 5개 축에 답하면 후보 태그가 좁혀지고, 그 태그의 카테고리를 위 매핑에서 찾아 그 파일만 읽는다. 금지 스타일로 판정되는 것도 정상이다 — 남의 화면을 분석하는 것과 우리가 만드는 것은 다른 문제다.

| 축 | 보기 → 연결 스타일 |
|---|---|
| Layout | Grid→grid,bento,card · Bento→bento · Magazine→editorial,magazine,grid · Split→split · Masonry→masonry · Dashboard→dashboard,grid,card · Timeline→timeline |
| Style | Minimal→jpminimal,scandi · Brutal→brutal,neobrutal · Glass→glass,fluent · Playful→memphis,acid,clay,corp-memphis · Luxury→luxury,artdeco · Dark/Neon→cyberpunk,vaporwave |
| Typography | Serif→luxury,artdeco,editorial · Sans→scandi,material,glass · Mono→cyberpunk,retro · Display/Bold→brutal,neobrutal,acid |
| Color | Monochrome→jpminimal,scandi,luxury · Accent→material,corp-memphis · Pastel→clay,memphis,scandi,glass · Neon→cyberpunk,vaporwave,acid · Gradient→glass,vaporwave,y2k,acid |
| Purpose | Landing→neobrutal,brutal,glass,split,zpattern · Dashboard→material,dashboard,grid,sidebar · Portfolio→editorial,masonry,bento,memphis · Store→scandi,card,material · Content/News→editorial,fpattern,magazine,timeline · Brand Site→luxury,artdeco,acid,cyberpunk |

(Layout 축의 grid/bento/split/masonry/dashboard/timeline 등은 스타일 태그가 아니라 레이아웃 패턴명이다 — `references/layout.md` 참조.)

## Compare Lab

동일 콘텐츠(브랜드명·헤드라인·CTA 문구 고정)를 여러 스타일 레시피로 나란히 렌더링해 비교하는 방법론. 각 레시피의 7개 메타 속성(type/color/layout/border/radius/spacing/motion)은 카테고리 파일의 **레시피** 줄에 실려 있다. 스타일을 고민 중이라면 후보 2~3개를 같은 콘텐츠로 각각 만들어보고 고르는 것이 설명보다 빠르다.

## 금지/필수

- 금지: "브루탈리즘으로 해달라"는 요청에 색만 강렬하게 쓰고 radius·그림자는 그대로 둠(브루탈리즘은 `radius:0`·`shadow:0`이 정의의 일부, 카테고리 파일 구현 스펙 참조)
- 금지: 스타일 방향 없이 "모던하고 깔끔하게" 만들어 DNA 8축이 전부 2~3인 상태로 마무리(금지 7종이 대표하는 상태). `verify.py`가 커밋 신호 0개를 FAIL로 잡는다 — radius ≤2px 또는 ≥24px / 카드 보더 ≥3px / 그림자 alpha ≥0.18 / blur 0 하드 오프셋 / 카드 `backdrop-filter` / 배경 그라데이션 중 최소 1개
- 금지: 그림자 alpha를 0.06~0.12로 깔아놓고 "깊이를 줬다"고 판정(화면에서 안 보인다)
- 금지: 메인 레퍼런스를 골라놓고 구현 스펙의 hex를 그대로 복사
- 필수: 메인 레퍼런스 8종 중 하나(또는 명시적 하이브리드)를 고르고, DNA 8축 중 최소 2–3개 축에서 뚜렷한 값(0 또는 4–5)을 만든다. 구현 스펙의 **공식**(그림자 겹수·방향, 보더/오프셋 비율, 투명도 단계)은 정확히 따르되 **색은 프로젝트 팔레트로 재현**
