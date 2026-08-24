# 스타일 상세 — Modern (6)

`references/styles.md` 인덱스의 Modern 카테고리 상세. 항목당 태그라인·정의·특징 / 사례(URL+"왜 이 사례인가") / DNA 8축 / 계보 / 관찰 포인트 / 검색 키워드 / **레시피**(구현 7속성).

**DNA 8축 순서**: type · space · contrast · border · round · shadow · color · deco (각 0–5)
**계보의 태그가 다른 카테고리를 가리킬 수 있다** — 태그→카테고리 매핑은 `references/styles.md` 인덱스의 "태그 → 카테고리" 표를 본다. 계보에 `minimal`·`flat`·`corporate`·`swiss`·`bauhaus`·`destijl`·`construct`가 나오면 **금지 스타일**이다(인덱스 "금지 스타일" 절) — 영향 관계를 이해하는 데만 쓰고 채택 후보로 삼지 않는다.

**구현 스펙의 색은 팔레트가 아니라 색 관계다** — 아래 hex는 Fieldbook 목업 실측값이고, 그대로 복사하면 결과물이 전부 같은 색이 된다. 가져갈 것은 관계(배경과 표면을 몇 단 분리하는가, 그림자를 몇 겹 쌓는가, 액센트가 어디에 반복되는가)이고, 실제 색은 프로젝트 브랜드에 맞게 정한 뒤 그 관계를 재현한다.

⚠️ 이 카테고리에서 **Minimalism(1) · Corporate(5) · Flat Design(9)은 금지**되어 상세를 삭제했다. 번호는 Fieldbook 원본 순서라 비어 있다.

---

