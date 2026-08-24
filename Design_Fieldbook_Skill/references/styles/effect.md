# 스타일 상세 — Effect (5)

`references/styles.md` 인덱스의 Effect 카테고리 상세. **Glassmorphism · Neumorphism · Claymorphism 3종이 메인 레퍼런스다.**

**DNA 8축 순서**: type · space · contrast · border · round · shadow · color · deco (각 0–5)
**계보의 태그가 다른 카테고리를 가리킬 수 있다** — 태그→카테고리 매핑은 `references/styles.md` 인덱스의 "태그 → 카테고리" 표를 본다. 계보에 `swiss`·`minimal`·`flat` 등이 나오면 **금지 스타일**이다 — 영향 관계를 이해하는 데만 쓰고 채택 후보로 삼지 않는다.

**구현 스펙의 색은 팔레트가 아니라 색 관계다** — 아래 hex/rgba는 Fieldbook 목업 실측값이다. 그대로 복사하면 결과물이 전부 같은 색이 된다. 가져갈 것은 관계(그림자 두 방향의 대칭, 투명도 단계, 배경과 표면의 톤 차)이고, 실제 색은 프로젝트 브랜드에 맞게 정한 뒤 그 관계를 재현한다. 특히 이 카테고리는 **효과 자체가 스타일이라 그림자·투명도 공식이 곧 정체성**이다 — 색보다 공식을 정확히 옮기는 것이 중요하다.

---

