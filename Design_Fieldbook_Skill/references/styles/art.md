# 스타일 상세 — Art (2)

`references/styles.md` 인덱스의 Art 카테고리 상세. **Memphis가 메인 레퍼런스다.**

**DNA 8축 순서**: type · space · contrast · border · round · shadow · color · deco (각 0–5)
**계보의 태그가 다른 카테고리를 가리킬 수 있다** — 태그→카테고리 매핑은 `references/styles.md` 인덱스의 "태그 → 카테고리" 표를 본다.

**구현 스펙의 색은 팔레트가 아니라 색 관계다** — 아래 hex는 Fieldbook 목업 실측값이다. 그대로 복사하면 결과물이 전부 같은 색이 된다. 가져갈 것은 관계(색을 몇 개 쓰고 어떻게 분배하는가, 보더·그림자의 비율)이고, 실제 색은 프로젝트 브랜드에 맞게 정한 뒤 그 관계를 재현한다.

⚠️ 이 카테고리에서 **Bauhaus(17) · Swiss Style(18) · De Stijl(20) · Constructivism(22)은 금지**되어 상세를 삭제했다 — 순수주의 기하학 4종. 번호는 Fieldbook 원본 순서라 비어 있다. 금지 사유와 대체 스타일은 `references/styles.md`의 "금지 스타일" 절을 본다.

---

### 19. Memphis 멤피스 — `memphis` ⭐ 메인 레퍼런스
**태그라인**: 1980년대의 대담한 패턴과 파스텔, 그리고 장난기. **정의**: 1981년 밀라노에서 에토레 소트사스가 시작한 디자인 그룹. 격자무늬, 파스텔, 기하학적 모양으로 지루함을 깨부쉈다. **특징**: Bold Patterns, Pastel Colors, Geometric Shapes, Playful
**사례**: Memphis Milano(https://memphismilano.com) — 멤피스 그룹의 공식 브랜드 아카이브 · Vogue(https://www.vogue.com) — 멤피스 복고 유행을 다룬 패션 매거진
**DNA**: type3 space3 contrast3 border1 round2 shadow1 color5 deco5
**레시피**: type `Rounded sans` / color `Pastel + primary` / layout `Pattern-heavy` / border `2px black` / radius `12px` / spacing `Bouncy` / motion `Wiggle`
**계보**: Related: corp-memphis,acid / Influenced: corp-memphis,acid / Confused: corp-memphis
**관찰**: 패턴이 배경이 아니라 주인공인지 · 파스텔+원색 조합 · 혼돈 속 반복되는 리듬 · 기하학적 모양의 장난기
**키워드**: 멤피스, 패턴, 파스텔, 1980, 장난, geometric, 장식

**구현 스펙**(목업 실측):
- **색을 4–5개 쓴다** — 웜 크림 배경(`#FFE8D6`) 위에 코랄(`#FF6B5E`) · 옐로(`#FFC94D`) · 민트(`#4EC5A6`) · 바이올렛(`#7A6CFF`). **액센트 1개 원칙의 명시적 예외** — 색이 많은 것이 이 스타일의 정의다. 대신 각 색은 서로 다른 요소(도형/카드/텍스트 강조)에 배정해 역할을 나눈다
- **하드 오프셋 섀도, 단 neobrutal보다 작게** — `box-shadow:3px 3px 0 #2B2B2B`(큰 요소) / `2px 2px 0 #2B2B2B`(작은 요소). blur 0
- **잉크는 순검정이 아닌 차콜 `#2B2B2B`** — 보더·그림자·텍스트에 같은 값을 반복
- **보더 2–2.5px** — neobrutal(2.5px 일괄)과 달리 요소 크기에 따라 2px/2.5px를 섞는다
- **radius를 요소마다 다르게** — `6px`·`8px`·`10px`·`12px`·`16px`·`999px`(알약)·`50%`(원)이 한 화면에 공존한다. **일관된 radius가 없는 것이 일관성**이다. 이 점이 neobrutal(12px 통일)과 갈리는 지점
- **기하 도형이 콘텐츠와 무관하게 배치된다** — 원·지그재그·삼각형이 배경이 아니라 레이어 위에 얹힌다(deco5). 도형은 장식이 아니라 구성 요소다
- **모션은 회전/기울임** — `motion: Wiggle`. hover에 `rotate(-2deg)` 같은 미세 회전. 단 `references/motion.md` §5.2 예산 안에서, signature 1개로만

### 21. Art Deco 아르데코 — `artdeco`
**태그라인**: 금빛의 기하학. 1920~30년대의 번영과 장식. **정의**: 1920~30년대 유행한 장식 예술 운동. 대칭, 기하학적 패턴, 금색, 호화로운 소재로 번영의 시대를 표현. **특징**: Geometry & Symmetry, Gold & Black, Ornament, Glamour
**사례**: The Met(https://www.metmuseum.org) — 아르데코 디자인을 대량 소장한 뉴욕 메트로폴리탄 · NYPL(https://www.nypl.org) — 아르데코 양식 슈바르츠만 빌딩의 브랜딩
**DNA**: type4 space3 contrast3 border3 round0 shadow0 color3 deco5
**레시피**: type `Serif · caps` / color `Black & gold` / layout `Symmetric` / border `Gold 1px` / radius `0` / spacing `Formal` / motion `Slow fade`
**계보**: Related: luxury,retro / Influenced: luxury / Confused: luxury / Opposite: brutal
**관찰**: 대칭이 과하지 않게 유지되는 균형 · 금색이 배경 아닌 포인트로 쓰이는지 · 기하학적 패턴(부채꼴 등) · 어두운 배경과 금색의 대비
**키워드**: 아르데코, 금색, 대칭, 1920, 고전, 장식, 기하