### 2. Material Design 머티리얼 디자인 — `material` ⭐ 메인 레퍼런스
**태그라인**: 종이와 잉크의 물리 법칙을 화면에 옮긴 구글의 디자인 언어. **정의**: 물리적 재료(종이)의 법칙을 디지털로 추상화한 시스템. 그림자로 깊이를, 리플로 터치 피드백을 표현한다. **특징**: Elevation & Shadow, Grid & Type Scale, Motion & Ripple, Material Metaphor
**사례**: material.io(https://material.io) — 구글 공식 디자인 언어 문서, 사양 원본 · Google(https://www.google.com) — 검색 카드·FAB·리플 피드백이 실제 작동하는 예
**DNA**: type4 space3 contrast3 border1 round3 shadow4 color4 deco2
**레시피**: type `Sans · Roboto` / color `Purple primary` / layout `App bar + cards` / border `None` / radius `8px` / spacing `Comfortable` / motion `Ripple`
**계보**: Related: material-you,fluent,neumorph / Influenced By: skeuo / Influenced: material-you / Confused: fluent / Opposite: brutal
**관찰**: 그림자 깊이(z-elevation)가 정보 층을 구분하는지 · FAB·카드·스낵바 등 정의된 컴포넌트 · 리플이 터치 위치에서 시작하는지 · 중립 위 포인트 색 구조 · 컴포넌트마다 정의된 상태(state)가 있다 — 기본·호버·눌림·비활성
**키워드**: 구글, 안드로이드, 카드, 그림자, 섀도, elevation, 구글디자인

**구현 스펙**(목업 실측):
- **배경과 표면을 분리한다** — 페이지 배경은 웜 뉴트럴, 카드/시트는 순백(`#fff`). 같은 색이면 elevation이 안 보인다. **구체적인 배경 hex를 여기 적지 않는 이유**: 과거 라운드(c/d/e)에서 매번 이 자리에 있던 예시 hex와 거의 동일한 베이지로 수렴하는 문제가 반복됐다 — 배경 hex는 매 프로젝트 브랜드에 맞게 새로 정하고, `verify.py`가 ① 배경/표면 델타 10 미만 ② 알려진 예시색과의 근접도를 기계적으로 잡는다
- **그림자는 두 겹이 기본** — 가까운 윤곽 그림자 + 퍼진 깊이 그림자를 겹친다: `box-shadow:0 1px 3px rgba(0,0,0,.14), 0 4px 12px rgba(0,0,0,.10)`. 앱바처럼 얕은 층은 한 겹(`0 2px 4px rgba(0,0,0,.2)`)
- **FAB 그림자에는 브랜드 색을 섞는다** — `0 3px 8px rgba(<primary>,.5)`. 중성 회색 그림자보다 "떠 있다"는 인상이 강하다
- **radius 8px 통일 · 보더 0** — 깊이를 오직 그림자로만 만든다. 보더를 더하면 Fluent 쪽으로 넘어간다
- **primary 1색이 앱바 배경 · FAB · CTA 텍스트 세 곳에 반복**된다. 텍스트 CTA는 대문자 + `letter-spacing:.06em`
- **잉크 2단** — 제목은 거의 검정(`#1c1b1f`), 본문은 한 단 흐린 중성(`#49454f`)

### 3. Material You 머티리얼 유 — `material-you` ⭐ 메인 레퍼런스
**태그라인**: 배경화면에서 색을 뽑아내는 개인화된 디자인 시스템. **정의**: Android 12부터의 Material 3. 월페이퍼에서 색을 추출해 사용자마다 다른 동적 테마를 만든다. **특징**: Dynamic Color, Expressive Shapes, Personalization, Adaptive
**사례**: Android(https://www.android.com) — 동적 색상 시스템이 실제 OS에 적용된 모습 · material.io(https://material.io) — M3 토큰·시스템 공식 스펙
**DNA**: type4 space4 contrast3 border1 round5 shadow3 color5 deco3
**레시피**: type `Sans · Roboto/Flex` / color `Seed → tonal palette` / layout `Rounded surfaces` / border `None` / radius `16–28px + pill` / spacing `Padded` / motion `Emphasized` `[MD3 기반 · Fieldbook 목업 없음]`
**계보**: Related: material,fluent,glass / Influenced By: material / Confused: glass
**관찰**: 배경화면 색이 토큰으로 번지는지 · 알약·둥근 형태의 전반 적용 · 기기마다 색이 달라지는지 · 다크 모드 대비 유지
**키워드**: 안드로이드, 동적색, 머티리얼3, 다이내믹, 개인화

**구현 스펙** `[MD3]`:
- **시드 1색 → tonal palette** — 브랜드 색 하나에서 tone 0/10/20/…/100의 명도 사다리를 만들고, 역할(primary/secondary/tertiary/neutral)에 tone을 배정한다. 라이트는 primary=tone40·on-primary=tone100·container=tone90, 다크는 primary=tone80·on-primary=tone20·container=tone30 — **라이트/다크에서 tone 배정이 뒤집힌다**
- **형태가 색만큼 표현력을 담당한다** — 컴포넌트별 shape scale: 칩·버튼은 알약(`999px`), 카드는 `16px`, 큰 표면은 `28px`. Material(전부 8px)과 갈리는 지점이 여기다
- **container 역할색을 적극 쓴다** — 배경 위에 `primary-container`(tone90) 면을 깔고 그 위에 `on-primary-container`(tone10) 텍스트. 액센트가 "버튼 하나"에 갇히지 않는 구조
- **그림자는 Material보다 얕게, 대신 색면으로 층을 만든다** — elevation을 그림자 대신 surface tint(표면에 primary를 몇 % 섞기)로 표현하는 것이 M3의 방식

### 4. Fluent Design 플루언트 디자인 — `fluent`
**태그라인**: 빛, 음영, 재질, 깊이로 디지털 세계를 물리적으로 느끼게 하는 마이크로소프트의 시스템. **정의**: 아크릴(Acrylic) 재질과 백페이드, 깊이 레이어로 화면을 투명한 재질로 만든다. **특징**: Acrylic Material, Depth & Layering, Light & Motion, Design Tokens
**사례**: Microsoft(https://www.microsoft.com) — Fluent 2 재질·타이포·컴포넌트가 적용된 메인 사이트 · Fluent 2(https://fluent2.microsoft.com) — 토큰 기반 공식 시스템 문서
**DNA**: type4 space3 contrast3 border1 round3 shadow3 color4 deco4
**레시피**: type `Sans · Segoe` / color `Translucent blue` / layout `Layered panels` / border `1px light` / radius `6px` / spacing `Compact` / motion `Reveal`
**계보**: Related: material,glass,frutiger / Influenced By: skeuo,material / Influenced: glass / Confused: material / Opposite: brutal
**관찰**: 아크릴 블러 뒤로 배경이 비치는지 · 빛의 방향이 깊이를 만드는지 · 호버 시 라이트 리빌 피드백 · 토큰 기반 재질의 일관성
**키워드**: 마이크로소프트, 아크릴, 블러, 윈도우, 재질

### 6. Luxury 럭셔리 — `luxury`
**태그라인**: 검은 화면 위의 금색 타이포. 접근성이 아니라 희소성을 말한다. **정의**: 고급 브랜드를 위한 디자인. 어두운 배경, 세리프, 넓은 자간, 금색 포인트로 희소성과 완성도를 표현한다. **특징**: Serif & Gold, Letter-spacing, Exclusivity, Restraint
**사례**: Cartier(https://www.cartier.com) — 아르데코 헤리티지를 잇는 금색·검정 브랜드 언어 · Rolex(https://www.rolex.com) — 검은 배경 위 정교한 금색 타이포·로고 질감
**DNA**: type4 space4 contrast3 border1 round1 shadow1 color2 deco3
**레시피**: type `Serif · tracked` / color `Black / gold` / layout `Centered` / border `1px gold` / radius `0` / spacing `Wide` / motion `Slow fade`
**계보**: Related: artdeco,editorial / Influenced By: artdeco / Opposite: brutal,acid
**관찰**: 자간(letter-spacing)의 넓이 · 금색이 포인트로 쓰이는 위치 · 세리프가 희소성을 만드는 방식 · 낮은 대비에서도 유지되는 고급스러움(단, 접근성은 별개 — `references/a11y.md`)
**키워드**: 럭셔리, 고급, 금색, 세리프, 명품, 브랜드, gold, 귀족

### 7. Editorial 에디토리얼 — `editorial`
**태그라인**: 잡지의 전통을 화면으로. 읽는 시간을 디자인한다. **정의**: 매거진·신문 레이아웃을 따르는 디자인. 세리프 헤드라인, 다단 구성, 드롭캡, 인용구로 긴 글을 읽기 좋게 만든다. **특징**: Serif Headline, Multi-column, Pull Quote, Long-form Reading
**사례**: The New York Times(https://www.nytimes.com) — 신문 전통을 디지털로 이행한 단·행간·타이포의 기준 · The Atlantic(https://www.theatlantic.com) — 읽는 시간 자체를 디자인 대상으로 삼음
**DNA**: type5 space4 contrast2 border0 round0 shadow0 color1 deco2
**레시피**: type `Serif` / color `Ink on paper` / layout `Multi-column` / border `Rules` / radius `0` / spacing `Columnar` / motion `Instant`
**계보**: Related: luxury / Opposite: cyberpunk
**관찰**: 헤드라인 세리프의 첫인상 · 단 폭(measure)·행간이 읽기 속도를 조절하는지 · 드롭캡·인용구 등 잡지 요소 · 글이 이어지는 리듬
**키워드**: 잡지, 매거진, 신문, 기사, 세리프, 독서, 에디토리얼, magazine, long-form

### 8. Corporate Memphis 코퍼레이트 멤피스 — `corp-memphis`
**태그라인**: 플랫 일러스트의 상징. 심플한 도형과 밝은 색의 팔이 긴 캐릭터. **정의**: 스타트업까지 널리 쓰인 플랫 일러스트 스타일. 단순 도형, 밝은 색, 팔다리가 길쭉한 캐릭터가 특징. **특징**: Flat Illustration, Simple Shapes, Bright Colors, Playful
**사례**: Duolingo(https://www.duolingo.com) — 캐릭터 기반 플랫 일러스트를 브랜드 전체에 적용 · Buck(https://buck.co) — 2017년 페이스북 일러스트 시스템 "Alegria"를 만든 스튜디오, 이 스타일의 출발점
**DNA**: type3 space3 contrast3 border0 round3 shadow1 color5 deco4
**레시피**: type `Rounded sans` / color `Bright flat` / layout `Illustration-led` / border `None` / radius `12px` / spacing `Open` / motion `Gentle` `[Fieldbook 목업 없음 — DNA에서 도출]`
**계보**: Related: memphis,acid,clay / Influenced By: memphis / Confused: memphis / Opposite: brutal,luxury
**관찰**: 단순 도형이 복잡한 의미를 압축하는지 · 캐릭터가 브랜드 감성을 담당하는지 · 밝은 원색의 지배 · 플랫한 스타일의 일관성
**키워드**: 일러스트, 캐릭터, 플랫, 스타트업, 일러, 그림, 팔

> **주의**: 이 스타일은 2017–2021년에 과포화되어 "스타트업 랜딩의 디폴트"로 소비됐다. 지금 쓰면 시대에 뒤처진 인상을 주기 쉬우니, 일러스트가 브랜드 자산으로 이미 존재할 때만 채택한다.
