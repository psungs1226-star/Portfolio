# 모션 챕터 데모 — 구현 예제

`references/motion.md`에 정의된 duration·easing 토큰, 패턴 9종, 4-gate 필터, 슬롭 시그니처의 **실제 구현 코드**. 원본은 브라우저에서 Bad/Good을 토글하며 눈으로 비교하는 인터랙티브 페이지였고, 여기서는 그 두 상태의 코드를 나란히 놓는다 — 이론(motion.md)이 "무엇을 왜"라면 이 파일은 "그래서 CSS로 어떻게"다.

읽는 순서: motion.md의 해당 절을 먼저 읽고, 구현이 막힐 때 여기서 같은 번호를 찾는다.

## 공통 토큰

데모 전체가 쓰는 토큰. 값은 motion.md §3.1–3.2와 동일하다.

```css
:root{
  --dur-short1:50ms;      --dur-short2:100ms;      --dur-short3:150ms;      --dur-short4:200ms;
  --dur-medium1:250ms;    --dur-medium2:300ms;     --dur-medium3:350ms;     --dur-medium4:400ms;
  --dur-long1:450ms;      --dur-long2:500ms;       --dur-long3:550ms;       --dur-long4:600ms;
  --dur-extralong1:700ms; --dur-extralong2:800ms;  --dur-extralong3:900ms;  --dur-extralong4:1000ms;

  --ease-standard:          cubic-bezier(0.2,0,0,1);
  --ease-standard-decel:    cubic-bezier(0,0,0,1);
  --ease-standard-accel:    cubic-bezier(0.3,0,1,1);
  --ease-emphasized-decel:  cubic-bezier(0.05,0.7,0.1,1);
  --ease-emphasized-accel:  cubic-bezier(0.3,0,0.8,0.15);

  --lift:-4px; --nudge:-2px;
}
```

페이지 자신도 게이트를 지킨다 — 데모 페이지 전역에 걸린 reduced-motion 처리:

```css
@media (prefers-reduced-motion: reduce){
  *, *::before, *::after{
    animation-duration:0.01ms !important;
    animation-iteration-count:1 !important;
    transition-duration:0.01ms !important;
    scroll-behavior:auto !important;
  }
}
```

---

## 1. 이징 곡선 (motion.md §3.2)

원본은 곡선을 고르면 그래프와 동일한 커브로 공이 움직이는 시각화였다 — 그래프의 기울기가 급한 구간일수록 실제로도 빠르게 지나간다. 곡선 5종과 용도:

| 토큰 | cubic-bezier | 용도 |
|---|---|---|
| `standard` | `0.2, 0, 0, 1` | 화면 내 이동·변형 기본값 |
| `standard-decel` | `0, 0, 0, 1` | 등장(entrance) |
| `standard-accel` | `0.3, 0, 1, 1` | 퇴장(exit) |
| `emphasized-decel` | `0.05, 0.7, 0.1, 1` | 강조 등장 |
| `emphasized-accel` | `0.3, 0, 0.8, 0.15` | 강조 퇴장 |

곡선을 직접 비교하려면 같은 거리·같은 duration으로 재생해 차이를 본다:

```js
ball.style.transition = 'none';
ball.style.left = '8px';
void ball.offsetWidth;                      // reflow 강제 — 없으면 초기값이 반영되지 않는다
ball.style.transition = `left 900ms cubic-bezier(${curve.join(',')})`;
ball.style.left = (8 + laneWidth) + 'px';
```

## 2. Duration 16단계 (motion.md §3.1)

원본은 슬라이더로 16단계를 옮겨가며 같은 이동 거리를 재생해 체감 속도를 비교했다.

| 계층 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| `short` | 50ms | 100ms | 150ms | 200ms |
| `medium` | 250ms | 300ms | 350ms | 400ms |
| `long` | 450ms | 500ms | 550ms | 600ms |
| `extra-long` | 700ms | 800ms | 900ms | 1000ms |

체감 기준선: `short2`(100ms)는 "즉각", `medium2`(300ms)는 "움직임이 보임", `extralong2`(800ms)는 "느리다"로 넘어간다(§1.1 지각 임계값).