### 12. Glassmorphism 글래스모피즘 — `glass` ⭐ 메인 레퍼런스
**태그라인**: 색 위에 떠 있는 유리. 블러와 투명도로 만드는 현대적 질감. **정의**: 반투명 표면과 배경 블러(`backdrop-filter`)를 결합해 유리처럼 보이게 하는 기법. 배경이 비치면서도 내용은 또렷하게 읽히는 것이 핵심. **특징**: Backdrop Blur, Translucency, Light Border, Depth Layering
**사례**: Linear(https://linear.app) — 유리 패널과 블러가 제품의 질감을 만드는 기준 · Glassmorphism(https://glassmorphism.com) — 기법 소개 쇼케이스
**DNA**: type3 space3 contrast3 border2 round5 shadow4 color4 deco4
**레시피**: type `Sans` / color `Gradient background` / layout `Floating panels` / border `1px white` / radius `16px` / spacing `Layered` / motion `Float`
**계보**: Related: fluent,material-you,frutiger,neumorph / Influenced By: skeuo,frutiger / Influenced: neumorph,material-you / Confused: neumorph / Opposite: brutal,editorial
**관찰**: 블러 뒤에 배경 색이 있어야 유리가 존재함 · 테두리 밝은 하이라이트가 두께를 만드는지 · 배경이 비치면서도 텍스트가 또렷한지
**키워드**: 유리, 블러, 반투명, 투명, 글래스, frost, 유리모피즘, 포스트잇

**구현 스펙**(목업 실측):
- **배경 그라데이션이 먼저다** — 유리는 비칠 것이 있어야 존재한다. 다색 선형 그라데이션을 깐다: `linear-gradient(120deg,#FFD3C2,#FFB59A 40%,#B7A6FF 75%,#8FD6FF)` — 웜에서 쿨로 넘어가는 4스톱. 단색 배경 위 글래스는 그냥 반투명 상자다
- **유리 패널 공식** — `background:rgba(255,255,255,.42)` + `border:1px solid rgba(255,255,255,.6)` + `backdrop-filter:blur(14px)` + `box-shadow:0 12px 40px rgba(0,0,0,.14)`. **네 가지가 전부 있어야 유리가 된다**
- **보더는 배경보다 밝아야 한다** — 면 `.42` < 보더 `.6`. 이 밝기 차가 유리의 "두께(모서리에 걸린 빛)"를 만든다. 같은 값이면 두께가 사라진다
- **투명도 3단** — 주 패널 `.42` / 보조 칩 `.35` / 장식 도형 `.55`. 겹칠수록 불투명해지는 관계를 유지한다
- **그림자도 2단** — 큰 패널 `0 12px 40px rgba(0,0,0,.14)`, 작은 요소 `0 4px 14px rgba(0,0,0,.12)`. 유리는 떠 있으므로 그림자가 멀고 넓게 퍼진다
- **텍스트는 어두운 잉크로** — 밝은 유리 위에 `#241a35` 계열. 흰 텍스트를 얹으면 대비가 무너진다(`references/a11y.md`)
- **radius 12–18px** — 패널 크기별로 다르게(큰 패널 18px, 칩 8–12px)
- `-webkit-backdrop-filter`를 함께 선언한다. 미지원 브라우저 폴백으로 불투명 배경을 준비한다

### 13. Neumorphism 뉴모피즘 — `neumorph` ⭐ 메인 레퍼런스
**태그라인**: 같은 톤의 그림자로 만드는 "눌러진 소프트웨어". **정의**: 배경색과 동일한 색의 표면을 두 방향 그림자로 양각·음각 처리하는 스타일. 부드럽고 촉감 있는 인터페이스. **특징**: Soft Dual Shadows, Same-tone Surface, Inset & Extruded, Tactile
**사례**: neumorphism.io(https://neumorphism.io) — 그림자 파라미터를 직접 조절하는 생성기 · Hype4 Neumorphism(https://hype4.academy/articles/design/neumorphism-in-user-interfaces) — "뉴모피즘"을 명명한 미하우 말레비치의 원문, 접근성 한계까지 짚음
**DNA**: type3 space4 contrast2 border0 round4 shadow5 color2 deco3
**레시피**: type `Sans · soft` / color `Same-tone gray` / layout `Pressed panels` / border `None` / radius `16px` / spacing `Even` / motion `Soft`
**계보**: Related: glass,clay,skeuo / Influenced By: skeuo,glass / Confused: glass / Opposite: brutal
**관찰**: 같은 톤 양각·음각 그림자의 질감 · 버튼이 눌린 듯 들어가는지 · 낮은 대비가 접근성을 어떻게 훼손하는지(구조적 약점) · "빛"이 아니라 "촉감"인 질감
**키워드**: 뉴모피즘, 소프트, 음각, 양각, 질감, 촉감

**구현 스펙**(목업 실측):
- **배경과 표면이 같은 색이어야 한다** — 단일 톤(예 `#E2E4EC`, 살짝 쿨한 라이트 그레이). 표면에 다른 색을 주는 순간 뉴모피즘이 아니다. **순백(#fff)이나 순검정은 쓸 수 없다** — 그림자 두 방향 중 하나가 안 보인다
- **양각(볼록)** — `box-shadow:-6px -6px 14px rgba(255,255,255,.75), 6px 6px 14px rgba(0,0,0,.13)`. 좌상단 흰 하이라이트 + 우하단 검은 그림자, **오프셋이 정확히 대칭**
- **음각(오목)** — 같은 공식에 `inset`을 붙이고 방향을 뒤집는다: `inset 4px 4px 10px rgba(0,0,0,.09), inset -4px -4px 10px rgba(255,255,255,.7)`
- **빛의 방향은 페이지 전체에서 하나** — 좌상단 고정. 컴포넌트마다 방향이 다르면 즉시 가짜로 보인다
- **작은 요소는 오프셋·블러를 비례 축소** — 큰 카드 `6px/14px`, 작은 버튼 `4px/10px`, 아주 작은 것 `4px/8px`
- **보더 0 · radius 14–16px** — 경계는 오직 그림자로 만든다
- **접근성 경고**: 이 스타일은 구조적으로 저대비다. 텍스트(`#3E4450`)와 보조 텍스트(`#5B6270`)는 반드시 4.5:1을 실측하고, **버튼의 "눌림" 상태를 그림자에만 의존하지 않는다**(색·라벨 변화를 병행 — `references/a11y.md`)

### 14. Claymorphism 클레이모피즘 — `clay` ⭐ 메인 레퍼런스
**태그라인**: 찰흙처럼 부드럽고 둥글고 통통한 디자인. **정의**: 연한 파스텔 배경 위에 크고 둥근 도형을 배치하고 하단에 그림자를 넣어 토기처럼 보이게 하는 스타일. **특징**: Rounded Blobs, Pastel Colors, Bottom Shadow, 3D-ish Depth
**사례**: Claymorphism Generator(https://hype4.academy/tools/claymorphism-generator) — "클레이모피즘"을 명명한 곳의 생성기 · Figma Community(https://www.figma.com) — 클레이 UI 키트가 유통되는 주요 플랫폼
**DNA**: type3 space3 contrast3 border1 round5 shadow4 color4 deco4
**레시피**: type `Sans · rounded` / color `Pastel lilac` / layout `Puffy blocks` / border `None` / radius `26px` / spacing `Padded` / motion `Squish`
**계보**: Related: neumorph,glass,corp-memphis / Influenced By: glass,neumorph / Confused: neumorph,glass / Opposite: brutal
**관찰**: 파스텔 배경 위 도형이 토기처럼 "앉아 있는지" · 그림자가 아래쪽에만 있는지 · 둥근 모서리·통통한 비율 · 호버 시 눌리는 피드백 · 색이 밝을수록 찰흙의 질감이 살아난다
**키워드**: 클레이, 찰흙, 파스텔, 둥근, 통통, pastel, 부드러운

**구현 스펙**(목업 실측):
- **3중 그림자가 클레이의 공식이다** — `box-shadow: inset 0 -6px 12px rgba(<어두운 톤>,.26), inset 0 6px 12px rgba(255,255,255,.9), 0 10px 22px rgba(<어두운 톤>,.20)`
  - ① `inset 0 6px` 위쪽 흰 하이라이트 = 빛 받는 윗면
  - ② `inset 0 -6px` 아래쪽 색 그림자 = 두께
  - ③ 바깥 `0 10px 22px` = 바닥에 앉은 그림자
  - **세로 방향(0 ±6px)만 쓴다** — 뉴모피즘의 대각선 대칭과 갈리는 결정적 지점
- **바깥 그림자는 아래로만** — `0 10px 22px`. x 오프셋 0. 옆이나 위로 퍼지면 떠 있는 것처럼 보여 "앉은 토기"가 안 된다
- **그림자 색이 중성 회색이 아니라 표면색의 어두운 버전** — 라일락 표면이면 `rgba(160,140,220,…)`, 코랄 표면이면 `rgba(200,120,100,…)`. 회색 그림자를 쓰면 즉시 플라스틱처럼 보인다
- **radius를 극단으로** — 카드 `26px`, 칩·버튼은 알약(`999px`). round5는 이 스타일의 정체성이라 타협하지 않는다
- **파스텔 배경 + 한 톤 밝은 표면** — 배경 `#EDE7FB` → 표면 `#F7F3FF`. 뉴모피즘과 달리 **같은 톤이되 명도는 한 단 차이**를 준다
- **액센트는 보색 파스텔 1개** — 라일락 계열 화면에 코랄(`#FFB4A2`) 하나. 텍스트는 그 색의 어두운 버전(`#57291F`)
- **호버는 눌림** — `motion: Squish`. 바깥 그림자를 `0 10px 22px` → `0 4px 10px`로 줄이고 `translateY(3px)`

### 15. Skeuomorphism 스큐어모피즘 — `skeuo`
**태그라인**: 실제 세계의 재질과 빛을 화면에 그대로 재현. **정의**: 가죽·종이·금속처럼 실세계 질감을 화면에 구현하는 디자인. 익숙한 사물의 형상을 빌려 직관적으로 사용법을 알려준다. **특징**: Realism, Texture, Light & Shadow, Affordance
**사례**: Native Instruments(https://www.native-instruments.com) — 악기 UI가 실물 장비의 질감·조작감을 재현 · Awwwards(https://www.awwwards.com) — 스큐어모피즘의 현대적 부활 사례
**DNA**: type3 space3 contrast2 border2 round3 shadow4 color3 deco5
**레시피**: type `Serif · shadowed` / color `Leather & brass` / layout `Panelled` / border `Beveled 1px` / radius `10px` / spacing `Tight` / motion `Press`
**계보**: Related: frutiger,neumorph,y2k / Influenced: neumorph,material,glass,frutiger / Confused: y2k,frutiger
**관찰**: 실제 사물 질감(가죽·종이·금속)의 재현 · 재질이 "무엇을 하는 물건인지" 즉시 알려주는지(iOS 7 이후 유행이 꺾였지만 지금도 효과적일 때가 있음) · 빛·그림자 방향이 실제 세계와 일치하는지
**키워드**: 스큐어, 질감, 재질, 가죽, 실사, 리얼, 책상

### 16. Frutiger Aero 프루티거 에어로 — `frutiger`
**태그라인**: 2000년대의 유리 같은 미래. 반짝임과 물결로 가득한 인터넷. **정의**: 2004~2013년 Windows·애플 제품군에 퍼졌던 미래지향 스타일. 반투명 유리, 물결, 잎사귀, 과장된 광택과 채도 높은 청록색. **특징**: Gloss & Shine, Aqua & Transparency, Bubbles, Optimistic Future
**사례**: r/FrutigerAero(https://www.reddit.com/r/FrutigerAero/) — 스타일을 보존·전파하는 커뮤니티 아카이브 · Wayback Machine(https://web.archive.org) — 윈도우 비스타·7 시절 UI를 직접 확인
**DNA**: type3 space3 contrast3 border2 round5 shadow4 color5 deco5
**레시피**: type `Sans · humanist` / color `Aqua gradient` / layout `Glossy panels` / border `1px white` / radius `14px` / spacing `Rounded` / motion `Shine`
**계보**: Related: y2k,glass,skeuo / Influenced By: skeuo / Influenced: glass,y2k / Confused: y2k / Opposite: brutal
**관찰**: 반투명 유리+물결·잎사귀 모티프 · 광택 하이라이트가 "미래"를 표현하는지 · 청록·하늘색의 채도 · 과장된 3D 아이콘·버튼(요즘은 노스탤지어로 재소비됨)
**키워드**: 프루티거, 2000년대, 윈도우비스타, 반짝, 글래스, 노스탤지어, aqua
