# 스타일 상세 — Brutal (2) ⭐ 메인 레퍼런스 카테고리

`references/styles.md` 인덱스의 Brutal 카테고리 상세. **이 카테고리 2종은 전부 메인 레퍼런스다.**

**DNA 8축 순서**: type · space · contrast · border · round · shadow · color · deco (각 0–5)
**계보의 태그가 다른 카테고리를 가리킬 수 있다** — 태그→카테고리 매핑은 `references/styles.md` 인덱스의 "태그 → 카테고리" 표를 본다. 계보에 `swiss`·`bauhaus`·`construct`·`minimal` 등이 나오면 **금지 스타일**이다 — 영향 관계를 이해하는 데만 쓰고 채택 후보로 삼지 않는다.

**구현 스펙의 색은 팔레트가 아니라 색 관계다** — 아래 hex는 Fieldbook 목업 실측값이다. 그대로 복사하면 결과물이 전부 같은 색이 된다. 가져갈 것은 관계(보더 두께와 그림자 오프셋의 비율, 액센트가 몇 개이고 어디에 반복되는가)이고, 실제 색은 프로젝트 브랜드에 맞게 정한 뒤 그 관계를 재현한다.

---

### 10. Brutalism 브루탈리즘 — `brutal` ⭐ 메인 레퍼런스
**태그라인**: 원시적 웹. 장식을 거부하는 과감한 타이포와 구조. **정의**: 장식과 디테일을 과감히 제거하고 큰 타이포그래피와 날것 그대로의 구조를 드러내는 스타일. 1990년대 웹의 성격을 반영. **특징**: Bold Typography, Raw Layout, High Contrast, Minimal Decoration
**사례**: Brutalist Websites(https://brutalistwebsites.com) — 브루탈리즘 사이트 아카이브이자 그 자체가 사례 · HTML Energy(https://html.energy) — 원시 HTML 미학을 실험하는 커뮤니티
**DNA**: type5 space2 contrast5 border4 round0 shadow0 color4 deco2
**레시피**: type `Display · bold` / color `Yellow on black` / layout `Asymmetric` / border `Hard 3px` / radius `0` / spacing `Compressed` / motion `Instant`
**계보**: Related: neobrutal / Influenced: neobrutal / Confused: neobrutal / Opposite: luxury,glass
**관찰**: 타이포가 장식이 아니라 구조 그 자체인지 · 원색·고대비가 터지는 위치 · 계산된 비대칭 · 장식·그림자의 부재
**키워드**: 거친, 원시, 강렬, 과감, 원색, 레트로웹, raw, bold, 웹, 날것

**구현 스펙**(목업 실측):
- **색은 3개로 끝낸다** — 검정(`#000`) · 흰색(`#fff`) · 형광 원색 1개(예 `#F6EF43` 산성 노랑). 네 번째 색이 들어가는 순간 브루탈리즘이 아니다
- **radius 0 · shadow 0** — 부드러움을 만드는 두 장치를 모두 제거한다. 깊이는 오직 보더와 색면으로
- **보더가 유일한 구조 장치** — `border:3px solid <액센트>`. 보더 색이 배경색이 아니라 **액센트색**인 것이 핵심(검정 보더는 평범해 보인다)
- **타이포가 면적을 차지한다** — 헤드라인이 컨테이너 폭을 거의 다 쓰고, 자간을 좁히고(`letter-spacing:-.02em`) 행간을 1.0~1.1까지 조인다
- **여백을 압축한다**(space2) — 요소 간 간격이 좁아 화면이 빽빽해야 "날것"이 된다. 여백을 넓히면 금지 스타일인 `minimal` 쪽으로 흘러간다
- **모션 없음** — `motion: Instant`. 상태 변화는 색 반전으로만 표현한다

### 11. Neo-Brutalism 네오 브루탈리즘 — `neobrutal` ⭐ 메인 레퍼런스
**태그라인**: 브루탈리즘을 부드럽게, 밝게, 그리고 에너지 넘치게 재해석. **정의**: 원조 브루탈리즘의 거친 윤곽을 유지하되 밝은 색, 두꺼운 보더, 단단한 오프셋 섀도, 둥근 모서리를 더한 현대적 변형. **특징**: Thick Borders, Hard Offset Shadows, Bright Colors, Playful Energy
**사례**: Hack Club(https://hackclub.com) — 하드 섀도·두꺼운 보더를 온전히 즐기는 사이트 · Gumroad(https://gumroad.com) — 신브루탈리즘을 상업적 UI에 적용
**DNA**: type4 space3 contrast4 border5 round2 shadow5 color5 deco3
**레시피**: type `Sans · bold` / color `Bright palette` / layout `Stacked cards` / border `2.5px black` / radius `12px` / spacing `Playful` / motion `Bounce`
**계보**: Related: brutal,acid,corp-memphis / Influenced By: brutal / Influenced: corp-memphis / Confused: brutal / Opposite: glass,neumorph
**관찰**: 두꺼운 보더+오프셋 섀도의 일관성 · 섀도가 "벽돌처럼" 단단히 붙어 있는지 · 밝은 버튼색이 클릭 위치를 알리는지 · 장난기와 가독성의 균형
**키워드**: 거친, 밝은, 하드섀도, 보더, 장난, 신브루탈, playful, 두꺼운

**구현 스펙**(목업 실측):
- **하드 오프셋 섀도가 이 스타일의 전부다** — `box-shadow:4px 4px 0 #111`. **blur 0, spread 0, 색은 보더와 동일한 잉크색.** blur를 조금이라도 넣으면 즉시 평범한 카드가 된다
- **보더와 그림자를 한 쌍으로 묶는다** — `border:2.5px solid #111` + `box-shadow:4px 4px 0 #111`. 오프셋(4px)이 보더 두께(2.5px)보다 약간 커야 "떠 있는 판" 느낌이 난다
- **크림 배경 + 밝은 색면** — 배경은 순백이 아니라 크림(`#FFF7E0`), 그 위에 채도 높은 면들(`#FFD23F` 노랑 · `#FF5D5D` 코랄 · `#FFE08A` 연노랑)을 카드별로 다르게 깐다. **카드마다 색이 다른 것이 정상**이다(액센트 1개 원칙의 예외)
- **radius 8–12px** — 브루탈리즘(0)과 갈리는 지점. 완전 각지면 원조, 완전 둥글면 clay 쪽으로 넘어간다
- **잉크는 순검정이 아닌 `#111`** — 순검정은 딱딱하고, 보더·텍스트·그림자에 같은 `#111`을 반복해 통일감을 만든다
- **hover는 그림자 오프셋을 줄여 "눌리는" 것으로** — `4px 4px 0` → `2px 2px 0` + `translate(2px,2px)`. `motion: Bounce`의 실체가 이것이다