---

## 3. 패턴 카탈로그 9종 (motion.md 4절)

각 패턴은 motion.md의 Bad(wrong)/Good 서술을 실제 CSS로 옮긴 것이다. Bad(generic)은 코드가 아니라 "전면 적용" 자체가 문제라 5절에서 다룬다.

### 4.1 Fade — opacity 단독 vs opacity+translate

```css
/* Bad: 800ms linear — 느리고 방향성 없음 */
.box{ opacity:0 }
.show .box{ opacity:1; transition:opacity var(--dur-extralong2) linear }

/* Good: 250ms decelerate + 8px 상승 */
.box{ opacity:0; transform:translateY(8px) }
.show .box{
  opacity:1; transform:translateY(0);
  transition:opacity var(--dur-medium1) var(--ease-standard-decel),
             transform var(--dur-medium1) var(--ease-standard-decel);
}
```

툴팁은 translate 없이 opacity만 쓴다 — 위치가 트리거에 고정돼 있어 이동이 오히려 방해가 된다.

### 4.2 Slide — 트리거 위치에 앵커된 방향

```css
/* 트리거가 우측 상단에 있는 상황 */
/* Bad: 좌측에서 슬라이드 — 공간 논리 위반 */
.show .panel.bad{ left:8px; animation:slideFromLeft var(--dur-medium2) var(--ease-standard-decel) }
/* Good: 트리거와 같은 우측에서 */
.show .panel.good{ right:8px; animation:slideFromRight var(--dur-medium2) var(--ease-standard-decel) }

@keyframes slideFromLeft { from{ transform:translateX(-120%) } to{ transform:translateX(0) } }
@keyframes slideFromRight{ from{ transform:translateX( 120%) } to{ transform:translateX(0) } }
```

### 4.3 Scale — modal center vs popover origin

```css
.pop{ opacity:0; transform:scale(.6) }         /* scale(0)이 아니라 0.6에서 시작 (§3.4) */
.show .pop{ opacity:1; transform:scale(1) }

/* Bad: 트리거가 우하단인데 화면 중앙에서 확대 */
.show .pop.bad{
  top:50%; left:50%; margin:-28px 0 0 -44px;
  transform-origin:center;
  transition:opacity var(--dur-short4) var(--ease-standard-decel),
             transform var(--dur-short4) var(--ease-standard-decel);
}
/* Good: 트리거에 앵커 */
.show .pop.good{
  bottom:44px; right:10px;
  transform-origin:bottom right;
  transition:opacity var(--dur-short4) var(--ease-standard-decel),
             transform var(--dur-short4) var(--ease-standard-decel);
}
```

모달은 `transform-origin: center`가 맞고, dropdown/popover는 트리거 방향 앵커가 맞다 — 둘을 같은 값으로 통일하는 것이 Bad(generic)이다.

### 4.4 Collapse/Expand — `height:auto` 문제와 대안

```css
/* Bad: height:auto는 애니메이션되지 않아 순간 팝(jump) */
.acc-body.bad{ display:block; height:0; overflow:hidden }
.show .acc-body.bad{ height:auto }

/* Good: grid-template-rows 0fr → 1fr (높이 자동 대응) */
.acc-body.good{
  display:grid; grid-template-rows:0fr;
  transition:grid-template-rows var(--dur-medium2) var(--ease-standard);
}
.acc-body.good > div{ overflow:hidden }        /* 자식의 overflow:hidden이 없으면 0fr에서도 내용이 삐져나온다 */
.show .acc-body.good{ grid-template-rows:1fr }
```

### 4.5 Stagger — delay 간격과 최대 개수

```css
.si{ opacity:0; transform:translateY(6px) }
.show .si{ animation:siIn var(--dur-short3) var(--ease-standard-decel) forwards }
@keyframes siIn{ to{ opacity:1; transform:translateY(0) } }
```

```js
// Bad: 8개 × 500ms → 마지막 항목이 3.5초 뒤에 등장
items = Array.from({length:8}, (_,i) => `<div class="si" style="animation-delay:${i*500}ms"></div>`)
// Good: 6개 × 80ms → 총 delay 400ms (§5.2 예산 상한에 정확히 도달)
items = Array.from({length:6}, (_,i) => `<div class="si" style="animation-delay:${i*80}ms"></div>`)
```

7번째부터는 개별 delay를 주지 않고 배치로 동시 등장시킨다.

### 4.6 Morph/Shared-element — container transform

```css
/* Bad: 원본이 그냥 사라지고 상세가 새로 페이드인 — "어디서 왔는지" 상실 */
.src.bad{ transition:opacity var(--dur-short4) var(--ease-standard-accel) }
.show .src.bad{ opacity:0 }
```

Good은 FLIP으로 구현한다 — 최종 지오메트리를 먼저 적용하고 `transform`으로만 되감아 재생하므로 layout property를 애니메이션하지 않는다(§6.3 transform+opacity only):

```js
el.style.transition = 'none';
el.style.transform  = '';
const first = el.getBoundingClientRect();     // 이동 전 위치
stage.classList.add('show');                  // 최종 레이아웃 적용
const last = el.getBoundingClientRect();      // 이동 후 위치

el.style.transformOrigin = 'top left';
el.style.transform = `translate(${first.left-last.left}px, ${first.top-last.top}px)
                      scale(${first.width/last.width}, ${first.height/last.height})`;
void el.offsetWidth;                          // reflow
el.style.transition = 'transform var(--dur-medium3) var(--ease-emphasized-decel)';
el.style.transform  = '';                     // 최종 상태로 되돌리며 재생
```

### 4.7 Press feedback — `scale(.97)` 100–150ms

```css
/* Bad: 피드백 없음 — 클릭이 등록됐는지 불확실 */
.card.bad{ transition:none }

/* Good */
.card.good{ transition:transform var(--dur-short2) var(--ease-standard) }
.card.good:active{ transform:scale(.97) }
```

텍스트 링크에는 scale을 걸지 않는다(글자가 흐려 보인다) — color/underline 전환으로 대체한다. 100+/일 액션은 모션 자체를 생략한다.

### 4.8 Scroll-reveal — 슬롭의 진원지

```css
.sec{ opacity:0 }
@keyframes secIn{ to{ opacity:1 } }
```

```html
<!-- Bad: 모든 섹션에 진입 애니메이션 + 인덱스 기반 delay -->
<div class="sec bad" style="--i:0"></div> … <div class="sec bad" style="--i:3"></div>
<!-- Good: 한 섹션만 애니메이션, 나머지는 즉시 노출 -->
<div class="sec good only-one"></div>
<div class="sec good static"></div> <div class="sec good static"></div> <div class="sec good static"></div>
```

```css
.show .sec.bad{ animation:secIn var(--dur-medium1) var(--ease-standard-decel) forwards;
                animation-delay:calc(var(--i,0) * 60ms) }
.show .sec.good.only-one{ animation:secIn var(--dur-medium1) var(--ease-standard-decel) forwards }
.show .sec.good.static{ opacity:1 }
```

실제 페이지에서는 CSS 초기값을 **보이는 상태**로 두고 JS가 있을 때만 `opacity:0` 클래스를 붙인다 — JS 로드 실패 시 콘텐츠가 영구히 숨겨지는 사고를 막는다.

### 4.9 패럴랙스 / Scroll-jacking — 원칙적 금지

```css
/* Bad: 배경 무한 루프 — SLOP-AMBIENT-LOOP */
.show .bg.bad{ animation:pxMove 1.2s linear infinite alternate }
@keyframes pxMove{ from{ transform:translateY(0) } to{ transform:translateY(-24px) } }

/* Good: 정적 배경 */
.bg.good{ inset:0 }
```

---

## 4. 4-gate 필터 워크스루 (motion.md §6.4)

원본은 게이트를 하나씩 통과시키는 위저드였다. 검토 대상: **"카드 hover 시 그림자 확대 + 3D 기울임(perspective tilt)"**

| Gate | 질문 | 판정 |
|---|---|---|
| 1 · FREQUENCY | 이 카드 그리드는 얼마나 자주 hover되는가? | 반복 노출은 잦지만 hover는 사용자의 의도적 동작 → **통과** |
| 2 · PURPOSE | 상태 변화·공간 관계·주의 유도 중 무엇을 전달하는가? | 그림자 확대는 "클릭 가능함"을 전달하지만, **3D 기울임은 아무 정보도 전달하지 않는 순수 장식** → **탈락** |
| 3 · SPEED | §3 토큰표에서 맞는 duration·easing을 찾을 수 있는가? | (Gate 2를 통과했다면) hover는 `short3` · `standard` |
| 4 · FUNCTION | `prefers-reduced-motion` · hover capability · 60fps를 지키는가? | 지키면 최종 승인 |

**결과 — Gate 2 탈락, SLOP 판정.** 재설계안: 그림자 확대(정보 전달)는 유지하고 3D 기울임(순수 장식)만 제거한다. 남은 hover 모션은 `short3`(150ms) · `--ease-standard`로 구현한다.

탈락은 그 자리에서 멈추고 탈락 지점을 명시한다 — Gate 2에서 떨어진 것을 Gate 3·4까지 끌고 가 "속도만 조정"하는 식으로 통과시키지 않는다.

## 5. 슬롭 시그니처 비교 (motion.md §5.1)

같은 미니 랜딩페이지(히어로 + 카드 3개 + CTA)를 두 버전으로 만든 비교. 슬롭 버전은 `SLOP-FADE-UP-ALL` + `SLOP-HOVER-LIFT-ALL` + `SLOP-AMBIENT-LOOP` 세 개를 동시에 적용한다.

```css
/* ── 슬롭 버전 ── */
/* SLOP-AMBIENT-LOOP: 배경 blob 무한 루프 */
.slop-mode .blob{ animation:blobFloat 3s ease-in-out infinite alternate }
@keyframes blobFloat{ from{ transform:translate(0,0) } to{ transform:translate(-16px,20px) } }

/* SLOP-FADE-UP-ALL: 히어로와 모든 카드가 fade-up */
.slop-mode .m-hero,
.slop-mode .m-card{ opacity:0; animation:mIn var(--dur-medium2) var(--ease-standard-decel) forwards }
.slop-mode .m-card:nth-child(1){ animation-delay: 80ms }
.slop-mode .m-card:nth-child(2){ animation-delay:160ms }
.slop-mode .m-card:nth-child(3){ animation-delay:240ms }
@keyframes mIn{ from{ opacity:0; transform:translateY(20px) } to{ opacity:1; transform:translateY(0) } }

/* SLOP-HOVER-LIFT-ALL: 클릭 대상이 아닌 카드에도 hover lift */
.slop-mode .m-card{ transition:transform var(--dur-short3) var(--ease-standard) }
.slop-mode .m-card:hover{ transform:translateY(-4px) }

/* ── 절제 버전 ── */
/* 섹션·카드는 모션 없이 즉시 노출. 움직이는 것은 실제 클릭 대상인 CTA 하나뿐 */
.slop:not(.slop-mode) .m-cta{ transition:transform var(--dur-short2) var(--ease-standard) }
.slop:not(.slop-mode) .m-cta:hover{ transform:translateY(-2px) }
```

- 슬롭 버전: 세 시그니처가 전부 적용돼 **아무것도 강조되지 않는다** — 모든 것이 움직이면 위계가 사라진다.
- 절제 버전: 섹션은 즉시 노출되고 signature motion은 CTA hover 하나뿐 — 나머지는 조용하다. 다만 "조용하게"가 "아예 없앤다"는 아니다(§5.3). 실제로 상호작용 가능한 요소의 hover/focus/press 피드백은 signature 예산과 별개로 남긴다.

---

이 파일은 **사람용 학습 자료**다. 에이전트가 구현 중 막혔을 때 참조할 수는 있지만, 이론과 판정 기준은 `references/motion.md`가 원본이다 — 두 파일이 어긋나면 motion.md를 따른다.
