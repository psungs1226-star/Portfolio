
(function(){try{var t=localStorage.getItem('dkm-theme');if(t){document.documentElement.setAttribute('data-theme',t);}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();


'use strict';

const ROADMAP = [
  { step:'01', name:'Design Principle', en:'디자인 원칙', chapter:'principles', desc:'모든 디자인의 바탕이 되는 기본 원칙. 이것 없이는 스타일도 레이아웃도 의미가 없다.', topics:['Visual Hierarchy','White Space','Contrast','Alignment','Balance','Proximity'] },
  { step:'02', name:'Layout', en:'레이아웃', chapter:'layouts', track:'ly', desc:'화면의 뼈대를 세운다. 콘텐츠를 어떤 질서로 배치할지 결정한다.', topics:['Grid','Bento','Masonry','Split Layout','Editorial Layout'] },
  { step:'03', name:'Visual Style', en:'비주얼 스타일', chapter:'styles', track:'st', desc:'겉옷을 입힌다. 같은 뼈대에 스타일에 따라 완전히 다른 분위기가 된다.', topics:['Brutalism','Neo Brutalism','Minimalism','Swiss Style','Glassmorphism','Bauhaus'] },
  { step:'04', name:'UI Pattern', en:'UI 패턴', chapter:'ui', desc:'사용자가 실제로 만지는 인터페이스. 내비게이션부터 피드백까지 표준 패턴을 익힌다.', topics:['Navbar','Card','Modal','Dashboard','Timeline'] },
  { step:'05', name:'Typography', en:'타이포그래피', chapter:'type', desc:'읽히는 디자인. 폰트 선택과 자간·행간이 메시지를 결정한다.', topics:['Serif','Sans Serif','Grotesk','Kerning','Tracking'] },
  { step:'06', name:'Design System', en:'디자인 시스템', chapter:'system', desc:'반복을 없앤다. 토큰과 컴포넌트로 일관성 있는 제품을 만든다.', topics:['Component','Token','Pattern Library'] },
];

const STYLES = [
{
  id:'minimal', name:'Minimalism', kr:'미니멀리즘', cat:'Modern',
  tagline:'필요한 것만 남기고, 나머지는 비운다.',
  def:'불필요한 장식을 제거하고 콘텐츠의 본질만 남기는 디자인. 여백과 타이포그래피가 장식의 자리를 대신한다. 여백이 곧 디자인이다.',
  feats:['White Space','Restraint','Focus','Function over Form'],
  examples:[
    {site:'Apple', url:'https://www.apple.com', why:'거대한 이미지와 텍스트만 남긴다. 기능이 곧 장식이 되는 대표 사례.'},
    {site:'Vitsœ', url:'https://www.vitsoe.com', why:'Dieter Rams의 원칙 "덜 하지만 더 좋게"를 웹으로 구현.'},
  ],
  points:['색을 모두 빼면 구조가 보인다 — 여백이 계층을 만든다.','장식이 많아질수록 콘텐츠의 힘은 약해진다.'],
  pv:`<div class="pv-label">minimal</div><div style="background:#FAFAF9;height:100%;padding:22px 24px;color:#1a1a1a;font-family:var(--sans)"><div style="display:flex;justify-content:space-between;font-size:10px;letter-spacing:.08em;color:#999;padding-bottom:14px;border-bottom:1px solid #eee"><span>ACME</span><span>MENU</span></div><div style="font-size:20px;font-weight:600;margin-top:24px;letter-spacing:-.02em;line-height:1.2">Design with<br>nothing more.</div><p style="font-size:10px;color:#aaa;margin-top:8px;max-width:62%;line-height:1.7">여백이 구조를 만든다. 색보다 공간이 먼저다.</p></div>`,
},
{
  id:'material', name:'Material Design', kr:'머티리얼 디자인', cat:'Modern',
  tagline:'종이와 잉크의 물리 법칙을 화면에 옮긴 구글의 디자인 언어.',
  def:'물리적 재료(종이)의 법칙을 디지털로 추상화한 시스템. 그림자로 깊이를, 리플로 터치 피드백을 표현한다.',
  feats:['Elevation & Shadow','Grid & Type Scale','Motion & Ripple','Material Metaphor'],
  examples:[
    {site:'material.io', url:'https://material.io', why:'구글의 공식 디자인 언어 문서. 컴포넌트·색·타이포 사양의 원본.'},
    {site:'Google', url:'https://www.google.com', why:'검색 카드, FAB, 리플 피드백이 실제 제품에서 작동하는 예.'},
  ],
  points:['그림자의 정도(z-elevation)가 정보의 깊이를 알려준다.','컴포넌트마다 정의된 상태(state)가 있다 — 기본·호버·눌림·비활성.'],
  pv:`<div class="pv-label">material</div><div style="background:#EFE6DD;height:100%;position:relative;font-family:var(--sans)"><div style="background:#6A4DDB;height:34px;display:flex;align-items:center;padding:0 14px;gap:6px;color:#fff"><span style="width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.35)"></span><b style="font-size:11px;font-weight:600">Material App</b><span style="flex:1"></span><span style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.5)"></span></div><div style="margin:14px;background:#fff;border-radius:8px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,.14),0 4px 12px rgba(0,0,0,.12)"><div style="height:6px;width:60%;background:#E5DCFA;border-radius:3px"></div><div style="height:6px;width:40%;background:#F0EDF5;border-radius:3px;margin-top:7px"></div><div style="height:6px;width:80%;background:#F0EDF5;border-radius:3px;margin-top:7px"></div></div><div style="position:absolute;right:14px;bottom:14px;width:30px;height:30px;border-radius:50%;background:#6A4DDB;display:grid;place-items:center;color:#fff;font-size:17px;box-shadow:0 3px 8px rgba(106,77,219,.5)">+</div></div>`,
},
{
  id:'material-you', name:'Material You', kr:'머티리얼 유', cat:'Modern',
  tagline:'배경화면에서 색을 뽑아내는 개인화된 디자인 시스템.',
  def:'Android 12부터 적용된 Material 3. 월페이퍼에서 색을 추출해 사용자마다 다른 동적 테마를 만든다. 원형·알약 형태의 표현적인 컴포넌트가 특징.',
  feats:['Dynamic Color','Expressive Shapes','Personalization','Adaptive'],
  examples:[
    {site:'Android', url:'https://www.android.com', why:'Material You의 동적 색상 시스템이 실제 OS에 적용된 모습.'},
    {site:'material.io', url:'https://material.io', why:'M3 토큰·디자인 시스템의 공식 스펙.'},
  ],
  points:['색이 브랜드에서 "사용자"의 것으로 옮겨졌다.','대부분의 컴포넌트가 알약이나 둥근 형태를 띤다.'],
  pv:`<div class="pv-label">material you</div><div style="background:#DCEFE5;height:100%;padding:16px;font-family:var(--sans)"><div style="background:#7FC8A9;border-radius:18px;padding:14px;color:#0d2a1f"><div style="font-size:11px;font-weight:600">Good morning</div><div style="font-size:15px;font-weight:600;margin:2px 0 10px">7 items to review</div><div style="display:flex;gap:6px"><span style="font-size:9px;background:rgba(255,255,255,.5);padding:5px 10px;border-radius:999px">Open</span><span style="font-size:9px;background:rgba(13,42,31,.12);padding:5px 10px;border-radius:999px">Snooze</span></div></div><div style="display:flex;gap:8px;margin-top:10px"><div style="flex:1;background:#fff;border-radius:16px;padding:10px"><div style="height:22px;width:22px;border-radius:50%;background:#F5B7A8"></div><div style="height:5px;background:#EDEAE6;border-radius:3px;margin-top:8px"></div></div><div style="flex:1;background:#fff;border-radius:16px;padding:10px"><div style="height:22px;width:22px;border-radius:50%;background:#B8C9E8"></div><div style="height:5px;background:#EDEAE6;border-radius:3px;margin-top:8px"></div></div><div style="flex:1;background:#fff;border-radius:16px;padding:10px"><div style="height:22px;width:22px;border-radius:50%;background:#F3E0B5"></div><div style="height:5px;background:#EDEAE6;border-radius:3px;margin-top:8px"></div></div></div></div>`,
},
{
  id:'fluent', name:'Fluent Design', kr:'플루언트 디자인', cat:'Modern',
  tagline:'빛, 음영, 재질, 깊이로 디지털 세계를 물리적으로 느끼게 하는 마이크로소프트의 시스템.',
  def:'마이크로소프트의 디자인 언어. 아크릴(Acrylic) 재질과 백페이드, 깊이 레이어를 이용해 화면을 투명한 재질로 만든다.',
  feats:['Acrylic Material','Depth & Layering','Light & Motion','Design Tokens'],
  examples:[
    {site:'Microsoft', url:'https://www.microsoft.com', why:'Fluent 2의 재질·타이포·컴포넌트가 적용된 메인 사이트.'},
    {site:'Fluent 2', url:'https://fluent2.microsoft.com', why:'토큰 기반 공식 디자인 시스템 문서.'},
  ],
  points:['재질(아크릴 블러)이 정보의 층을 드러낸다.','깊이 감은 그림자가 아니라 조명의 방향으로 만든다.'],
  pv:`<div class="pv-label">fluent</div><div style="height:100%;background:linear-gradient(120deg,#B4D6FF,#E8F0FF);position:relative;font-family:var(--sans);overflow:hidden"><div style="position:absolute;inset:14px;background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.6);border-radius:14px;padding:16px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)"><div style="display:flex;gap:8px;align-items:center"><span style="width:22px;height:22px;border-radius:6px;background:#0078D4"></span><b style="font-size:11px;color:#003a63">Fluent 2</b></div><div style="display:flex;gap:6px;margin:12px 0 10px;font-size:9px;color:#005a9e"><span>Home</span><span>Files</span><span style="font-weight:600">Settings</span></div><div style="height:7px;width:70%;background:rgba(0,120,212,.25);border-radius:4px"></div><div style="height:7px;width:50%;background:rgba(0,120,212,.18);border-radius:4px;margin-top:6px"></div><div style="height:7px;width:62%;background:rgba(0,120,212,.18);border-radius:4px;margin-top:6px"></div></div><div style="position:absolute;left:24px;bottom:20px;width:70px;height:18px;background:rgba(255,255,255,.6);border-radius:9px;border:1px solid rgba(255,255,255,.7);-webkit-backdrop-filter:blur(4px)"></div></div>`,
},
{
  id:'corporate', name:'Corporate', kr:'코퍼레이트', cat:'Modern',
  tagline:'신뢰를 우선하는 비즈니스 디자인. 차분하고 질서정연하다.',
  def:'기업 브랜드에 맞춘 안전한 디자인. 네이비와 화이트로 톤을 낮추고, 격자와 데이터 시각화로 신뢰를 만든다.',
  feats:['Trust & Credibility','Small Caps Labels','Data Visualization','Neutral Palette'],
  examples:[
    {site:'IBM', url:'https://www.ibm.com', why:'글로벌 기업의 정제된 타이포와 그리드 시스템.'},
    {site:'McKinsey', url:'https://www.mckinsey.com', why:'보고서 스타일의 장엄한 레이아웃과 데이터 표현.'},
  ],
  points:['색이 튀는 순간 비즈니스 신뢰가 흔들린다 — 팔레트가 곧 성격이다.','차트와 표가 디자인을 지배하는 구조다.'],
  pv:`<div class="pv-label">corporate</div><div style="background:#0E1B3D;height:100%;color:#fff;font-family:var(--sans);padding:18px 20px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:12px;letter-spacing:.04em">ACME CORPORATE</b><span style="font-size:9px;color:#9FB0D9;letter-spacing:.08em">FY 2026 REPORT</span></div><div style="display:flex;align-items:flex-end;gap:8px;margin-top:18px;height:64px"><div style="flex:1;background:#2E5BFF;height:38px"></div><div style="flex:1;background:#3E72FF;height:50px"></div><div style="flex:1;background:#4C7CFF;height:42px"></div><div style="flex:1;background:#5C8AFF;height:58px"></div><div style="flex:1;background:#2E5BFF;height:30px"></div><div style="flex:1;background:#5C8AFF;height:46px"></div></div><div style="display:flex;gap:16px;margin-top:12px;font-size:8.5px;color:#8FA3D6;letter-spacing:.05em"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span></div></div>`,
},
{
  id:'luxury', name:'Luxury', kr:'럭셔리', cat:'Modern',
  tagline:'검은 화면 위의 금색 타이포. 접근성이 아니라 희소성을 말한다.',
  def:'고급 브랜드를 위한 디자인. 어두운 배경, 세리프 폰트, 넓은 자간, 금색 포인트로 희소성과 완성도를 표현한다.',
  feats:['Serif & Gold','Letter-spacing','Exclusivity','Restraint'],
  examples:[
    {site:'Cartier', url:'https://www.cartier.com', why:'아르데코 헤리티지를 잇는 금색·검정의 브랜드 언어.'},
    {site:'Rolex', url:'https://www.rolex.com', why:'검은 배경 위 정교한 금색 타이포와 로고의 질감.'},
  ],
  points:['작은 텍스트라도 자간과 무게로 비싸 보이게 만든다.','대비가 낮아도 느낌이 있으면 고급스럽다 — 단, 접근성은 별개다.'],
  pv:`<div class="pv-label">luxury</div><div style="background:#101010;height:100%;color:#EDE6D5;font-family:Georgia,serif;padding:26px;position:relative"><div style="font-size:9px;letter-spacing:.35em;color:#B79A5B;font-family:var(--mono)">MAISON</div><div style="font-size:23px;font-weight:400;margin:14px 0 6px;letter-spacing:.02em">Une élégance<br>intemporelle</div><div style="width:36px;height:1px;background:#B79A5B;margin:12px 0"></div><div style="font-size:9px;color:#8f887a;letter-spacing:.12em;font-family:var(--mono)">EST. 1927 — PARIS</div><div style="position:absolute;right:24px;top:22px;width:34px;height:34px;border:1px solid #B79A5B;transform:rotate(45deg);opacity:.7"></div></div>`,
},
{
  id:'editorial', name:'Editorial', kr:'에디토리얼', cat:'Modern',
  tagline:'잡지의 전통을 화면으로. 읽는 시간을 디자인한다.',
  def:'매거진·신문의 레이아웃을 따르는 디자인. 세리프 헤드라인, 다단 구성, 드롭캡, 인용구로 긴 글을 읽기 좋게 만든다.',
  feats:['Serif Headline','Multi-column','Pull Quote','Long-form Reading'],
  examples:[
    {site:'The New York Times', url:'https://www.nytimes.com', why:'신문의 전통을 디지털로 이행한 단·행간·타이포의 기준.'},
    {site:'The Atlantic', url:'https://www.theatlantic.com', why:'읽는 시간 자체를 디자인 대상으로 삼은 사이트.'},
  ],
  points:['글의 첫 인상은 헤드라인의 세리프에서 시작한다.','행간과 단 폭(measure)이 읽기 속도를 결정한다.'],
  pv:`<div class="pv-label">editorial</div><div style="background:#FCFAF6;height:100%;color:#1b1b1b;padding:20px 22px;font-family:Georgia,'Noto Serif KR',serif"><div style="font-size:18px;font-weight:700;line-height:1.15;max-width:85%">A Quiet<br>Typography of<br>Space</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px"><div style="font-size:8.5px;line-height:1.6;color:#555"><b style="float:left;font-size:22px;line-height:.8;padding:3px 4px 0 0;color:#8B3A2A">T</b>he editorial page breathes through its margins. Every line resolves a column.</div><div style="font-size:8.5px;line-height:1.6;color:#555">Fluent prose and disciplined measure. The headline leads, the body follows.</div></div><div style="height:1px;background:#ddd;margin-top:10px"></div></div>`,
},
{
  id:'corp-memphis', name:'Corporate Memphis', kr:'코퍼레이트 멤피스', cat:'Modern',
  tagline:'플랫 일러스트의 상징. 심플한 도형과 밝은 색의 팔이 긴 캐릭터.',
  def:'스트라이프부터 테크 스타트업까지 널리 쓰인 플랫 일러스트 스타일. 단순한 도형과 밝은 색, 팔다리가 길쭉한 캐릭터가 특징.',
  feats:['Flat Illustration','Simple Shapes','Bright Colors','Playful'],
  examples:[
    {site:'Duolingo', url:'https://www.duolingo.com', why:'캐릭터 기반 플랫 일러스트를 브랜드 전체에 적용.'},
    {site:'Buck', url:'https://buck.co', why:'2017년 페이스북의 일러스트 시스템 “Alegria”를 만든 스튜디오. 이 스타일의 출발점이다.'},
  ],
  points:['복잡한 의미를 단순 도형으로 압축한다.','캐릭터가 브랜드 감성을 대신한다.'],
  pv:`<div class="pv-label">corporate memphis</div><div style="background:#F3F0EA;height:100%;font-family:var(--sans);position:relative;overflow:hidden"><div style="position:absolute;left:18px;bottom:16px"><div style="width:52px;height:66px;background:#6E4EFF;border-radius:22px 22px 26px 26px;position:relative"><div style="width:10px;height:10px;border-radius:50%;background:#fff;position:absolute;top:20px;left:10px"></div><div style="width:10px;height:10px;border-radius:50%;background:#fff;position:absolute;top:20px;right:10px"></div><div style="width:18px;height:10px;background:#fff;border-radius:999px;position:absolute;bottom:16px;left:50%;transform:translateX(-50%)"></div></div></div><div style="position:absolute;right:20px;top:18px;width:56px;height:56px;border-radius:14px;background:#FFB400;transform:rotate(8deg)"></div><div style="position:absolute;right:52px;bottom:18px;width:34px;height:34px;border-radius:50%;background:#FF6B4A"></div><div style="position:absolute;left:70px;top:20px;width:60px;height:46px;background:#F2A65A;border-radius:14px;transform:rotate(-6deg)"></div></div>`,
},
{
  id:'brutal', name:'Brutalism', kr:'브루탈리즘', cat:'Brutal',
  tagline:'원시적 웹. 장식을 거부하는 과감한 타이포와 구조.',
  def:'장식과 디테일을 과감히 제거하고, 큰 타이포그래피와 날것 그대로의 구조를 드러내는 스타일. 1990년대 웹의 성격을 반영한다.',
  feats:['Bold Typography','Raw Layout','High Contrast','Minimal Decoration'],
  examples:[
    {site:'Brutalist Websites', url:'https://brutalistwebsites.com', why:'브루탈리즘 사이트를 모은 아카이브이자 그 자체가 사례.'},
    {site:'HTML Energy', url:'https://html.energy', why:'원시 HTML의 미학을 실험하는 커뮤니티.'},
  ],
  points:['타이포그래피가 장식이 아니라 구조 그 자체다.','비대칭과 충돌이 실수처럼 보이지만 계산된 것이다.'],
  pv:`<div class="pv-label">brutalism</div><div style="background:#000;height:100%;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;padding:20px 22px;border:3px solid #F6EF43;position:relative"><span style="display:inline-block;background:#F6EF43;color:#000;font-weight:700;font-size:9px;letter-spacing:.12em;padding:3px 7px">RAW.</span><div style="font-size:26px;font-weight:700;text-transform:uppercase;line-height:.95;margin-top:10px;letter-spacing:-.01em">NO<br>SHADOWS.<br>NO MERCY.</div><div style="position:absolute;right:18px;bottom:16px;width:52px;height:20px;border:3px solid #F6EF43;display:grid;place-items:center;font-size:9px;font-weight:700">GO &gt;</div></div>`,
},
{
  id:'neobrutal', name:'Neo-Brutalism', kr:'네오 브루탈리즘', cat:'Brutal',
  tagline:'브루탈리즘을 부드럽게, 밝게, 그리고 에너지 넘치게 재해석.',
  def:'원조 브루탈리즘의 거친 윤곽을 유지하되, 밝은 색과 두꺼운 보더, 단단한 오프셋 섀도, 둥근 모서리를 더한 현대적 변형.',
  feats:['Thick Borders','Hard Offset Shadows','Bright Colors','Playful Energy'],
  examples:[
    {site:'Hack Club', url:'https://hackclub.com', why:'하드 섀도와 두꺼운 보더를 온전히 즐기는 사이트.'},
    {site:'Gumroad', url:'https://gumroad.com', why:'신브루탈리즘을 상업적 UI에 적용한 사례.'},
  ],
  points:['그림자가 "떠 있는" 게 아니라 "벽돌처럼" 단단하다.','밝은 버튼색이 인터랙션의 위치를 알려준다.'],
  pv:`<div class="pv-label">neo brutalism</div><div style="background:#FFF7E0;height:100%;font-family:var(--sans);padding:18px;display:flex;flex-direction:column;gap:10px"><div style="background:#fff;border:2.5px solid #111;border-radius:12px;padding:10px 12px;box-shadow:4px 4px 0 #111"><div style="font-size:12px;font-weight:700">Neo Brutal Card</div><div style="font-size:8.5px;color:#555;margin:3px 0 8px">Hard shadows. Bold borders.</div><div style="display:flex;gap:6px"><span style="background:#111;color:#fff;font-size:9px;font-weight:600;padding:5px 9px;border-radius:7px">Buy</span><span style="background:#FF5D5D;color:#111;font-size:9px;font-weight:600;padding:5px 9px;border-radius:7px;border:2px solid #111;box-shadow:2px 2px 0 #111">Save</span></div></div><div style="background:#FFD23F;border:2.5px solid #111;border-radius:10px;padding:8px 10px;font-size:9px;font-weight:700;box-shadow:3px 3px 0 #111">90'S WEB, ENERGETIC</div></div>`,
},
{
  id:'glass', name:'Glassmorphism', kr:'글래스모피즘', cat:'Effect',
  tagline:'색 위에 떠 있는 유리. 블러와 투명도로 만드는 현대적 질감.',
  def:'반투명 표면과 배경 블러(backdrop-filter)를 결합해 유리처럼 보이게 하는 기법. 배경이 비치면서도 내용은 또렷하게 읽히는 것이 핵심.',
  feats:['Backdrop Blur','Translucency','Light Border','Depth Layering'],
  examples:[
    {site:'Linear', url:'https://linear.app', why:'유리 패널과 블러가 제품의 질감을 만드는 기준.'},
    {site:'Glassmorphism', url:'https://glassmorphism.com', why:'기법을 소개하는 쇼케이스.'},
  ],
  points:['블러 뒤의 배경이 있어야 유리가 존재한다.','테두리의 밝은 하이라이트가 유리의 두께를 만든다.'],
  pv:`<div class="pv-label">glassmorphism</div><div style="height:100%;background:linear-gradient(120deg,#FFD3C2,#FFB59A 40%,#B7A6FF 75%,#8FD6FF);position:relative;font-family:var(--sans)"><div style="position:absolute;width:54px;height:54px;border-radius:18px;background:rgba(255,255,255,.55);top:-10px;left:-8px;transform:rotate(14deg)"></div><div style="position:absolute;width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.35);bottom:-8px;right:-6px;transform:rotate(-12deg)"></div><div style="position:absolute;inset:14px;background:rgba(255,255,255,.42);border:1px solid rgba(255,255,255,.6);border-radius:16px;padding:16px;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 12px 40px rgba(0,0,0,.14);color:#241a35"><b style="font-size:13px;display:block">Frosted Layer</b><div style="font-size:9px;margin:5px 0 10px;color:#3a2b52;line-height:1.5">색과 빛 위에 떠 있는 유리. 배경은 보이고, 내용은 또렷하게.</div><span style="background:#fff;color:#241a35;font-weight:700;font-size:9px;padding:6px 11px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.12)">Open</span></div></div>`,
},
{
  id:'neumorph', name:'Neumorphism', kr:'뉴모피즘', cat:'Effect',
  tagline:'같은 톤의 그림자로 만드는 "눌러진 소프트웨어".',
  def:'배경색과 동일한 색의 표면을 두 방향 그림자로 양각·음각 처리하는 스타일. 부드럽고 촉감 있는 인터페이스를 만든다.',
  feats:['Soft Dual Shadows','Same-tone Surface','Inset & Extruded','Tactile'],
  examples:[
    {site:'neumorphism.io', url:'https://neumorphism.io', why:'그림자 파라미터를 직접 조절하는 생성기.'},
    {site:'Hype4 · Neumorphism', url:'https://hype4.academy/articles/design/neumorphism-in-user-interfaces', why:'“뉴모피즘”이라는 말을 만든 미하우 말레비치의 원문. 접근성 한계까지 함께 짚는다.'},
  ],
  points:['대비가 낮아 접근성 측면의 단점이 크다.','그림자가 "빛"이 아니라 "질감"을 만든다.'],
  pv:`<div class="pv-label">neumorphism</div><div style="background:#E2E4EC;height:100%;display:grid;place-items:center;font-family:var(--sans)"><div style="background:#E2E4EC;border-radius:16px;width:150px;height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;box-shadow:-8px -8px 18px rgba(255,255,255,.75),8px 8px 18px rgba(0,0,0,.14)"><div style="width:44px;height:44px;border-radius:50%;background:#E2E4EC;box-shadow:inset -6px -6px 10px rgba(255,255,255,.7),inset 6px 6px 10px rgba(0,0,0,.12);display:grid;place-items:center;color:#8B93A7;font-size:18px">&#9654;</div><div style="font-size:9px;color:#8B93A7;font-weight:600">Soft · Pressed · Raised</div></div></div>`,
},
{
  id:'clay', name:'Claymorphism', kr:'클레이모피즘', cat:'Effect',
  tagline:'찰흙처럼 부드럽고 둥글고 통통한 디자인.',
  def:'주로 연한 파스텔 톤의 배경 위에 크고 둥근 도형을 배치하고, 하단에 그림자를 넣어 토기처럼 보이게 하는 스타일.',
  feats:['Rounded Blobs','Pastel Colors','Bottom Shadow','3D-ish Depth'],
  examples:[
    {site:'Claymorphism Generator', url:'https://hype4.academy/tools/claymorphism-generator', why:'“클레이모피즘”을 명명한 곳의 생성기. 둥글기·깊이·블러를 직접 만져볼 수 있다.'},
    {site:'Figma Community', url:'https://www.figma.com', why:'클레이 모양 UI 키트가 유통되는 주요 플랫폼.'},
  ],
  points:['그림자가 아래쪽에만 있어 "앉아 있는" 느낌을 준다.','색이 밝을수록 찰흙의 질감이 살아난다.'],
  pv:`<div class="pv-label">claymorphism</div><div style="background:#FDF1E7;height:100%;display:grid;place-items:center;gap:14px;font-family:var(--sans)"><div style="display:flex;gap:16px;align-items:center"><div style="width:58px;height:58px;border-radius:50%;background:#FF9E7D;box-shadow:0 10px 0 rgba(255,158,125,.35),0 16px 22px rgba(255,158,125,.4)"></div><div style="width:70px;height:70px;border-radius:22px;background:#6EC6FF;box-shadow:0 12px 0 rgba(110,198,255,.35),0 18px 24px rgba(110,198,255,.4);transform:rotate(-8deg)"></div><div style="width:52px;height:52px;border-radius:18px;background:#FFD36E;box-shadow:0 9px 0 rgba(255,211,110,.4),0 14px 20px rgba(255,211,110,.42);transform:rotate(10deg)"></div></div><div style="font-size:9px;color:#a97c5a;font-weight:600">Squishy, rounded, sunny</div></div>`,
},
{
  id:'skeuo', name:'Skeuomorphism', kr:'스큐어모피즘', cat:'Effect',
  tagline:'실제 세계의 재질과 빛을 화면에 그대로 재현.',
  def:'가죽, 종이, 금속처럼 실세계의 질감을 화면에 그대로 구현하는 디자인. 익숙한 사물의 형상을 빌려 직관적으로 사용법을 알려준다.',
  feats:['Realism','Texture','Light & Shadow','Affordance'],
  examples:[
    {site:'Native Instruments', url:'https://www.native-instruments.com', why:'악기 UI가 실물 장비의 질감과 조작감을 재현.'},
    {site:'Awwwards', url:'https://www.awwwards.com', why:'스큐어모피즘의 현대적 부활 사례를 관찰하는 곳.'},
  ],
  points:['재질이 "무엇을 하는 물건인지"를 즉시 알려준다.','iOS 7 이후 유행이 꺾였지만 지금도 효과적일 때가 있다.'],
  pv:`<div class="pv-label">skeuomorphism</div><div style="background:#E9E6DE;height:100%;display:grid;place-items:center;gap:14px;font-family:var(--sans)"><div style="width:150px;height:70px;border-radius:14px;background:linear-gradient(180deg,#B97B42,#8A5326);border:1px solid #6B3D1B;box-shadow:inset 0 2px 3px rgba(255,255,255,.4),inset 0 -3px 5px rgba(0,0,0,.35),0 10px 18px rgba(0,0,0,.3);display:grid;place-items:center;color:#fff;font-size:11px;font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,.5);letter-spacing:.04em;position:relative">LEATHER<span style="position:absolute;top:4px;left:10px;right:10px;height:18px;border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.35),rgba(255,255,255,0))"></span></div><div style="font-size:9px;color:#8a7f70;font-weight:600">Real texture · Real light</div></div>`,
},
{
  id:'flat', name:'Flat Design', kr:'플랫 디자인', cat:'Modern',
  tagline:'그림자와 질감을 걷어내고 색과 형태만 남긴다.',
  def:'2013년 iOS 7과 Windows 8을 기점으로 스큐어모피즘을 밀어낸 스타일. 그라데이션·베벨·그림자를 지우고 단색 면, 단순한 아이콘, 선명한 타이포만으로 화면을 구성한다.',
  feats:['No Gradients','Solid Color Blocks','Simple Icons','Bold Typography'],
  examples:[
    {site:'GOV.UK', url:'https://www.gov.uk', why:'장식을 완전히 뺀 공공 서비스. 플랫이 기능을 위한 선택임을 보여준다.'},
    {site:'Flat UI Colors', url:'https://flatuicolors.com', why:'플랫 디자인이 표준화한 채도 높은 단색 팔레트의 원본 모음.'},
  ],
  points:['깊이 단서를 지우면 무엇이 눌리는 것인지 알기 어려워진다 — 플랫이 남긴 대표적 문제다.','그림자를 못 쓰니 위계를 색과 크기로만 만들어야 한다. 팔레트 설계가 더 중요해진다.'],
  pv:`<div style="background:#ECF0F1;height:100%;font-family:var(--sans);padding:0;display:flex;flex-direction:column"><div style="background:#2C3E50;height:34px;display:flex;align-items:center;padding:0 14px;gap:8px;color:#fff"><span style="width:14px;height:14px;background:#1ABC9C"></span><b style="font-size:11px;font-weight:600">FLAT</b><span style="flex:1"></span><span style="font-size:9px;opacity:.7">Home  Work  About</span></div><div style="padding:16px 14px"><div style="font-size:19px;font-weight:700;color:#2C3E50;line-height:1.15;letter-spacing:-.01em">No shadows.<br>Just color.</div><p style="font-size:9.5px;color:#7F8C8D;margin-top:7px;line-height:1.6">깊이를 지우면 색이 위계를 대신한다.</p></div><div style="display:flex;gap:8px;padding:0 14px 14px"><div style="flex:1;height:44px;background:#E74C3C"></div><div style="flex:1;height:44px;background:#3498DB"></div><div style="flex:1;height:44px;background:#F1C40F"></div></div><div style="margin:0 14px 14px;background:#1ABC9C;color:#fff;font-size:10px;font-weight:600;padding:9px 0;text-align:center">Get Started</div></div>`,
},
{
  id:'frutiger', name:'Frutiger Aero', kr:'프루티거 에어로', cat:'Effect',
  tagline:'2000년대의 유리 같은 미래. 반짝임과 물결로 가득한 인터넷.',
  def:'2004~2013년 Windows·애플 제품군에 퍼졌던 미래지향적 스타일. 반투명 유리, 물결, 잎사귀, 과장된 광택과 채도 높은 청록색이 특징.',
  feats:['Gloss & Shine','Aqua & Transparency','Bubbles','Optimistic Future'],
  examples:[
    {site:'r/FrutigerAero', url:'https://www.reddit.com/r/FrutigerAero/', why:'이 스타일을 보존·전파하는 커뮤니티 아카이브.'},
    {site:'Wayback Machine', url:'https://web.archive.org', why:'웨이백 머신으로 윈도우 비스타·7 시절 UI를 직접 확인.'},
  ],
  points:['광택 하이라이트가 "미래"의 지표였다.','요즘엔 노스탤지어로 다시 소비된다.'],
  pv:`<div class="pv-label">frutiger aero</div><div style="height:100%;background:linear-gradient(160deg,#7DF2FF,#38A8E0 55%,#2E7CC4);font-family:var(--sans);position:relative;overflow:hidden"><div style="position:absolute;width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,.35);left:-14px;top:-10px"></div><div style="position:absolute;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.45);right:22px;top:16px"></div><div style="position:absolute;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.4);right:64px;top:34px"></div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><div style="background:linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.55));border-radius:16px;width:140px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,.8);box-shadow:inset 0 2px 4px rgba(255,255,255,.7),0 12px 30px rgba(20,80,140,.3);color:#0E4E7A"><div style="font-size:12px;font-weight:700">2000s Gloss</div><div style="font-size:8px;margin-top:3px;opacity:.8">aero · glass · shine</div></div></div><div style="position:absolute;left:24px;bottom:16px;font-size:8px;color:rgba(255,255,255,.9);letter-spacing:.1em;font-family:var(--mono)">FRUTIGER AERO</div></div>`,
},
{
  id:'bauhaus', name:'Bauhaus', kr:'바우하우스', cat:'Art',
  tagline:'예술과 산업의 결합. 원색의 기하학.',
  def:'1919년 독일 바이마르에서 시작된 디자인 운동. 원색(빨강·노랑·파랑)과 기본 도형(원·삼각·사각)으로 기능과 미학을 결합했다.',
  feats:['Primary Colors','Basic Geometry','Form Follows Function','Craft & Industry'],
  examples:[
    {site:'Bauhaus-Archiv', url:'https://www.bauhaus.de', why:'바우하우스 유산을 보존하는 공식 박물관.'},
    {site:'Bauhaus Dessau', url:'https://www.bauhaus-dessau.de', why:'바우하우스 건물과 워크숍이 남아 있는 데사우 재단.'},
  ],
  points:['원색을 섞지 않고 "나란히" 배치한다.','장식은 없지만 질서가 곧 아름다움이다.'],
  pv:`<div class="pv-label">bauhaus</div><div style="background:#F2F0E8;height:100%;position:relative;overflow:hidden;font-family:var(--sans)"><div style="position:absolute;width:70px;height:70px;border-radius:50%;background:#D83124;right:-14px;top:-14px"></div><div style="position:absolute;width:66px;height:66px;background:#0B4EA2;left:-10px;top:-16px;transform:rotate(45deg)"></div><div style="position:absolute;width:120px;height:26px;background:#F2C300;bottom:12px;right:12px;transform:rotate(-4deg)"></div><div style="position:absolute;bottom:20px;left:20px;font-size:16px;font-weight:700;letter-spacing:.02em;line-height:1.1">BAU<br>HAUS</div><div style="position:absolute;left:20px;top:18px;font-family:var(--mono);font-size:8px;letter-spacing:.14em">1919–1933 · WEIMAR</div></div>`,
},
{
  id:'swiss', name:'Swiss Style', kr:'스위스 스타일', cat:'Art',
  tagline:'그리드와 그로테스크, 빨간 포인트. 객관성을 위한 국제 타이포그래피 양식.',
  def:'1950년대 스위스에서 발전한 국제 타이포그래피 양식(International Typographic Style). 엄격한 그리드, 산세리프 폰트, 객관적인 배열이 특징.',
  feats:['Strict Grid','Grotesque Type','Red Accent','Objectivity'],
  examples:[
    {site:'Helvetica (2007)', url:'https://www.hustwit.com/helvetica', why:'헬베티카 50주년에 맞춰 만든 다큐멘터리. 감독 게리 허스윗의 공식 페이지.'},
    {site:'eMuseum · Zürich', url:'https://www.emuseum.ch', why:'뮐러브로크만의 포스터 원본을 소장한 취리히 디자인미술관 온라인 컬렉션. 그리드가 실제로 어떻게 쓰였는지 볼 수 있다.'},
  ],
  points:['대칭 대신 그리드 위의 질서가 아름다움을 만든다.','빨간색 한 가지가 전체를 장악한다.'],
  pv:`<div class="pv-label">swiss style</div><div style="background:#F6F4EF;height:100%;color:#111;font-family:'Helvetica Neue',Arial,sans-serif;padding:18px 20px;display:flex;flex-direction:column"><div style="display:flex;justify-content:space-between;border-bottom:2px solid #E2231A;padding-bottom:7px;font-size:9px;font-weight:600;letter-spacing:.14em"><span>INTERNATIONAL TYPE</span><span style="color:#E2231A">ZÜRICH</span></div><div style="font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:.98;margin-top:12px">Typografie<br>ist Struktur.</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:auto"><div style="height:20px;background:#111"></div><div style="height:20px;background:#E2231A"></div><div style="height:20px;border:2px solid #111;background:transparent"></div><div style="height:20px;background:#111"></div></div><div style="display:flex;justify-content:space-between;font-size:7.5px;letter-spacing:.06em;color:#666;border-top:1px solid #111;padding-top:5px;margin-top:6px"><span>01 / GRID</span><span>02 / TYPE</span><span>03 / RED</span></div></div>`,
},
{
  id:'memphis', name:'Memphis', kr:'멤피스', cat:'Art',
  tagline:'1980년대의 대담한 패턴과 파스텔, 그리고 장난기.',
  def:'1981년 밀라노에서 에토레 소트사스가 시작한 디자인 그룹. 격자무늬, 파스텔, 기하학적 모양으로 지루함을 깨부쉈다.',
  feats:['Bold Patterns','Pastel Colors','Geometric Shapes','Playful'],
  examples:[
    {site:'Memphis Milano', url:'https://memphismilano.com', why:'멤피스 그룹의 공식 브랜드 아카이브.'},
    {site:'Vogue', url:'https://www.vogue.com', why:'멤피스의 복고 유행을 다룬 패션 매거진.'},
  ],
  points:['패턴이 배경이 아니라 주인공이다.','혼돈처럼 보이지만 리듬이 있다.'],
  pv:`<div class="pv-label">memphis</div><div style="background:#FFE8D6;height:100%;position:relative;overflow:hidden;font-family:var(--sans)"><div style="position:absolute;width:46px;height:46px;border-radius:12px;background:#FF6B5E;right:18px;top:16px;transform:rotate(10deg)"></div><div style="position:absolute;width:40px;height:40px;border-radius:50%;background:#FFC94D;left:20px;top:24px"></div><div style="position:absolute;width:52px;height:26px;border-radius:50%;background:#4EC5A6;right:26px;bottom:22px;transform:rotate(-14deg)"></div><div style="position:absolute;left:26px;bottom:30px;width:40px;height:20px;border:2.5px solid #2B2B2B;border-radius:999px"></div><div style="position:absolute;left:40%;bottom:20px;font-family:var(--mono);font-size:8px;letter-spacing:.14em;color:#7a5c4a">MEMPHIS '81</div><div style="position:absolute;top:46%;left:34%;width:52px;height:52px;border-radius:50%;background:#7A6CFF;opacity:.85"></div></div>`,
},
{
  id:'destijl', name:'De Stijl', kr:'데 스틸', cat:'Art',
  tagline:'오직 수직·수평·원색만으로 세계를 추상화한 순수주의.',
  def:'1917년 네덜란드의 미술 운동. 테오 반 두스뷔르흐가 이끌고 몬드리안·리트벨트가 함께했다. 직선, 직사각형, 원색(빨강·노랑·파랑), 흑백만을 사용했다.',
  feats:['Straight Lines','Primary Colors','Abstraction','Purity'],
  examples:[
    {site:'Mondriaanhuis', url:'https://www.mondriaanhuis.nl', why:'몬드리안의 출생지이자 작품을 전시하는 박물관.'},
    {site:'Rijksmuseum', url:'https://www.rijksmuseum.nl', why:'데 스틸 작품을 소장한 네덜란드 국립박물관.'},
  ],
  points:['사선도 곡선도 없다 — 직각만으로 완성한다.','색이 3개로 제한될수록 질서가 또렷해진다.'],
  pv:`<div class="pv-label">de stijl</div><div style="background:#F4F1E9;height:100%;display:flex;gap:4px;padding:14px;font-family:var(--sans)"><div style="flex:1.4;display:flex;flex-direction:column;gap:4px"><div style="flex:1;background:#D83124"></div><div style="height:36%;background:#F2F1E9;border:2px solid #111"></div></div><div style="flex:1;display:flex;flex-direction:column;gap:4px"><div style="height:30%;background:#F2F1E9;border:2px solid #111"></div><div style="flex:1;background:#111"></div><div style="height:26%;background:#0B4EA2;border:2px solid #111"></div></div></div>`,
},
{
  id:'artdeco', name:'Art Deco', kr:'아르데코', cat:'Art',
  tagline:'금빛의 기하학. 1920~30년대의 번영과 장식.',
  def:'1920~30년대에 유행한 장식 예술 운동. 대칭, 기하학적 패턴, 금색, 호화로운 소재로 번영의 시대를 표현했다.',
  feats:['Geometry & Symmetry','Gold & Black','Ornament','Glamour'],
  examples:[
    {site:'The Met', url:'https://www.metmuseum.org', why:'아르데코 디자인을 대량으로 소장한 뉴욕 메트로폴리탄.'},
    {site:'NYPL', url:'https://www.nypl.org', why:'아르데코 양식으로 지어진 슈바르츠만 빌딩의 브랜딩.'},
  ],
  points:['대칭이 과하지 않게 유지되는 균형이 핵심이다.','금색이 배경이 아니라 포인트일 때 더 비싸 보인다.'],
  pv:`<div class="pv-label">art deco</div><div style="background:#171310;height:100%;color:#E4C87A;position:relative;overflow:hidden;font-family:Georgia,serif"><div style="position:absolute;left:50%;top:14px;transform:translateX(-50%);width:74px;height:34px;display:flex;gap:2px;align-items:flex-start;justify-content:center"><div style="flex:1;height:100%;background:linear-gradient(180deg,#E4C87A,rgba(228,200,122,0));transform:skewX(-6deg)"></div><div style="flex:1;height:100%;background:linear-gradient(180deg,#E4C87A,rgba(228,200,122,0));transform:skewX(0deg)"></div><div style="flex:1;height:100%;background:linear-gradient(180deg,#E4C87A,rgba(228,200,122,0));transform:skewX(6deg)"></div></div><div style="position:absolute;top:52px;left:0;right:0;text-align:center;font-size:17px;letter-spacing:.06em">Golden Age</div><div style="position:absolute;top:78px;left:50%;transform:translateX(-50%);width:52px;height:1px;background:#E4C87A"></div><div style="position:absolute;bottom:16px;left:0;right:0;text-align:center;font-family:var(--mono);font-size:8px;letter-spacing:.24em">NEW YORK · 1930</div></div>`,
},
{
  id:'construct', name:'Constructivism', kr:'구성주의', cat:'Art',
  tagline:'포스터에서 터져 나오는 사선과 선전 에너지.',
  def:'러시아 혁명 직후의 예술 운동. 대각선, 원, 삼각형을 겹쳐 속도와 선전의 힘을 표현했다. 정치적 포스터에 강하게 나타났다.',
  feats:['Diagonals','Red & Black','Propaganda Energy','Geometry'],
  examples:[
    {site:'Tate', url:'https://www.tate.org.uk', why:'구성주의의 개념과 작품을 정리한 미술관 용어 페이지.'},
    {site:'MoMA', url:'https://www.moma.org', why:'구성주의 포스터와 디자인을 소장한 뉴욕 근현대미술관.'},
  ],
  points:['사선이 정지된 화면에 운동감을 주입한다.','빨강과 검정의 대비가 메시지의 긴장감을 만든다.'],
  pv:`<div class="pv-label">constructivism</div><div style="background:#EDEAE0;height:100%;position:relative;overflow:hidden;font-family:'Helvetica Neue',Arial,sans-serif"><div style="position:absolute;right:-30px;top:-30px;width:150px;height:150px;background:#D83124;transform:rotate(45deg)"></div><div style="position:absolute;left:-24px;bottom:-16px;width:130px;height:52px;background:#111;transform:rotate(-10deg)"></div><div style="position:absolute;left:18px;top:16px;width:40px;height:8px;background:#111"></div><div style="position:absolute;left:60px;top:22px;width:20px;height:20px;border-radius:50%;background:#111"></div><div style="position:absolute;left:26px;bottom:30px;font-size:20px;font-weight:700;letter-spacing:.02em;line-height:.95;color:#D83124">SOVIET<br>GRAPHICS</div><div style="position:absolute;right:20px;bottom:18px;font-family:var(--mono);font-size:7.5px;letter-spacing:.16em;color:#444;transform:rotate(90deg);transform-origin:right bottom">CONSTRUCTIVISM 1920</div></div>`,
},
{
  id:'retro', name:'Retro Web', kr:'레트로 웹', cat:'Emotion',
  tagline:'90년대 인터넷의 온기. 베이지와 갈색, 그리고 구식 창문.',
  def:'1990년대~2000년대 초의 웹 미학을 차용하는 스타일. 크림색 배경, 갈색 톤, 테이블 레이아웃, 구식 브라우저 요소로 노스탤지어를 만든다.',
  feats:['Warm Tones','Old Web Texture','Window Frames','Nostalgia'],
  examples:[
    {site:'Windows 93', url:'https://www.windows93.net', why:'구식 OS의 사운드와 창문을 웹으로 완벽 재현.'},
    {site:'Craigslist', url:'https://www.craigslist.org', why:'20년 넘게 형태가 거의 변하지 않은 원시 웹의 생존자.'},
  ],
  points:['낡아 보이는 것에는 기억의 온도가 있다.','픽셀과 보더가 "시간 여행"의 장치가 된다.'],
  pv:`<div class="pv-label">retro web</div><div style="background:#EADFC4;height:100%;padding:16px;font-family:var(--sans)"><div style="background:#F8F2E0;border:2px solid #8A6B4A;border-radius:6px;padding:10px 12px;box-shadow:inset 0 0 0 1px #F0E8D0"><div style="display:flex;justify-content:space-between;font-size:8px;font-weight:700;color:#6b4f31;border-bottom:1px solid #C9A983;padding-bottom:6px;margin-bottom:8px"><span>&#9684; Welcome</span><span style="background:#6b4f31;color:#F8F2E0;padding:1px 5px;border-radius:3px">&#10005;</span></div><div style="font-size:9.5px;color:#4a3826;line-height:1.5">환영합니다! 구식 웹의 온기를<br>그대로 느껴보세요.</div><div style="margin-top:8px;font-size:8px;color:#8a6b4a">— est. 1998 —</div></div></div>`,
},
{
  id:'y2k', name:'Y2K', kr:'Y2K', cat:'Emotion',
  tagline:'크롬과 거품이 가득한, 2000년대가 꿈꾸던 미래.',
  def:'2000년 전후의 낙관적인 미래상. 크롬 메탈, 광택, 거품, 형광색으로 "새로운 밀레니엄"의 설렘을 표현했다.',
  feats:['Chrome & Metal','Gloss & Bubbles','Futuristic Optimism','Bold'],
  examples:[
    {site:'Space Jam', url:'https://www.spacejam.com', why:'1996년 그대로 남아 있는 인터넷 초기의 유물.'},
    {site:'Wayback Machine', url:'https://web.archive.org', why:'당시의 Y2K 스타일 사이트를 직접 열람하는 시간여행 도구.'},
  ],
  points:['크롬 그라데이션이 "미래"의 표현 수단이었다.','지금은 역설적으로 과거로 회귀한 트렌드다.'],
  pv:`<div class="pv-label">y2k</div><div style="height:100%;background:linear-gradient(160deg,#F7F8FA,#C7CCD6 60%,#8E97A6);position:relative;overflow:hidden;font-family:var(--sans)"><div style="position:absolute;top:16px;left:16px;font-size:24px;font-weight:800;letter-spacing:-.02em;background:linear-gradient(180deg,#fff,#7c8696);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 1px 1px rgba(255,255,255,.8))">Y2K</div><div style="position:absolute;width:74px;height:74px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#fff,#9AA3B2 60%,#66707F);right:14px;bottom:14px;box-shadow:inset -6px -10px 14px rgba(30,35,45,.35),0 6px 14px rgba(0,0,0,.2)"></div><div style="position:absolute;right:44px;top:18px;font-family:var(--mono);font-size:8px;letter-spacing:.2em;color:#55607A">2000.2.29</div><div style="position:absolute;left:16px;bottom:20px;font-size:9px;color:#4A5468;letter-spacing:.08em;font-weight:600">futuristic · bubbly · chrome</div></div>`,
},
{
  id:'cyberpunk', name:'Cyberpunk', kr:'사이버펑크', cat:'Emotion',
  tagline:'네온이 터지는 디스토피아. 글리치와 광고 홀로그램.',
  def:'고도의 테크놀로지와 몰락한 사회를 그린 장르의 시각. 네온(사이언·마젠타), 어두운 배경, 글리치 텍스트, 사각형 UI를 사용한다.',
  feats:['Neon & Glow','Dark Dystopia','Glitch Effect','HUD Panels'],
  examples:[
    {site:'Cyberpunk 2077', url:'https://www.cyberpunk.net', why:'브랜드 자체가 네온 디스토피아의 세계관을 이룬다.'},
    {site:'Sci-Fi Interfaces', url:'https://scifiinterfaces.com', why:'영화·게임 속 SF UI의 시각을 아카이브한 사이트.'},
  ],
  points:['글로우(발광)가 배경과 분리되는 대비를 만든다.','HUD 요소가 정보 밀도를 높여 장르감을 강화한다.'],
  pv:`<div class="pv-label">cyberpunk</div><div style="background:#0B0A12;height:100%;color:#0FF;font-family:'Helvetica Neue',Arial,sans-serif;padding:20px;position:relative;overflow:hidden"><div style="font-size:26px;font-weight:800;letter-spacing:-.01em;line-height:.95;text-shadow:0 0 12px rgba(0,255,255,.7),0 0 30px rgba(255,0,128,.5)">NIGHT<br>CITY</div><div style="font-size:8px;color:#FF2FA0;margin-top:6px;letter-spacing:.18em;text-shadow:0 0 8px rgba(255,47,160,.8)">// SECTOR 7G</div><div style="position:absolute;right:18px;bottom:16px;width:70px;height:46px;border:1.5px solid #FF2FA0;box-shadow:0 0 14px rgba(255,47,160,.6) inset;display:grid;place-items:center;font-size:8px;letter-spacing:.14em;color:#0FF;text-shadow:0 0 8px rgba(0,255,255,.8)">BOOT</div><div style="position:absolute;left:20px;bottom:16px;font-family:var(--mono);font-size:7px;color:#7a7a9a;letter-spacing:.1em">CYBER-2080 &nbsp;<span style="color:#FF2FA0">&#9671;</span></div></div>`,
},
{
  id:'vaporwave', name:'Vaporwave', kr:'베이퍼웨이브', cat:'Emotion',
  tagline:'보라와 핑크의 노스탤지어. 가상의 과거, 이상적인 80년대.',
  def:'2010년대 초 인터넷 음악 장르에서 시작된 미학. 그리스 조각, 일본어 문자, 3D 격자, 석양, 보라·핑크 그라데이션이 결합한다.',
  feats:['Purple & Pink','Grid & Retro Sun','Nostalgic Futurism','ASCII & Japanese'],
  examples:[
    {site:'Vapor95', url:'https://vapor95.com', why:'사이트 자체가 베이퍼웨이브다 — 네온 그라데이션, 그리드, 로마 조각상을 실제 커머스에 적용한 사례.'},
    {site:'SoundCloud', url:'https://soundcloud.com', why:'베이퍼웨이브 씬이 시작된 음악 플랫폼.'},
  ],
  points:['고전 이미지(조각상)와 미래적 요소(그리드)의 충돌이 핵심이다.','그라데이션의 톤 온 톤이 꿈결 같은 분위기를 만든다.'],
  pv:`<div class="pv-label">vaporwave</div><div style="height:100%;background:linear-gradient(180deg,#2D1B4E 0%,#6B2A6E 45%,#B04A6E 100%);position:relative;overflow:hidden;font-family:var(--sans)"><div style="position:absolute;left:50%;bottom:22%;transform:translateX(-50%);width:86px;height:86px;border-radius:50%;background:linear-gradient(180deg,#FF9A9E,#FF6A88);box-shadow:0 0 30px rgba(255,120,150,.6)"></div><div style="position:absolute;left:0;right:0;bottom:0;height:30%;background:repeating-linear-gradient(90deg,transparent 0 17px,#7A2F8E 17px 18px),repeating-linear-gradient(0deg,transparent 0 17px,#7A2F8E 17px 18px);opacity:.85"></div><div style="position:absolute;top:16px;left:18px;font-size:15px;font-weight:800;letter-spacing:.06em;color:#FFB6C1;text-shadow:0 0 14px rgba(255,180,190,.7)">A E S T H E T I C</div><div style="position:absolute;top:38px;left:18px;font-family:var(--mono);font-size:8px;letter-spacing:.3em;color:#D88AB0">1995 — 2019</div></div>`,
},
{
  id:'scandi', name:'Scandinavian', kr:'스칸디나비아', cat:'Emotion',
  tagline:'빛, 나무, 그리고 따뜻한 최소함.',
  def:'북유럽 디자인의 온건한 미니멀리즘. 밝은 톤의 나무 질감, 세이지·파스텔 컬러, 기능 중심의 배치로 포근하고 실용적인 분위기를 만든다.',
  feats:['Light & Airy','Natural Materials','Function','Hygge Warmth'],
  examples:[
    {site:'IKEA', url:'https://www.ikea.com', why:'스칸디나비아 디자인을 세계에 대중화한 브랜드.'},
    {site:'Muuto', url:'https://www.muuto.com', why:'북유럽 브랜드의 컬러와 소재 미학을 보여주는 사이트.'},
  ],
  points:['밝은 배경과 나무 질감이 실내 온도를 끌어올린다.','디테일을 빼는 것이 아니라 "따뜻하게" 비우는 것이 핵심이다.'],
  pv:`<div class="pv-label">scandinavian</div><div style="background:#F6F4EC;height:100%;font-family:var(--sans);padding:20px 22px;position:relative"><div style="font-size:15px;font-weight:600;color:#3E4A3F">Nordlys</div><div style="font-size:8.5px;color:#9aa391;margin-top:3px;letter-spacing:.06em">LIGHT · WOOD · AIR</div><div style="display:flex;gap:8px;margin-top:14px"><div style="flex:1;background:#D9C9AE;border-radius:6px;height:40px"></div><div style="flex:1;background:#B9C4A8;border-radius:6px;height:40px"></div></div><div style="margin-top:8px;height:7px;width:70%;background:#E7E2D4;border-radius:4px"></div><div style="margin-top:6px;height:7px;width:50%;background:#EFEAE0;border-radius:4px"></div></div>`,
},
{
  id:'jpminimal', name:'Japanese Minimalism', kr:'일본 미니멀리즘', cat:'Emotion',
  tagline:'여백(Ma)과 침묵. 없는 것이 의미가 되는 디자인.',
  def:'일본 미학(間, 侘寂)에 뿌리를 둔 디자인. 넓은 여백, 단일 포인트 색, 절제된 타이포로 정적이고 깊은 분위기를 만든다.',
  feats:['Empty Space (Ma)','Single Accent','Silence','Zen & Nature'],
  examples:[
    {site:'MUJI', url:'https://www.muji.com', why:'여백과 간소함 자체가 브랜드가 된 대표 사례.'},
    {site:'SSENSE', url:'https://www.ssense.com', why:'하이패션 미니멀리즘의 정적이고 미니멀한 카탈로그.'},
  ],
  points:['포인트 색 하나가 화면 전체의 의미를 정한다.','여백이 공허가 아니라 의도적인 침묵일 때 힘이 있다.'],
  pv:`<div class="pv-label">japanese minimal</div><div style="background:#FAF9F6;height:100%;font-family:var(--sans);padding:20px 22px;position:relative"><div style="position:absolute;top:16px;right:20px;width:11px;height:11px;border-radius:50%;background:#C4311B"></div><div style="font-size:9px;letter-spacing:.2em;color:#8a8a85">静寂 · MA</div><div style="font-size:19px;font-weight:500;margin-top:16px;line-height:1.3;color:#222;font-family:'Hiragino Mincho ProN','Noto Serif KR',Georgia,serif">空間の<br>余白</div><div style="width:34px;height:1px;background:#c9c4ba;margin-top:16px"></div><div style="font-size:8.5px;color:#a4a099;margin-top:12px;letter-spacing:.08em">EMPTINESS AS FORM</div></div>`,
},
{
  id:'acid', name:'Acid Graphics', kr:'애시드 그래픽', cat:'Emotion',
  tagline:'레이브의 색, 흐르는 무지개, 반짝이는 PVC.',
  def:'1990년대 레이브 문화에서 시작된 그래픽 스타일. 네온의 원색, 무지개 그라데이션, 글리치·립스틱 질감으로 장난스럽고 과감하다.',
  feats:['Vivid Neons','Rainbow Gradient','PVC Gloss','Anti-design'],
  examples:[
    {site:'Boiler Room', url:'https://boilerroom.tv', why:'레이브 문화와 강렬한 비주얼을 잇는 플랫폼.'},
    {site:'Beatport', url:'https://www.beatport.com', why:'전자음악의 에너지를 컬러로 표현한 상점.'},
  ],
  points:['색을 겹치되 서로를 덮지 않게 배치한다.','기하와 글리치가 "질서 밖"의 감성을 만든다.'],
  pv:`<div class="pv-label">acid graphics</div><div style="height:100%;background:linear-gradient(135deg,#B9FF1F,#FF37E6 50%,#2BE6FF);position:relative;overflow:hidden;font-family:var(--sans)"><div style="position:absolute;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,#FFED57,transparent 65%);left:-14px;top:-14px"></div><div style="position:absolute;width:60px;height:60px;border-radius:50%;border:3px solid #111;right:16px;top:14px;background:rgba(255,255,255,.25)"></div><div style="position:absolute;left:16px;bottom:14px;font-size:20px;font-weight:800;letter-spacing:-.02em;color:#fff;mix-blend-mode:difference;line-height:.95">ACID<br>SLAM</div><div style="position:absolute;right:18px;bottom:16px;width:44px;height:44px;background:#111;color:#B9FF1F;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:700">RAVE</div></div>`,
},
];

const LAYOUTS = [
  { id:'grid', name:'Grid Layout', kr:'그리드', use:'다수의 콘텐츠를 균등하게 배열할 때', desc:'열과 행으로 화면을 나눠 일관된 리듬을 만든다. 가장 기본이 되는 구조로 모든 레이아웃의 토대다.', ex:'google.com',
    wire:`<div class="wire"><div class="w w-pill" data-an="nav"></div><div class="w-row" data-an="cards"><div class="w-col"><div class="w" style="height:54px"></div><div class="w" style="height:54px"></div><div class="w" style="height:54px"></div></div><div class="w-col"><div class="w" style="height:54px"></div><div class="w" style="height:54px"></div><div class="w" style="height:54px"></div></div><div class="w-col"><div class="w" style="height:54px"></div><div class="w" style="height:54px"></div><div class="w" style="height:54px"></div></div></div><span class="w-label">GRID</span></div>` },
  { id:'12col', name:'12 Column Grid', kr:'12단 그리드', use:'디자인 시스템을 설계할 때', desc:'화면을 12개 열로 나눠 콘텐츠가 이 열을 몇 개 차지할지로 폭을 결정한다. 반응형에서 폭 조절이 유연하다.', ex:'material.io',
    wire:`<div class="wire"><div class="w-row" data-an="nav"><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div><div class="w" style="height:16px;flex:1"></div></div><div class="w-row"><div class="w" style="height:54px;flex:8" data-an="main"></div><div class="w-tint" style="height:54px;flex:4" data-an="aside"></div></div><div class="w-row"><div class="w-tint" style="height:54px;flex:3"></div><div class="w" style="height:54px;flex:9"></div></div><div class="w-row"><div class="w" style="height:54px;flex:6"></div><div class="w" style="height:54px;flex:6"></div></div><span class="w-label">12-COL GRID</span></div>` },
  { id:'modular', name:'Modular Grid', kr:'모듈러 그리드', use:'일러스트·캘린더·주간 뷰처럼 셀 단위 콘텐츠', desc:'같은 크기의 모듈이 격자로 반복된다. 각 셀이 독립된 콘텐츠를 담고 일관된 단위로 조합된다.', ex:'notion.so',
    wire:`<div class="wire"><div class="w-row" data-an="cells"><div class="w-col" style="gap:6px"><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div></div><div class="w-col" style="gap:6px"><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div></div><div class="w-col" style="gap:6px"><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div></div><div class="w-col" style="gap:6px"><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div><div class="w" style="height:24px"></div></div></div><span class="w-label">MODULAR</span></div>` },
  { id:'bento', name:'Bento Layout', kr:'벤토', use:'한 화면에 여러 기능·영역을 보여줄 때', desc:'같은 그리드 안에서 셀 크기가 서로 달라지는 도시락(bento) 모양. 허브·대시보드·소개 페이지에 자주 쓰인다.', ex:'apple.com',
    wire:`<div class="wire"><div class="w" style="height:38px" data-an="cta"></div><div class="w-row"><div class="w-col"><div class="w-tint" style="height:66px" data-an="feat"></div><div class="w" style="height:38px"></div></div><div class="w-col" style="flex:1.6"><div class="w" style="height:112px" data-an="hero"></div></div><div class="w-col"><div class="w" style="height:38px"></div><div class="w-tint" style="height:66px" data-an="visual"></div></div></div><span class="w-label">BENTO</span></div>` },
  { id:'masonry', name:'Masonry', kr:'매이슨리', use:'이미지의 높이가 제각각일 때', desc:'열을 유지하면서 각 아이템이 자신의 높이로 흐르는 벽돌 쌓기 레이아웃. 피드·갤러리에 자연스럽다.', ex:'pinterest.com',
    wire:`<div class="wire"><div class="w-row" style="align-items:flex-start"><div class="w-col" style="gap:6px" data-an="col"><div class="w" style="height:48px"></div><div class="w" style="height:30px"></div><div class="w" style="height:42px"></div></div><div class="w-col" style="gap:6px"><div class="w-tint" style="height:32px"></div><div class="w" style="height:50px"></div><div class="w" style="height:28px"></div></div><div class="w-col" style="gap:6px"><div class="w" style="height:44px"></div><div class="w" style="height:32px"></div><div class="w" style="height:48px"></div></div></div><span class="w-label">MASONRY</span></div>` },
  { id:'split', name:'Split Layout', kr:'스플릿', use:'비교·대비·두 서비스를 한 화면에 보여줄 때', desc:'화면을 절반씩 나누어 서로 다른 콘텐츠를 마주 보게 한다. 대비가 강한 주제에 효과적이다.', ex:'stripe.com',
    wire:`<div class="wire"><div class="w-row" style="flex:1"><div class="w-col" style="padding:4px 0;justify-content:center" data-an="left"><div class="w-pill" style="align-self:flex-start"></div><div class="w" style="height:10px;width:70%"></div><div class="w" style="height:10px;width:50%"></div><div class="w" style="height:26px;width:40%;margin-top:8px"></div></div><div style="width:3px;background:var(--line-2)"></div><div class="w-col" style="background:var(--ink);justify-content:center;padding:10px" data-an="right"><div style="height:8px;width:60%;background:#fff;opacity:.45;border-radius:2px"></div><div style="height:8px;width:40%;background:#fff;opacity:.45;border-radius:2px"></div></div></div><span class="w-label">SPLIT</span></div>` },
  { id:'sidebar', name:'Sidebar Layout', kr:'사이드바', use:'앱·대시보드처럼 탐색이 많은 제품', desc:'좌측 고정 내비게이션 + 우측 콘텐츠. 기능이 많을 때 탐색을 항상 노출해 이동 비용을 줄인다.', ex:'notion.so',
    wire:`<div class="wire" style="flex-direction:row"><div data-an="side" style="width:26%;background:var(--line-2);border-radius:var(--r-s);display:flex;flex-direction:column;gap:6px;padding:8px"><div class="w-bar"></div><div class="w" style="height:8px;width:80%"></div><div class="w" style="height:8px;width:60%"></div><div class="w" style="height:8px;width:70%"></div></div><div class="w-col" style="flex:1;justify-content:flex-start" data-an="main"><div class="w" style="height:12px;width:50%"></div><div class="w" style="height:44px"></div><div class="w" style="height:44px"></div></div><span class="w-label">SIDEBAR</span></div>` },
  { id:'dashboard', name:'Dashboard Layout', kr:'대시보드', use:'지표를 한눈에 모니터링할 때', desc:'상단 통계 + 차트 + 표가 그리드로 결합된 운영 화면. 숫자가 시각의 중심이다.', ex:'github.com',
    wire:`<div class="wire"><div class="w" style="height:10px;width:30%"></div><div class="w-row" data-an="kpi"><div class="w-col"><div class="w-tint" style="height:38px"></div></div><div class="w-col"><div class="w" style="height:38px"></div></div><div class="w-col"><div class="w" style="height:38px"></div></div><div class="w-col"><div class="w" style="height:38px"></div></div></div><div class="w-row"><div class="w" style="height:54px;flex:1.2" data-an="charts"></div><div class="w" style="height:54px;flex:1" data-an="table"></div></div><span class="w-label">DASHBOARD</span></div>` },
  { id:'magazine', name:'Magazine Layout', kr:'매거진', use:'이야기·스토리를 장엄하게 전할 때', desc:'헤드라인이 화면을 지배하고, 콘텐츠가 다양한 크기로 흐르는 잡지식 구성. 미디어·브랜드 사이트에 어울린다.', ex:'wired.com',
    wire:`<div class="wire"><div class="w" style="height:60px" data-an="headline"></div><div class="w" style="height:26px;width:55%" data-an="lead"></div><div class="w-row" data-an="cols"><div class="w-col"><div class="w" style="height:34px"></div><div class="w-bar"></div><div class="w-bar"></div><div class="w-bar" style="width:70%"></div></div><div class="w-col" style="gap:6px"><div class="w" style="height:20px"></div><div class="w" style="height:20px"></div></div></div><span class="w-label">MAGAZINE</span></div>` },
  { id:'editorial-ly', name:'Editorial Layout', kr:'에디토리얼', use:'긴 글·인터뷰·리포트를 읽히게 할 때', desc:'비대칭 컬럼과 세리프 타이포로 독서 경험을 디자인한다. 인용구·이미지가 글의 리듬을 나눈다.', ex:'nytimes.com',
    wire:`<div class="wire"><div class="w-row"><div class="w-col" style="flex:1.3;justify-content:flex-start" data-an="body"><div class="w" style="height:34px" data-an="headline"></div><div class="w-bar"></div><div class="w-bar" style="width:80%"></div><div class="w-bar" style="width:90%"></div></div><div class="w-col" style="flex:1"><div class="w" style="height:20px"></div><div class="w-bar"></div><div class="w-bar" style="width:60%"></div></div></div><div class="w" style="height:30px;width:70%" data-an="quote"></div><span class="w-label">EDITORIAL</span></div>` },
  { id:'card', name:'Card Layout', kr:'카드', use:'독립된 단위의 정보(상품·글·기능)를 나열할 때', desc:'정보를 "카드"라는 독립된 단위로 포장해 배치한다. 각 카드는 자기 완결적인 행동을 담는다.', ex:'dribbble.com',
    wire:`<div class="wire"><div class="w-row"><div class="w-col" data-an="card"><div class="w" style="height:52px"></div><div class="w-bar" style="width:80%"></div></div><div class="w-col"><div class="w" style="height:52px"></div><div class="w-bar" style="width:70%"></div></div><div class="w-col"><div class="w" style="height:52px"></div><div class="w-bar" style="width:60%"></div></div></div><div class="w-row"><div class="w-col"><div class="w" style="height:52px"></div><div class="w-bar" style="width:70%"></div></div><div class="w-col"><div class="w" style="height:52px"></div><div class="w-bar" style="width:80%"></div></div><div class="w-col"><div class="w" style="height:52px"></div><div class="w-bar" style="width:65%"></div></div></div><span class="w-label">CARD</span></div>` },
  { id:'timeline', name:'Timeline', kr:'타임라인', use:'시간의 흐름·진행 상황·이력을 보여줄 때', desc:'수직 축 위에 사건을 배치해 순서와 간격을 시각화한다. 로드맵·업데이트 로그·히스토리에 적합하다.', ex:'stripe.com',
    wire:`<div class="wire"><div style="position:absolute;left:26px;top:18px;bottom:18px;width:2px;background:var(--ink)"></div><div style="position:relative;display:flex;flex-direction:column;gap:16px;width:100%"><div class="w-row" data-an="event"><div style="width:16px;height:16px;border-radius:50%;background:var(--acc-500);flex:none;position:relative;z-index:2;margin-left:9px"></div><div class="w-col" style="flex:1"><div class="w" style="height:8px;width:40%"></div><div class="w-bar" style="width:70%"></div></div></div><div class="w-row"><div style="width:16px;height:16px;border-radius:50%;background:var(--ink);flex:none;position:relative;z-index:2;margin-left:9px"></div><div class="w-col" style="flex:1"><div class="w" style="height:8px;width:32%"></div><div class="w-bar" style="width:60%"></div></div></div><div class="w-row"><div style="width:16px;height:16px;border-radius:50%;background:var(--ink);flex:none;position:relative;z-index:2;margin-left:9px"></div><div class="w-col" style="flex:1"><div class="w" style="height:8px;width:26%"></div><div class="w-bar" style="width:50%"></div></div></div></div><span class="w-label">TIMELINE</span></div>` },
  { id:'fpattern', name:'F Pattern', kr:'F 패턴', use:'텍스트 중심의 뉴스·블로그 목록', desc:'사람의 읽기 습관(F자: 위에서 아래, 왼쪽에서 오른쪽)을 따르는 배치. 헤드라인·본문이 F형으로 강조된다.', ex:'nytimes.com',
    wire:`<div class="wire"><div class="w" style="height:12px;width:52%" data-an="title"></div><div class="w" style="height:8px;width:30%;margin-top:8px" data-an="lines"></div><div class="w" style="height:42px;margin-top:8px" data-an="media"></div><div class="w" style="height:8px;width:24%;margin-top:8px"></div><div class="w" style="height:34px;margin-top:8px"></div><div class="w" style="height:8px;width:18%;margin-top:8px"></div><span class="w-label">F-PATTERN</span></div>` },
  { id:'zpattern', name:'Z Pattern', kr:'Z 패턴', desc:'시선이 좌상단 → 우상단 → 대각선 → 좌하단 → 우하단으로 흐르는 배치. 랜딩페이지의 눈 흐름을 유도한다.', use:'랜딩페이지에서 시선 흐름을 유도할 때', ex:'apple.com',
    wire:`<div class="wire"><div class="w-row" data-an="header"><div class="w" style="height:10px;width:20%"></div><div class="w-pill" style="margin-left:auto"></div></div><div data-an="center" style="flex:1;display:grid;place-items:center;border:2px dashed var(--line-2);border-radius:var(--r-s)"><div class="w" style="height:34px;width:60%"></div></div><div class="w-row"><div class="w" style="height:10px;width:14%"></div><div class="w-tint" data-an="cta" style="height:12px;width:12%;border-radius:999px;margin-left:auto"></div></div><span class="w-label">Z-PATTERN</span></div>` },
];

const FONTS = [
  { name:'Serif', en:'세리프', sample:'Quiet luxury', desc:'선(line)이 달린 활자. 고전·권위·에디토리얼의 분위기를 낸다.', feels:['Luxury','Editorial','Trust','Classic'] },
  { name:'Sans Serif', en:'산세리프', sample:'Modern product', desc:'장식 없는 단순한 활자. 현대적이고 기술적이며 중립적이다.', feels:['Modern','Technology','Neutral','Clean'] },
  { name:'Monospace', en:'모노스페이스', sample:'const design = 1;', desc:'모든 글자의 폭이 같은 활자. 코드·데이터·기술 문서의 분위기를 낸다.', feels:['Developer','Code','Technical','Precise'] },
];
const TERMS = [
  { name:'Kerning', kr:'커닝', desc:'특정 글자 쌍(AV, To) 사이의 간격을 개별 조정하는 것. 로고나 헤드라인에서 중요하다.', type:'kerning' },
  { name:'Tracking', kr:'트래킹', desc:'문자 전체의 자간을 균등하게 넓히거나 좁히는 것. 대문자나 라벨에서 넓게 쓰면 격식이 생긴다.', type:'tracking' },
  { name:'Leading', kr:'행간', desc:'줄과 줄 사이의 수직 간격. 행간이 타이포그래피의 숨 쉬는 속도를 결정한다.', type:'leading' },
  { name:'Baseline', kr:'베이스라인', desc:'글자가 "앉아 있는" 기준선. 대부분 글자의 하단이 맞닿는 가상의 선이다.', type:'baseline' },
  { name:'Cap Height', kr:'캡 하이트', desc:'대문자(Cap)의 높이. 헤드라인에서 소문자의 x-하이트와 함께 시각 균형을 좌우한다.', type:'capheight' },
  { name:'X Height', kr:'엑스 하이트', desc:'소문자 x의 높이. x-하이트가 크면 작은 크기에서도 가독성이 좋다.', type:'xheight' },
];
const TYPE_COMPARE = [
  { label:'Display — Grotesk', sub:'Space Grotesk · Bold', cls:'t1' },
  { label:'Serif — Editorial', sub:'Georgia / Noto Serif', cls:'t2' },
  { label:'Mono — Technical', sub:'JetBrains Mono', cls:'t3' },
  { label:'Sans — Body', sub:'Pretendard · Regular', cls:'t4' },
  { label:'Letterspaced — Caps', sub:'Grotesk · 0.22em', cls:'t5' },
  { label:'Italic — Voice', sub:'Georgia · Italic', cls:'t6' },
];

const COLORS = [
  { name:'Monochrome', kr:'모노크롬', desc:'한 색조의 밝기 단계만 사용. 가장 안전하고 격조 있는 선택이다.', use:'기업·문서·사진 위주의 사이트', swatches:['#111','#333','#555','#777','#999','#bbb','#ddd','#f2f2f2'] },
  { name:'Analogous', kr:'유사색', desc:'색상환에서 이웃한 색 3개. 조화롭고 부드러운 분위기를 만든다.', use:'브랜드의 따뜻하거나 차가운 톤을 정할 때', swatches:['#0B5D4E','#0E7C5B','#12A879','#2BC58B','#6ADBAE'], grad:'linear-gradient(120deg,#0B5D4E,#0E7C5B,#12A879,#2BC58B,#6ADBAE)' },
  { name:'Complementary', kr:'보색', desc:'색상환에서 정반대 색 2개. 가장 강한 대비로, "진동"하는 듯한 에너지를 만든다.', use:'주목을 끄는 CTA나 강조 구역', swatches:['#0E4EA2','#F5B800'], grad:'linear-gradient(120deg,#0E4EA2 0 45%,#F5B800 45% 55%,#0E4EA2 55%)' },
  { name:'Accent Color', kr:'액센트 컬러', desc:'중립 팔레트 위에 단 하나의 강조색. 화면 전체의 5~12%만 쓰는 것이 원칙이다.', use:'버튼·링크·활성 상태·포커스', swatches:['#16161A','#3E3E46','#6E6E77','#E9E9E6','#FF4D00'] },
  { name:'Neutral Palette', kr:'뉴트럴 팔레트', desc:'채도가 없는 회색·베이지·쿨그레이의 온도로 구성. 온도(따뜻함·차가움)가 분위기를 결정한다.', use:'문서·대시보드·전자상거래의 기본 뼈대', swatches:['#1C1C1F','#3A3A40','#5C5C64','#8A8A92','#B9B9C0','#DCDCE0','#F1F1F3','#FAFAFB'] },
  { name:'Gradient', kr:'그라데이션', desc:'두 색 이상이 부드럽게 이어지는 천이. 면에 깊이와 방향을 준다.', use:'브랜드 키 비주얼·버튼 배경·배너', swatches:['#FF4D00','#FF8A00'], grad:'linear-gradient(120deg,#FF4D00,#FF8A00)' },
  { name:'Gradient Mesh', kr:'그라데이션 메시', desc:'여러 색이 불규칙하게 번지는 직물 같은 천이. 현대 브랜딩의 부드러운 배경으로 많이 쓰인다.', use:'배경·키 비주얼·반투명 오버레이', swatches:['#2B1055','#7597DE'], mesh:true },
];

const UI_PATTERNS = {
  Navigation:[
    { name:'Navbar', why:'사이트 전역 탐색의 표준', desc:'로고, 메뉴, CTA가 한 줄에. 모바일에선 햄버거로 수축한다.', html:`<div class="mini-nav"><span class="mn-logo">acme</span><a class="on">Home</a><a>Work</a><a>About</a><a>Contact</a><span class="mn-cta">Get Started</span></div>` },
    { name:'Sidebar', why:'깊은 탐색 구조의 앱', desc:'항상 보이는 좌측 내비게이션. 스크린이 좁으면 접힌다.', html:`<div class="mini-side"><span class="ms-logo">App</span><a><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Dashboard</a><a class="on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19V5m0 14h16m-9-6v4m4-8v8m-8-4v4"/></svg>Analytics</a><a><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M19.1 4.9 17 7m-10 10-2.1 2.1"/></svg>Settings</a></div>` },
    { name:'Tab', why:'동일 깊이의 콘텐츠 전환', desc:'섹션을 탭으로 나눠 상태를 유지하며 전환한다.', html:`<div><div class="mini-tabs"><button class="on">Overview</button><button>Analytics</button><button>Reports</button></div><div class="mini-tabcontent">Overview — 대시보드 요약</div></div>`, init:true },
    { name:'Breadcrumb', why:'깊은 페이지의 위치 표시', desc:'현재 위치가 홈에서 몇 단계 떨어졌는지 경로로 보여준다.', html:`<div class="mini-crumb"><a>Home</a><span class="sep">/</span><a>Products</a><span class="sep">/</span><a>Categories</a><span class="sep">/</span><span class="cur">Design Tools</span></div>` },
    { name:'Drawer', why:'모바일의 숨은 메뉴', desc:'스크린 밖에서 슬라이드로 들어오는 메뉴. 배경을 어둡게 해 집중을 유도한다.', html:`<div class="mini-drawer-stage"><button class="btn-sm" data-open-drawer>☰ Open</button><div class="mini-drawer"><b>Menu</b><a>Home</a><a>Work</a><a>About</a><a>Contact</a></div><div class="mini-drawer-overlay"></div></div>`, init:true },
  ],
  Content:[
    { name:'Card', why:'독립 정보 단위', desc:'이미지·제목·설명·행동이 하나의 카드로 묶인다.', html:`<div class="card-widget"><div class="cw-img"></div><div class="cw-body"><h4>Design Systems 101</h4><p>컴포넌트와 토큰으로 일관성을 만드는 법.</p><div class="cw-tags"><span>Guide</span><span>12 min</span></div></div></div>` },
    { name:'Table', why:'정렬·비교가 필요한 데이터', desc:'행을 클릭하면 정렬된다. 정량 데이터의 표준.', html:`<table class="mini-table"><thead><tr><th data-k="name">Project <span class="dir"></span></th><th data-k="status">Status</th><th data-k="count">Tasks</th></tr></thead><tbody><tr><td>Rocket UI</td><td>Active</td><td>42</td></tr><tr><td>Bento Site</td><td>Review</td><td>17</td></tr><tr><td>Type Lab</td><td>Done</td><td>9</td></tr><tr><td>Color Sys</td><td>Active</td><td>31</td></tr></tbody></table>`, init:true },
    { name:'Timeline', why:'시간 순서의 시각화', desc:'마일스톤과 진행 상태를 세로로 배치한다.', html:`<div class="mini-timeline"><div class="mt-item done"><b>Kickoff</b><span>Week 1</span></div><div class="mt-item done"><b>Design</b><span>Week 2</span></div><div class="mt-item"><b>Develop</b><span>Week 3</span></div><div class="mt-item"><b>Launch</b><span>Week 4</span></div></div>` },
    { name:'Kanban', why:'상태를 단계로 나눠 관리', desc:'카드를 클릭하면 다음 단계로 이동한다. 진행 흐름을 한눈에.', html:`<div class="kanban"><div class="kb-col"><h5>Todo <i>3</i></h5><div class="kb-card"><span class="kb-tag" style="background:#FF4D00"></span>Analysis</div><div class="kb-card"><span class="kb-tag" style="background:#FF4D00"></span>Sketch</div><div class="kb-card"><span class="kb-tag" style="background:#FF4D00"></span>Prototype</div></div><div class="kb-col"><h5>Doing <i>1</i></h5><div class="kb-card"><span class="kb-tag" style="background:#F5B800"></span>Design</div></div><div class="kb-col"><h5>Done <i>1</i></h5><div class="kb-card"><span class="kb-tag" style="background:#12A879"></span>Ship</div></div></div>`, init:true },
    { name:'Carousel', why:'여러 콘텐츠를 한 공간에', desc:'화살표 또는 자동 전환으로 슬라이드를 넘긴다.', html:`<div class="carousel"><div class="cs-track"><div class="cs-slide">01 · Grid</div><div class="cs-slide">02 · Swiss</div><div class="cs-slide">03 · Bento</div><div class="cs-slide">04 · Brutal</div></div><div class="cs-dots"><i class="on"></i><i></i><i></i><i></i></div><div class="cs-nav"><button data-cs="prev">‹</button><button data-cs="next">›</button></div></div>`, init:true },
  ],
  Feedback:[
    { name:'Modal', why:'중요 결정의 분리된 맥락', desc:'배경을 잠그고 중심에 대화상자를 띄운다. 결과를 확인해야 넘어간다.', html:`<div style="display:grid;place-items:center;gap:10px"><button class="btn btn-primary btn-sm" data-open-modal>작업 삭제</button><div class="mini-modal" hidden><h4>정말 삭제할까요?</h4><p>이 작업은 되돌릴 수 없습니다. 프로젝트의 모든 데이터가 사라집니다.</p><div class="row"><button class="btn-sm" data-close-modal>취소</button><button class="btn-sm" style="background:var(--err);color:var(--surface)" data-close-modal>삭제</button></div></div></div>`, init:true },
    { name:'Toast', why:'짧은 확인·상태 피드백', desc:'화면 하단에서 잠깐 떴다가 사라지는 알림. 행동을 방해하지 않는다.', html:`<div class="mini-toasts"><button class="btn btn-sm" data-toast="저장되었습니다">저장</button><button class="btn btn-ghost btn-sm" data-toast="항목이 삭제되었습니다">삭제</button><button class="btn btn-ghost btn-sm" data-toast="오프라인 상태입니다">연결 끊김</button><div class="toast"><span class="t-ico">✓</span>저장되었습니다</div></div>`, init:true },
    { name:'Tooltip', why:'요소의 부가 설명', desc:'마우스를 올리면 짧은 설명이 나타난다. 정보를 화면 밖으로 밀어낸다.', html:`<div class="tooltip-wrap"><button class="btn btn-ghost btn-sm">Hover me</button><span class="tip">이 버튼은 데이터를 내보냅니다</span></div>` },
    { name:'Alert', why:'상태를 즉시 알리는 배너', desc:'유형(정보·성공·경고·오류)에 따라 색과 아이콘이 정해진다.', html:`<div style="display:flex;flex-direction:column;gap:6px;width:100%"><div class="alert alert-info">ℹ 연결 상태를 확인하세요.<button class="a-x" data-alert-close>✕</button></div><div class="alert alert-success">✓ 변경 사항이 저장되었습니다.<button class="a-x" data-alert-close>✕</button></div><div class="alert alert-warn">⚠ 저장 공간이 거의 가득 찼습니다.<button class="a-x" data-alert-close>✕</button></div><div class="alert alert-error">✕ 요청이 실패했습니다.<button class="a-x" data-alert-close>✕</button></div></div>` },
  ],
  Input:[
    { name:'Search', why:'정보 탐색의 진입점', desc:'입력하면 아래 결과가 실시간으로 필터링된다.', html:`<div class="mini-search"><input placeholder="스타일 검색…  brutal" aria-label="스타일 검색 데모" data-ms><div class="ms-list"><button>Brutalism</button><button>Neo-Brutalism</button><button>Swiss Style</button><button>Memphis</button></div></div>`, init:true },
    { name:'Form', why:'구조화된 데이터 입력', desc:'필수 입력을 검증하고 오류·성공 메시지를 보여준다. 라벨은 항상 필드 위에.', html:`<form class="mini-form"><label>이메일</label><input type="email" placeholder="you@design.dev" aria-label="이메일 입력 데모" data-femail><div class="f-msg"></div><button class="btn btn-sm" type="submit">구독하기</button></form>`, init:true },
    { name:'Date Picker', why:'날짜 선택의 표준', desc:'달력에서 날짜를 고른다. 오늘 날짜가 강조 표시된다.', html:`<div class="mini-date"><input readonly data-cal-input aria-label="날짜 선택 데모" placeholder="날짜 선택…"><div class="cal"><div class="cal-head"><button data-cal="prev">‹</button><b data-cal-label></b><button data-cal="next">›</button></div><div class="cal-grid"></div></div></div>`, init:true },
    { name:'Stepper', why:'숫자 입력 + 진행 단계', desc:'수량을 조절하고 진행 단계를 시각화한다.', html:`<div class="mini-stepper"><div class="stp"><b>수량</b><div class="stp-btns"><button data-stp="dec">−</button><span class="val" data-stp-val>1</span><button data-stp="inc">+</button></div></div><div class="stp-bar"><i class="on"></i><i class="done"></i><i></i></div><div class="stp-labels"><span>정보</span><span>결제</span><span>완료</span></div></div>`, init:true },
  ],
};

const ANALYZER = {
  questions:[
    { key:'layout', title:'Layout', en:'레이아웃은?', opts:[
      {label:'Grid', tags:['grid','bento','card']},
      {label:'Bento', tags:['bento']},
      {label:'Magazine', tags:['editorial','magazine','grid']},
      {label:'Split', tags:['split']},
      {label:'Masonry', tags:['masonry']},
      {label:'Dashboard', tags:['dashboard','grid','card']},
      {label:'Timeline', tags:['timeline']},
    ]},
    { key:'style', title:'Style', en:'스타일은?', opts:[
      {label:'Minimal', tags:['minimal','jpminimal','scandi']},
      {label:'Brutal', tags:['brutal','neobrutal']},
      {label:'Glass', tags:['glass','fluent']},
      {label:'Swiss', tags:['swiss','bauhaus']},
      {label:'Playful', tags:['memphis','acid','clay','corp-memphis']},
      {label:'Luxury', tags:['luxury','artdeco']},
      {label:'Dark/Neon', tags:['cyberpunk','vaporwave']},
    ]},
    { key:'type', title:'Typography', en:'타이포는?', opts:[
      {label:'Serif', tags:['luxury','artdeco','editorial']},
      {label:'Sans', tags:['minimal','swiss','corporate','scandi']},
      {label:'Mono', tags:['cyberpunk','retro']},
      {label:'Display/Bold', tags:['brutal','neobrutal','acid']},
    ]},
    { key:'color', title:'Color', en:'컬러는?', opts:[
      {label:'Monochrome', tags:['minimal','jpminimal','scandi','corporate','luxury']},
      {label:'Accent', tags:['swiss','bauhaus','corp-memphis','minimal']},
      {label:'Pastel', tags:['clay','memphis','scandi','glass']},
      {label:'Neon', tags:['cyberpunk','vaporwave','acid']},
      {label:'Gradient', tags:['glass','vaporwave','y2k','acid']},
    ]},
    { key:'purpose', title:'Purpose', en:'목적은?', opts:[
      {label:'Landing', tags:['minimal','brutal','swiss','split','zpattern']},
      {label:'Dashboard', tags:['dashboard','grid','corporate','sidebar']},
      {label:'Portfolio', tags:['minimal','editorial','masonry','bento']},
      {label:'Store', tags:['corporate','scandi','card','minimal']},
      {label:'Content/News', tags:['editorial','fpattern','magazine','timeline']},
      {label:'Brand Site', tags:['luxury','artdeco','acid','cyberpunk']},
    ]},
  ],
};
const HERO_STAGES = { minimal:'Minimalism', swiss:'Swiss Style', brutal:'Brutalism', glass:'Glassmorphism' };

/* ============================================================
    PRINCIPLES (BAD/GOOD) + GESTALT — REAL UI EXAMPLES
    ============================================================ */
const PRINCIPLES=[
{id:'hierarchy',name:'Visual Hierarchy',en:'시각 위계',def:'중요한 것이 먼저 보이게 크기·두께·색으로 순서를 만든다. 랜딩 페이지의 첫 3초를 결정한다.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:20px"><div style="font-family:var(--disp);font-size:18px;font-weight:500;color:var(--ink);margin-bottom:8px">Introducing Acme</div><p style="font-size:15px;line-height:1.6;color:var(--ink);margin-bottom:12px">We build tools for designers. Our platform helps you create beautiful interfaces faster than ever before.</p><div style="background:var(--ink);color:var(--bg);font-size:14px;font-weight:500;padding:10px 18px;border-radius:6px;width:fit-content">Get Started</div></div></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:20px"><div style="font-family:var(--disp);font-size:36px;font-weight:700;letter-spacing:-.02em;line-height:1.1;margin-bottom:12px">Design tools<br>that get out<br>of your way.</div><p style="font-size:17px;line-height:1.65;color:var(--ink-2);max-width:70%;margin-bottom:20px">Acme helps you ship interfaces 3x faster. No handoff friction. Real components in code.</p><div style="display:flex;gap:10px"><div style="background:var(--ink);color:var(--bg);font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px">Start Free</div><div style="background:transparent;border:1px solid var(--ink);color:var(--ink);font-size:15px;font-weight:500;padding:12px 24px;border-radius:8px">Watch Demo</div></div></div></div>`,
badNote:'모든 텍스트가 비슷한 크기 — 어디부터 읽어야 할지 모른다. CTA가 묻혀 있다.',
goodNote:'제목(36px) → 부제(17px) → CTA. 크기·두께·배치로 읽는 순서를 강제한다.',
badChanges:['Heading size 18px → 36px (2x)','Body 15px → 17px, 색 연하게','CTA 단일 → Primary + Secondary','Visual weight 집중: 제목이 화면 지배'],
goodChanges:['제목이 화면을 지배 — 3초 안에 메시지 전달','본문은 연한 색으로 보조 역할 명시','Primary CTA만 진한 배경 — 행동 유도 명확']},
{id:'whitespace',name:'White Space',en:'여백',def:'요소 사이의 빈 공간. 여백이 정보의 소속과 중요도를 말해준다. 빼는 것이 더하는 것보다 어렵다.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${'<div style="background:var(--surface);border:1px solid var(--line-2);border-radius:8px;padding:14px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">Analytics</div><p style="font-size:11px;color:var(--ink-2);line-height:1.5">Track your metrics in real time</p><span style="font-size:10px;color:var(--acc-text)">View dashboard →</span></div>'.repeat(4)}</div></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:24px;display:grid;grid-template-columns:repeat(2,1fr);gap:24px">${'<div style="background:var(--surface);border:1px solid var(--line-2);border-radius:12px;padding:20px;display:flex;flex-direction:column"><div style="font-size:15px;font-weight:600;margin-bottom:10px">Analytics</div><p style="font-size:13px;color:var(--ink-2);line-height:1.6;flex:1">Track your metrics in real time with automated alerts</p><span style="font-size:11px;color:var(--acc-text);margin-top:14px">View dashboard →</span></div>'.repeat(2)}</div></div>`,
badNote:'간격이 너무 좁아 카드끼리 부딪힌다. 그룹 구분이 안 된다.',
goodNote:'카드 내부 20px, 카드 사이 24px, 섹션 외곽 24px. 3단계 여백으로 그룹을 명확히.',
badChanges:['Padding 14px → 20px (내부)','Gap 8px → 24px (카드 사이)','Section padding 16px → 24px','카드 수 4개 → 2개 (집중도)'],
goodChanges:['내부 여백 확대 — 콘텐츠가 숨 쉰다','카드 간격 3배 — 그룹 분리 명확','카드 수 절반 — 선택 장애 방지','시각적 무게 중심이 카드 하나에 집중']},
{id:'contrast',name:'Contrast',en:'대비',def:'차이를 명확히 드러내 눈에 띄게 만든다. 대비는 글자만의 문제가 아니다. 색·크기·질감으로도 만든다. 접근성의 첫 조건이기도 하다.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:28px;background:#1A1A2E;color:#8B8BA6;display:flex;flex-direction:column;align-items:center;text-align:center"><div style="font-family:var(--disp);font-size:28px;font-weight:600;margin-bottom:10px">Upgrade to Pro</div><p style="font-size:14px;line-height:1.6;max-width:60%;margin-bottom:18px">Unlock unlimited projects, team collaboration, and advanced analytics.</p><div style="background:#2A2A4A;border:1px solid #3A3A5A;color:#A0A0B8;font-size:14px;font-weight:500;padding:12px 28px;border-radius:8px">Upgrade Now</div></div></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:28px;background:#0F0F1A;color:#fff;display:flex;flex-direction:column;align-items:center;text-align:center"><div style="font-family:var(--disp);font-size:32px;font-weight:700;letter-spacing:-.01em;margin-bottom:12px">Upgrade to Pro</div><p style="font-size:15px;line-height:1.7;color:#B8B8CC;max-width:60%;margin-bottom:20px">Unlock unlimited projects, team collaboration, and advanced analytics.</p><div style="background:linear-gradient(135deg,#C43C00,#A83400);color:var(--acc-ink);font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;box-shadow:0 4px 20px rgba(255,77,0,.4)">Upgrade Now</div></div></div>`,
badNote:'배경보다 살짝 밝은 회색 텍스트(4.5:1 미달). 버튼도 배경과 구분이 안 된다.',
goodNote:'흰 텍스트/검정 배경(21:1). CTA는 흰 글씨가 4.5:1을 넘는 주황 단계를 쓴다 — 밝은 주황(#FF4D00)에 흰 글씨는 3.33:1로 미달이다.',
badChanges:['Text 색 #8B8BA6 → #FFFFFF (21:1)','Body 색 #8B8BA6 → #B8B8CC (7:1)','버튼 배경 회색 → 주황 그라데이션','버튼 텍스트 연한 회색 → 흰색'],
goodChanges:['본문 대비 4.5:1 → 7:1 (AAA)','버튼 대비 2.1:1 → 5.3:1 (AA 통과)','그라데이션으로 입체감 + 주목도','포커스 상태도 대비 확보 필요']},
{id:'alignment',name:'Alignment',en:'정렬',def:'요소를 공통된 기준선에 맞춘다. 눈이 따라갈 수 있는 질서를 만든다. 대시보드·폼에서 특히 중요하다.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:20px;background:var(--surface)"><div style="display:flex;gap:12px;margin-bottom:16px"><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:4px">Full Name</label><input style="width:100%;padding:10px 12px;border:1px solid var(--line-2);border-radius:6px;font-size:14px" placeholder="John Doe" aria-label="Full Name"></div><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:4px">Email</label><input style="width:100%;padding:10px 12px;border:1px solid var(--line-2);border-radius:6px;font-size:14px;margin-top:8px" placeholder="john@acme.com" aria-label="Email"></div></div><div style="display:flex;gap:12px;margin-bottom:16px"><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:4px">Company</label><input style="width:100%;padding:10px 12px;border:1px solid var(--line-2);border-radius:6px;font-size:14px;margin-top:-4px" placeholder="Acme Inc" aria-label="Company"></div><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:4px">Role</label><select style="width:100%;padding:10px 12px;border:1px solid var(--line-2);border-radius:6px;font-size:14px;margin-top:12px"><option>Designer</option><option>Developer</option></select></div></div><div style="display:flex;justify-content:flex-end"><button style="background:var(--ink);color:var(--bg);padding:10px 20px;border-radius:6px;font-weight:600">Create Account</button></div></div></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:20px;background:var(--surface)"><div style="display:flex;flex-direction:column;gap:16px"><div style="display:flex;gap:12px"><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:6px">Full Name</label><input style="width:100%;padding:12px;border:1px solid var(--line-2);border-radius:8px;font-size:14px" placeholder="John Doe" aria-label="Full Name"></div><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:6px">Email</label><input style="width:100%;padding:12px;border:1px solid var(--line-2);border-radius:8px;font-size:14px" placeholder="john@acme.com" aria-label="Email"></div></div><div style="display:flex;gap:12px"><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:6px">Company</label><input style="width:100%;padding:12px;border:1px solid var(--line-2);border-radius:8px;font-size:14px" placeholder="Acme Inc" aria-label="Company"></div><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:6px">Role</label><select style="width:100%;padding:12px;border:1px solid var(--line-2);border-radius:8px;font-size:14px"><option>Designer</option><option>Developer</option></select></div></div><div style="display:flex;justify-content:flex-end;margin-top:8px"><button style="background:var(--ink);color:var(--bg);padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Create Account</button></div></div></div></div>`,
badNote:'라벨·인풋 높이가 제각각. 왼쪽 기준선이 들쑥날쑥 — 정돈돼 보이지 않는다.',
goodNote:'모든 필드: 라벨 11px + 6px gap + 인풋 44px 높이. 왼쪽 기준선 하나로 전체가 질서 있다.',
badChanges:['Label margin 불일치 → 일관된 6px','Input padding 10px → 12px (44px 높이)','Select margin-top 들쑥날쑥 → 동일','Button padding 10/20 → 12/24 (맞춤)'],
goodChanges:['왼쪽 기준선 단일화 — 눈의 이동 경로 최소화','모든 필드 동일한 44px 터치 타겟','라벨-인풋 간격 시스템화','모바일에서도 정렬 유지']},
{id:'balance',name:'Balance',en:'균형',def:'양쪽의 시각적 무게를 맞춘다. 대칭일 필요는 없고, 균형이면 된다. 히어로 레이아웃에서 빛을 발한다.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:24px;display:flex;gap:32px;align-items:center"><div style="flex:1"><div style="font-family:var(--disp);font-size:32px;font-weight:700;line-height:1.1;margin-bottom:16px">Build better products, faster.</div><p style="font-size:16px;line-height:1.7;color:var(--ink-2);margin-bottom:24px">Acme gives you the components, tokens, and workflows to ship consistent interfaces at scale.</p><div style="display:flex;gap:12px"><button style="background:var(--ink);color:var(--bg);padding:12px 24px;border-radius:8px;font-weight:600">Start Free</button><button style="background:transparent;border:1px solid var(--ink);color:var(--ink);padding:12px 24px;border-radius:8px;font-weight:500">Learn More</button></div></div><div style="flex:1;background:var(--line-2);border-radius:12px;min-height:200px"></div></div></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:24px;display:flex;gap:48px;align-items:center"><div style="flex:1"><div style="font-family:var(--disp);font-size:36px;font-weight:700;letter-spacing:-.02em;line-height:1.1;margin-bottom:18px">Build better products,<br>faster.</div><p style="font-size:17px;line-height:1.7;color:var(--ink-2);max-width:80%;margin-bottom:28px">Acme gives you the components, tokens, and workflows to ship consistent interfaces at scale.</p><div style="display:flex;gap:12px"><button style="background:var(--ink);color:var(--bg);padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px">Start Free</button><button style="background:transparent;border:1px solid var(--ink);color:var(--ink);padding:14px 28px;border-radius:8px;font-weight:500;font-size:15px">Learn More</button></div></div><div style="flex:1;background:linear-gradient(135deg,var(--acc-100),var(--acc-500));border-radius:16px;min-height:240px;display:grid;place-items:center;font-family:var(--mono);font-size:11px;color:var(--acc-700);letter-spacing:.1em">Hero Visual / Illustration</div></div></div>`,
badNote:'왼쪽 텍스트만 무겁고 오른쪽 빈 박스는 가볍다. 시각적 무게가 한쪽으로 치우침.',
goodNote:'텍스트 무게(제목 36px Bold + 본문) ≈ 비주얼 무게(그라데이션 일러스트). 비대칭이지만 균형 잡힘.',
badChanges:['제목 32px → 36px (무게 증가)','Gap 32px → 48px (여유)','우측 단순 회색 박스 → 그라데이션 비주얼','CTA padding 12/24 → 14/28'],
goodChanges:['텍스트 시각적 무게 ≈ 비주얼 무게','Gap 확대 — 숨 쉴 공간 확보','비주얼에 의미(그라데이션) 부여','버튼 크기 통일로 균형감']},
{id:'proximity',name:'Proximity',en:'근접성',def:'가까이 있는 것끼리 한 그룹으로 묶인다. 거리가 관계를 말한다. 폼 필드 그룹핑의 핵심.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:20px;background:var(--surface)"><div style="display:flex;flex-direction:column;gap:12px">${'<div style="display:flex;gap:12px"><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:4px">Field</label><input style="width:100%;padding:10px 12px;border:1px solid var(--line-2);border-radius:6px;font-size:14px" aria-label="Field"></div><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:4px">Field</label><input style="width:100%;padding:10px 12px;border:1px solid var(--line-2);border-radius:6px;font-size:14px" aria-label="Field"></div></div>'.repeat(3)}</div></div></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:20px;background:var(--surface)"><div style="display:flex;flex-direction:column;gap:24px"><div style="padding:16px;background:var(--wash);border-radius:10px"><div style="font-family:var(--disp);font-size:13px;font-weight:600;color:var(--acc-text);margin-bottom:12px;letter-spacing:.06em">Account</div><div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;gap:12px"><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:4px">Email</label><input style="width:100%;padding:12px;border:1px solid var(--line-2);border-radius:8px;font-size:14px" aria-label="Email"></div><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:4px">Password</label><input style="width:100%;padding:12px;border:1px solid var(--line-2);border-radius:8px;font-size:14px" type="password" aria-label="비밀번호"></div></div></div></div><div style="padding:16px;background:var(--wash);border-radius:10px"><div style="font-family:var(--disp);font-size:13px;font-weight:600;color:var(--acc-text);margin-bottom:12px;letter-spacing:.06em">Profile</div><div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;gap:12px"><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:4px">Name</label><input style="width:100%;padding:12px;border:1px solid var(--line-2);border-radius:8px;font-size:14px" aria-label="Name"></div><div style="flex:1"><label style="font-size:11px;color:var(--ink-3);display:block;margin-bottom:4px">Role</label><select style="width:100%;padding:12px;border:1px solid var(--line-2);border-radius:8px;font-size:14px"><option>Designer</option></select></div></div></div></div><div style="display:flex;justify-content:flex-end;margin-top:8px"><button style="background:var(--ink);color:var(--bg);padding:12px 24px;border-radius:8px;font-weight:600">Save Changes</button></div></div></div></div>`,
badNote:'모든 필드가 같은 간격 — 그룹이 없다. 6개 필드가 한 덩어리로 보인다.',
goodNote:'Account(2필드) / Profile(2필드) 그룹으로 분리. 그룹 간 24px, 그룹 내 12px. 라벨로 그룹 명명.',
badChanges:['단일 간격 12px → 그룹 내 12px / 그룹 간 24px','필드 6개 무구분 → 2그룹(Account/Profile)','그룹 헤더 추가 — 의미 명시','배경 wash로 그룹 영역 시각화'],
goodChanges:['관련 필드끼리 근접 — 인지 부하 감소','그룹 라벨로 스캐닝 용이','시각적 계층: 섹션 > 그룹 > 필드','폼 완료율 향상 근거']},
{id:'emphasis',name:'Emphasis',en:'강조',def:'한 가지를 두드러지게 해 나머지를 배경으로 만든다. CTA 계층 설계의 핵심이다.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:24px;display:flex;flex-direction:column;gap:12px;align-items:center">${'<button style="background:var(--ink);color:var(--bg);padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">Primary Action</button>'.repeat(4)}</div></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:24px;display:flex;flex-direction:column;gap:12px;align-items:center"><button style="background:var(--acc-fill);color:var(--acc-ink);padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;box-shadow:0 4px 16px -4px var(--acc-600)">Primary — Start Free</button><button style="background:transparent;border:1px solid var(--ink);color:var(--ink);padding:14px 32px;border-radius:8px;font-weight:500;font-size:15px">Secondary — View Demo</button><button style="background:transparent;color:var(--ink-2);padding:14px 32px;font-weight:500;font-size:14px;border:1px solid transparent">Tertiary — Learn More</button><button style="background:transparent;color:var(--ink-3);padding:14px 32px;font-weight:400;font-size:13px;border:1px solid transparent">Ghost — Skip for now</button></div></div>`,
badNote:'전부 강조하면 강조가 없다. 4개 모두 같은 Primary 스타일 — 사용자가 망설인다.',
goodNote:'Primary(주황 Fill) → Secondary(Outline) → Tertiary(Text) → Ghost. 한 번에 하나만 눈에 들어옴.',
badChanges:['4개 모두 Primary Fill → 4단계 계층','Primary: 주황 Fill + Shadow','Secondary: Outline만','Tertiary: Text only (밑줄 없음)','Ghost: 연한 텍스트만'],
goodChanges:['Primary 1개만 강조 — 결정 유도','Secondary는 대안 — 비교 가능','Tertiary/Ghost는 보조 — 방해 안 함','시각적 소음 75% 감소']},
{id:'repetition',name:'Repetition',en:'반복',def:'같은 요소를 반복해 일관된 리듬과 단일 시스템을 만든다. 디자인 시스템의 기반.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:20px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center">${'<button style="background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:6px;font-size:12px;font-weight:600">Button</button><button style="background:var(--acc-fill);color:var(--acc-ink);padding:12px 20px;border-radius:999px;font-size:13px;font-weight:600">Button</button><button style="border:2px solid var(--ink);background:transparent;color:var(--ink);padding:10px 16px;border-radius:8px;font-size:12px;font-weight:600">Button</button>'.repeat(2)}</div></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:20px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center"><button style="background:var(--ink);color:var(--bg);padding:12px 20px;border-radius:8px;font-size:13px;font-weight:600">Primary</button><button style="background:transparent;border:1px solid var(--ink);color:var(--ink);padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500">Secondary</button><button style="background:var(--wash);color:var(--ink);border:1px solid var(--line);padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500">Tertiary</button><button style="background:var(--ink);color:var(--bg);padding:12px 20px;border-radius:8px;font-size:13px;font-weight:600">Primary</button><button style="background:transparent;border:1px solid var(--ink);color:var(--ink);padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500">Secondary</button><button style="background:var(--wash);color:var(--ink);border:1px solid var(--line);padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500">Tertiary</button></div></div>`,
badNote:'같은 일을 하는 버튼이 제각각 — 사용자가 규칙을 익힐 수 없다.',
goodNote:'Primary/Secondary/Tertiary 3가지 타입만 존재. 같은 타입은 항상 같은 모양. 시스템이 된다.',
badChanges:['3가지 다른 버튼 스타일 → 3타입 시스템','Primary: Fill 일원화','Secondary: Outline 일원화','Tertiary: Wash 배경 일원화','Border-radius 6/8/999px → 8px 통일'],
goodChanges:['버튼 규칙 학습 비용 → 0','새 페이지에서도 버튼 예측 가능','디자인 토큰화 준비 완료','개발 컴포넌트 3개로 축소']},
{id:'consistency',name:'Consistency',en:'일관성',def:'같은 의미는 항상 같은 방식으로 표현한다. 예측 가능한 제품의 기반. 신뢰를 만든다.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:20px;display:flex;flex-direction:column;gap:16px"><div><div style="font-family:var(--disp);font-size:22px;font-weight:600;color:var(--ink)">Page Title</div><p style="font-size:12px;color:var(--ink-3);margin-top:4px">동일한 "제목"이지만 —</p></div><div style="background:var(--ink);color:var(--bg);padding:16px;border-radius:8px"><div style="font-family:var(--disp);font-size:22px;font-weight:600">Page Title</div></div><div style="border:1px solid var(--ink);padding:16px;border-radius:8px"><div style="font-family:var(--disp);font-size:22px;font-weight:600;color:var(--ink)">Page Title</div></div></div></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:20px;display:flex;flex-direction:column;gap:16px">${'<div style="background:var(--bg-2);border:1px solid var(--line-2);border-radius:8px;padding:16px"><div style="font-family:var(--disp);font-size:22px;font-weight:600;color:var(--ink)">Page Title</div></div>'.repeat(3)}</div></div>`,
badNote:'같은 역할의 요소가 저마다 다르게 — 사용자가 "이게 제목이구나"를 매번 학습해야 함.',
goodNote:'같은 것은 항상 같게 — 시스템이 된다. 제목 컴포넌트 하나로 전체 통일.',
badChanges:['3가지 다른 제목 스타일 → 단일 컴포넌트','배경: bg-2 + border line-2 통일','Padding 16px 통일','Border-radius 8px 통일'],
goodChanges:['제목 컴포넌트 1개로 전체 커버','디자인 토큰 → 코드 매핑 1:1','신규 페이지 제작 속도 3배','브랜드 일관성 자동 보장']},
{id:'scale',name:'Scale',en:'규모',def:'크기 차이로 중요도를 드러낸다. 제목이 본문보다 커야 이유가 있다. 스케일이 위계를 만든다.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><svg viewBox="0 0 400 260" width="100%" height="100%" role="img" aria-label="같은 Weekly overview 콘텐츠를 한 가지 글자 크기로 표시한 카드"><rect x="22" y="28" width="356" height="204" rx="6" fill="var(--surface)" stroke="var(--line-2)"/><rect x="42" y="48" width="54" height="10" rx="2" fill="var(--acc-500)"/><text x="42" y="91" font-family="var(--disp)" font-size="12" font-weight="700" fill="var(--ink)">Weekly overview</text><text x="42" y="111" font-family="var(--disp)" font-size="12" fill="var(--ink-2)">Your team is moving steadily.</text><rect x="42" y="132" width="194" height="48" rx="5" fill="var(--ink)"/><text x="58" y="153" font-family="var(--mono)" font-size="12" fill="var(--bg)" opacity=".75">COMPLETED</text><text x="58" y="172" font-family="var(--disp)" font-size="12" font-weight="700" fill="var(--bg)">24 tasks</text><rect x="258" y="132" width="100" height="48" rx="5" fill="var(--bg-2)" stroke="var(--acc-500)"/><text x="272" y="153" font-family="var(--mono)" font-size="12" fill="var(--ink)">ON TRACK</text><text x="272" y="172" font-family="var(--disp)" font-size="12" font-weight="700" fill="var(--ink)">+18%</text><text x="42" y="213" font-family="var(--mono)" font-size="12" fill="var(--ink-3)">headline → summary → evidence</text></svg></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><svg viewBox="0 0 400 260" width="100%" height="100%" role="img" aria-label="큰 제목과 작은 보조 정보로 위계가 있는 대시보드"><rect x="22" y="28" width="356" height="204" rx="6" fill="var(--surface)" stroke="var(--line-2)"/><rect x="42" y="48" width="54" height="10" rx="2" fill="var(--acc-500)"/><text x="42" y="91" font-family="var(--disp)" font-size="20" font-weight="700" fill="var(--ink)">Weekly overview</text><text x="42" y="111" font-family="var(--disp)" font-size="12" fill="var(--ink-2)">Your team is moving steadily.</text><rect x="42" y="132" width="194" height="48" rx="5" fill="var(--ink)"/><text x="58" y="153" font-family="var(--mono)" font-size="10" fill="var(--bg)" opacity=".75">COMPLETED</text><text x="58" y="172" font-family="var(--disp)" font-size="20" font-weight="700" fill="var(--bg)">24 tasks</text><rect x="258" y="132" width="100" height="48" rx="5" fill="var(--bg-2)" stroke="var(--acc-500)"/><text x="272" y="153" font-family="var(--mono)" font-size="10" fill="var(--ink)">ON TRACK</text><text x="272" y="172" font-family="var(--disp)" font-size="16" font-weight="700" fill="var(--ink)">+18%</text><text x="42" y="213" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">headline → summary → evidence</text></svg></div>`,
badNote:'카드 안의 정보 텍스트를 모두 12px로 통일 — 제목·설명·지표의 크기 차이가 없어 어디부터 읽어야 할지 모른다.',
goodNote:'제목·핵심 수치 20px → 보조 수치 16px → 본문·캡션 12px + Accent bar 10px. 4단계 스케일로 위계가 선명하다.',
badChanges:['카드 안 정보 텍스트 12px 통일 — 크기 위계 제거','제목·설명·지표의 중요도가 같은 크기로 보임','COMPLETED / ON TRACK도 같은 크기라 빠른 스캔이 어려움','내용은 같지만 스케일만 무너짐'],
goodChanges:['제목·핵심 수치 20px → 보조 수치 16px → 본문·캡션 12px + Accent bar 10px','같은 내용 안에서 제목과 핵심 수치가 먼저 보임','Accent 색으로 포인트 라인 구분','4단계 시각 스케일로 스캐닝 즉시 가능']},
{id:'rhythm',name:'Rhythm',en:'리듬',def:'간격과 반복의 패턴이 시선을 움직이는 속도를 만든다. 읽기 좋은 페이지는 리듬이 있다.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><svg viewBox="0 0 400 260" width="100%" height="100%" role="img" aria-label="간격이 불규칙한 알림 목록"><rect x="24" y="30" width="352" height="200" rx="6" fill="var(--surface)" stroke="var(--line-2)"/><text x="44" y="56" font-family="var(--mono)" font-size="10" letter-spacing=".08em" fill="var(--ink-3)">ACTIVITY</text><circle cx="48" cy="82" r="7" fill="var(--err)"/><rect x="68" y="76" width="212" height="12" rx="2" fill="var(--ink-2)"/><rect x="68" y="94" width="116" height="8" rx="2" fill="var(--line-2)"/><circle cx="48" cy="132" r="7" fill="var(--acc-500)"/><rect x="68" y="126" width="236" height="12" rx="2" fill="var(--ink-2)"/><rect x="68" y="144" width="92" height="8" rx="2" fill="var(--line-2)"/><circle cx="48" cy="160" r="7" fill="var(--ok)"/><rect x="68" y="154" width="188" height="12" rx="2" fill="var(--ink-2)"/><circle cx="48" cy="210" r="7" fill="var(--err)"/><rect x="68" y="204" width="222" height="12" rx="2" fill="var(--ink-2)"/><path d="M320 75v27M320 125v27M320 155v49" stroke="var(--err)" stroke-width="2" stroke-dasharray="3 3"/><text x="328" y="93" font-family="var(--mono)" font-size="10" fill="var(--err)">4</text><text x="328" y="143" font-family="var(--mono)" font-size="10" fill="var(--err)">22</text><text x="328" y="189" font-family="var(--mono)" font-size="10" fill="var(--err)">30</text></svg></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><svg viewBox="0 0 400 260" width="100%" height="100%" role="img" aria-label="일정한 간격으로 반복되는 알림 목록"><rect x="24" y="30" width="352" height="200" rx="6" fill="var(--surface)" stroke="var(--line-2)"/><text x="44" y="56" font-family="var(--mono)" font-size="10" letter-spacing=".08em" fill="var(--ink-3)">ACTIVITY</text><g fill="var(--ok)"><circle cx="48" cy="84" r="7"/><circle cx="48" cy="128" r="7"/><circle cx="48" cy="172" r="7"/></g><g fill="var(--ink-2)"><rect x="68" y="78" width="212" height="12" rx="2"/><rect x="68" y="122" width="236" height="12" rx="2"/><rect x="68" y="166" width="188" height="12" rx="2"/></g><g fill="var(--line-2)"><rect x="68" y="96" width="116" height="8" rx="2"/><rect x="68" y="140" width="92" height="8" rx="2"/><rect x="68" y="184" width="126" height="8" rx="2"/></g><path d="M320 84v88" stroke="var(--ok)" stroke-width="2" stroke-dasharray="3 3"/><text x="328" y="132" font-family="var(--mono)" font-size="10" fill="var(--ok)">16</text><text x="44" y="214" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">same interval · steady scan</text></svg></div>`,
badNote:'간격이 제멋대로(4px, 22px, 30px) — 읽는 리듬이 끊긴다. 눈이 다음 줄을 찾느라 피로.',
goodNote:'일정한 16px 간격 — 눈이 자연스럽게 다음 줄로 흐른다. 리듬 = 읽기 속도 조절.',
badChanges:['불규칙 간격(4/22/30) → 일정 16px','시각적 리듬 = 읽기 속도 제어','모바일에서 12px로 축소','Baseline grid(8px) 배수 사용'],
goodChanges:['줄 간격 시스템화 — CSS 변수로 관리','읽기 피로도 감소','콘텐츠 밀도 조절 용이','디자인 시스템 spacing 토큰 직결']},
{id:'symmetry',name:'Symmetry',en:'대칭',def:'좌우가 거울처럼 맞닿는 배치. 안정과 격식을 준다. 브랜드·공식 페이지에 적합.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><svg viewBox="0 0 400 260" width="100%" height="100%" role="img" aria-label="중심선에서 어긋난 두 카드"><path d="M200 28v170" stroke="var(--err)" stroke-width="1" stroke-dasharray="4 5"/><text x="208" y="47" font-family="var(--mono)" font-size="10" fill="var(--err)">CENTER</text><rect x="38" y="76" width="132" height="82" rx="6" fill="var(--surface)" stroke="var(--ink-2)"/><rect x="54" y="94" width="100" height="30" rx="4" fill="var(--ink)"/><rect x="54" y="134" width="62" height="9" rx="2" fill="var(--line-2)"/><rect x="230" y="100" width="132" height="82" rx="6" fill="var(--surface)" stroke="var(--ink-2)"/><rect x="246" y="118" width="100" height="30" rx="4" fill="var(--ink)"/><rect x="246" y="158" width="62" height="9" rx="2" fill="var(--line-2)"/><text x="38" y="214" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">same content · shifted baseline</text></svg></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><svg viewBox="0 0 400 260" width="100%" height="100%" role="img" aria-label="중심선을 기준으로 거울처럼 맞춘 두 카드"><path d="M200 28v170" stroke="var(--ok)" stroke-width="1" stroke-dasharray="4 5"/><text x="208" y="47" font-family="var(--mono)" font-size="10" fill="var(--ok)">CENTER</text><rect x="38" y="76" width="132" height="82" rx="6" fill="var(--surface)" stroke="var(--ink-2)"/><rect x="230" y="76" width="132" height="82" rx="6" fill="var(--surface)" stroke="var(--ink-2)"/><g fill="var(--ink)"><rect x="54" y="94" width="100" height="30" rx="4"/><rect x="246" y="94" width="100" height="30" rx="4"/></g><g fill="var(--line-2)"><rect x="54" y="134" width="62" height="9" rx="2"/><rect x="246" y="134" width="62" height="9" rx="2"/></g><text x="38" y="214" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">equal size · equal distance · stable</text></svg></div>`,
badNote:'정렬된 듯하지만 오른쪽이 24px 내려감 — 미세한 어긋남이 불안감을 만든다.',
goodNote:'좌우 완벽 대칭 — 안정감·격식. 공식 발표·브랜드 랜딩에 적합.',
badChanges:['오른쪽 margin-top 24px → 0 (대칭 복원)','좌우 박스 높이·위치 완전 일치','시각적 중심선 통과 확인'],
goodChanges:['대칭 복원 — 무의식적 안정감','격식 있는 인상 — 신뢰도 상승','모바일에서 세로 스택으로 자연 전환','대칭은 "의도적"일 때만 사용']},
{id:'asymmetry',name:'Asymmetry',en:'비대칭',def:'대칭을 깨되 무게는 유지한다. 생동감과 현대적 느낌을 준다. 편집·포트폴리오에 강하다.',
bad:`<div class="pframe bad"><span class="pchip">BAD</span><svg viewBox="0 0 400 260" width="100%" height="100%" role="img" aria-label="중앙에 같은 무게로 쌓인 카드"><path d="M200 28v48M200 126v16M200 192v10" stroke="var(--err)" stroke-width="1" stroke-dasharray="4 5"/><rect x="88" y="76" width="224" height="50" rx="6" fill="var(--ink-2)"/><rect x="118" y="142" width="164" height="50" rx="6" fill="var(--line-2)"/><text x="148" y="106" font-family="var(--mono)" font-size="10" fill="var(--bg)">TITLE / BODY</text><text x="159" y="172" font-family="var(--mono)" font-size="10" fill="var(--ink)">same centre</text><text x="44" y="218" font-family="var(--mono)" font-size="10" fill="var(--err)">balanced? no focal direction</text></svg></div>`,
good:`<div class="pframe good"><span class="pchip">GOOD</span><svg viewBox="0 0 400 260" width="100%" height="100%" role="img" aria-label="큰 카드와 작은 액센트 카드가 대각선으로 균형을 이룬 구성"><path d="M48 204L348 52" stroke="var(--ok)" stroke-width="1" stroke-dasharray="4 5"/><rect x="42" y="48" width="226" height="132" rx="6" fill="var(--ink)"/><rect x="62" y="72" width="126" height="16" rx="3" fill="var(--bg)" opacity=".82"/><rect x="62" y="104" width="166" height="9" rx="2" fill="var(--bg)" opacity=".55"/><rect x="62" y="124" width="116" height="9" rx="2" fill="var(--bg)" opacity=".35"/><rect x="250" y="150" width="104" height="62" rx="6" fill="var(--acc-500)"/><rect x="266" y="168" width="56" height="9" rx="2" fill="var(--bg)" opacity=".8"/><text x="42" y="244" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">large anchor + small accent = dynamic balance</text></svg></div>`,
badNote:'중앙 정렬이면 무난하지만 기억에 남지 않는다. 비대칭이지만 무게 중심이 없음.',
goodNote:'큰 검은 면(좌상) ≈ 작은 주황 면(우하). 비대칭이지만 무게 균형 — 움직이는 구도.',
badChanges:['중앙 정렬 2줄 → 비대칭 배치','큰 면(검정 57%×51%) + 작은 면(주황 26%×24%)','주황이 검은 면의 시각적 무게 상쇄','대각선 흐름으로 시선 유도'],
goodChanges:['비대칭이지만 무게 균형 — 정적이지 않음','대각선 시선 흐름 — 동적 인상','편집 디자인·포트폴리오에 적합','의도적 불균형 = 디자이너의 선택']},
];

const GESTALT=[
{id:'proximity',name:'Proximity',kr:'근접성',def:'가까운 것은 하나의 그룹으로 보인다. 거리가 관계다.',
 demo:`<div class="g-demo"><svg viewBox="0 0 400 200" width="100%" height="100%" role="img" aria-label="가까운 점 세 개씩 두 그룹"><g fill="var(--ink)"><circle cx="104" cy="94" r="10"/><circle cx="132" cy="94" r="10"/><circle cx="160" cy="94" r="10"/><circle cx="240" cy="94" r="10"/><circle cx="268" cy="94" r="10"/><circle cx="296" cy="94" r="10"/></g><path d="M88 126h88M224 126h88" stroke="var(--acc-500)" stroke-width="2"/><text x="100" y="153" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">GROUP A</text><text x="236" y="153" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">GROUP B</text><text x="178" y="62" font-family="var(--mono)" font-size="10" fill="var(--ink)">wide gap</text></svg></div>`},
{id:'similarity',name:'Similarity',kr:'유사성',def:'비슷한 색·모양·크기는 같은 부류로 묶인다.',
 demo:`<div class="g-demo"><svg viewBox="0 0 400 200" width="100%" height="100%" role="img" aria-label="같은 모양과 색의 점들이 떨어져 있어도 한 부류로 읽히는 배열"><g fill="var(--acc-500)"><circle cx="92" cy="76" r="10"/><circle cx="200" cy="76" r="10"/><circle cx="308" cy="76" r="10"/><circle cx="146" cy="128" r="10"/><circle cx="254" cy="128" r="10"/></g><g fill="var(--ink-3)"><rect x="136" y="66" width="20" height="20" rx="3"/><rect x="244" y="66" width="20" height="20" rx="3"/><rect x="82" y="118" width="20" height="20" rx="3"/><rect x="190" y="118" width="20" height="20" rx="3"/><rect x="298" y="118" width="20" height="20" rx="3"/></g><text x="136" y="184" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">shape + colour override distance</text></svg></div>`},
{id:'closure',name:'Closure',kr:'폐쇄성',def:'빠진 부분을 눈이 스스로 채워 완성된 형태로 본다.',
 demo:`<div class="g-demo"><svg viewBox="0 0 400 200" width="100%" height="100%" role="img" aria-label="간격이 난 원의 윤곽을 완성해 읽는 폐쇄성"><circle cx="200" cy="94" r="58" fill="none" stroke="var(--ink)" stroke-width="10" stroke-linecap="round" stroke-dasharray="70 14 70 14 70 14 70 14"/><text x="136" y="176" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">four gaps · one complete circle</text></svg></div>`},
{id:'continuation',name:'Continuation',kr:'연속성',def:'중간이 가려져도 시선이 이어지는 경로를 따라간다.',
 demo:`<div class="g-demo"><svg viewBox="0 0 400 200" width="100%" height="100%" role="img" aria-label="가려진 패널 뒤에서도 이어지는 세 개의 곡선"><g fill="none" stroke="var(--ink-3)" stroke-width="4" stroke-linecap="round"><path d="M34 64C112 8 288 8 366 64"/><path d="M34 100C112 44 288 44 366 100"/><path d="M34 136C112 80 288 80 366 136"/></g><rect x="168" y="38" width="64" height="124" rx="4" fill="var(--surface)" stroke="var(--acc-500)" stroke-width="2"/><text x="177" y="186" font-family="var(--mono)" font-size="10" fill="var(--ink)">path continues behind</text></svg></div>`},
{id:'figureground',name:'Figure / Ground',kr:'전경과 배경',def:'눈은 한 순간에 하나의 형상을 인식한다 — 그 형상이 배경이 되기도 한다.',
 demo:`<div class="g-demo"><svg viewBox="0 0 400 200" width="100%" height="100%" role="img" aria-label="같은 루빈의 꽃병 윤곽이 대비에 따라 꽃병 또는 서로 마주 보는 두 얼굴로 읽히는 전경과 배경 도형"><rect x="24" y="28" width="156" height="126" rx="5" fill="var(--ink)" stroke="var(--line-2)"/><rect x="220" y="28" width="156" height="126" rx="5" fill="var(--bg-2)" stroke="var(--line-2)"/><clipPath id="gd-fg-clip"><rect x="220" y="28" width="156" height="126" rx="5"/></clipPath><path d="M50 28L154 28C154 36 140 38 136 44C133 49 132 54 133 58C134 62 139 62 139 65C139 68 135 69 133 72C128 77 116 80 116 86C116 90 126 91 130 93C126 95 123 96 123 99C123 102 128 102 129 104C128 106 124 106 124 109C124 112 130 112 132 114C128 117 122 119 122 125C122 132 132 134 140 138C144 141 146 146 146 154L58 154C58 146 60 141 64 138C72 134 82 132 82 125C82 119 76 117 72 114C74 112 80 112 80 109C80 106 76 106 75 104C76 102 81 102 81 99C81 96 78 95 74 93C78 91 88 90 88 86C88 80 76 77 71 72C69 69 65 68 65 65C65 62 70 62 71 58C72 54 71 49 68 44C64 38 50 36 50 28Z" fill="var(--acc-500)"/><g clip-path="url(#gd-fg-clip)" fill="var(--acc-500)"><path d="M220 28L246 28C246 36 260 38 264 44C267 49 268 54 267 58C266 62 261 62 261 65C261 68 265 69 267 72C272 77 284 80 284 86C284 90 274 91 270 93C274 95 277 96 277 99C277 102 272 102 271 104C272 106 276 106 276 109C276 112 270 112 268 114C272 117 278 119 278 125C278 132 268 134 260 138C256 141 254 146 254 154L220 154Z"/><path d="M376 28L350 28C350 36 336 38 332 44C329 49 328 54 329 58C330 62 335 62 335 65C335 68 331 69 329 72C324 77 312 80 312 86C312 90 322 91 326 93C322 95 319 96 319 99C319 102 324 102 325 104C324 106 320 106 320 109C320 112 326 112 328 114C324 117 318 119 318 125C318 132 328 134 336 138C340 141 342 146 342 154L376 154Z"/></g><path d="M192 91h16m-5-5 5 5-5 5" fill="none" stroke="var(--acc-500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="102" y="176" text-anchor="middle" font-family="var(--mono)" font-size="12" fill="var(--ink)">VASE = FIGURE</text><text x="298" y="176" text-anchor="middle" font-family="var(--mono)" font-size="12" fill="var(--ink)">FACES = FIGURE</text></svg></div>`},
{id:'commonregion',name:'Common Region',kr:'공통 영역',def:'같은 테두리·배경 안에 있으면 한 그룹으로 묶인다.',
 demo:`<div class="g-demo"><svg viewBox="0 0 400 200" width="100%" height="100%" role="img" aria-label="같은 테두리 안의 요소가 각각 한 그룹으로 묶이는 공통 영역"><rect x="42" y="52" width="132" height="86" rx="8" fill="var(--surface)" stroke="var(--acc-500)" stroke-width="2"/><rect x="226" y="52" width="132" height="86" rx="8" fill="var(--surface)" stroke="var(--acc-500)" stroke-width="2"/><g fill="var(--ink)"><circle cx="76" cy="96" r="10"/><circle cx="108" cy="96" r="10"/><circle cx="140" cy="96" r="10"/><circle cx="260" cy="96" r="10"/><circle cx="292" cy="96" r="10"/><circle cx="324" cy="96" r="10"/></g><text x="78" y="122" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">TEAM A</text><text x="262" y="122" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">TEAM B</text><text x="116" y="176" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">one border · one group</text></svg></div>`},
{id:'commonfate',name:'Common Fate',kr:'공동 운명',def:'같은 방향으로 움직이는 것은 한 단위로 묶여 보인다.',
 demo:`<div class="g-demo"><svg viewBox="0 0 400 200" width="100%" height="100%" role="img" aria-label="같은 방향으로 흐르는 세 개의 화살표와 반대 방향의 한 점"><g fill="none" stroke="var(--ink-3)" stroke-width="4" stroke-linecap="round"><path d="M48 64C124 20 244 20 342 64"/><path d="M48 100C124 56 244 56 342 100"/><path d="M48 136C124 92 244 92 342 136"/></g><g fill="var(--acc-500)"><circle cx="86" cy="45" r="10"/><circle cx="86" cy="81" r="10"/><circle cx="86" cy="117" r="10"/></g><path d="M316 52l26 12-26 12zM316 88l26 12-26 12zM316 124l26 12-26 12z" fill="var(--acc-500)"/><circle cx="314" cy="172" r="10" fill="var(--ink)" stroke="var(--bg)" stroke-width="2"/><path d="M284 172h-38" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/><text x="104" y="196" font-family="var(--mono)" font-size="10" fill="var(--ink-3)">three move together →</text></svg></div>`},
];

/* ============================================================
   STYLE DNA / RELATIONS / KEYWORDS / OBSERVE
   ============================================================ */
const STYLE_DNA={
  minimal:{type:3,space:5,contrast:3,border:1,round:1,shadow:0,color:1,deco:0},
  material:{type:4,space:3,contrast:3,border:1,round:3,shadow:4,color:4,deco:2},
  'material-you':{type:4,space:4,contrast:3,border:1,round:5,shadow:3,color:5,deco:3},
  fluent:{type:4,space:3,contrast:3,border:1,round:3,shadow:3,color:4,deco:4},
  corporate:{type:3,space:3,contrast:3,border:1,round:1,shadow:1,color:2,deco:1},
  luxury:{type:4,space:4,contrast:3,border:1,round:1,shadow:1,color:2,deco:3},
  editorial:{type:5,space:4,contrast:2,border:0,round:0,shadow:0,color:1,deco:2},
  'corp-memphis':{type:3,space:3,contrast:3,border:0,round:3,shadow:1,color:5,deco:4},
  brutal:{type:5,space:2,contrast:5,border:4,round:0,shadow:0,color:4,deco:2},
  neobrutal:{type:4,space:3,contrast:4,border:5,round:2,shadow:5,color:5,deco:3},
  glass:{type:3,space:3,contrast:3,border:2,round:5,shadow:4,color:4,deco:4},
  neumorph:{type:3,space:4,contrast:2,border:0,round:4,shadow:5,color:2,deco:3},
  clay:{type:3,space:3,contrast:3,border:1,round:5,shadow:4,color:4,deco:4},
  skeuo:{type:3,space:3,contrast:2,border:2,round:3,shadow:4,color:3,deco:5},
  flat:{type:4,space:3,contrast:3,border:1,round:1,shadow:0,color:4,deco:1},
  frutiger:{type:3,space:3,contrast:3,border:2,round:5,shadow:4,color:5,deco:5},
  bauhaus:{type:4,space:3,contrast:4,border:2,round:0,shadow:0,color:5,deco:4},
  swiss:{type:5,space:3,contrast:4,border:2,round:0,shadow:0,color:4,deco:2},
  memphis:{type:3,space:3,contrast:3,border:1,round:2,shadow:1,color:5,deco:5},
  destijl:{type:4,space:4,contrast:4,border:3,round:0,shadow:0,color:4,deco:1},
  artdeco:{type:4,space:3,contrast:3,border:3,round:0,shadow:0,color:3,deco:5},
  construct:{type:5,space:2,contrast:5,border:3,round:0,shadow:0,color:5,deco:4},
  retro:{type:3,space:3,contrast:2,border:3,round:0,shadow:1,color:2,deco:4},
  y2k:{type:3,space:3,contrast:3,border:2,round:4,shadow:4,color:5,deco:5},
  cyberpunk:{type:5,space:2,contrast:5,border:2,round:1,shadow:5,color:5,deco:5},
  vaporwave:{type:3,space:3,contrast:3,border:1,round:2,shadow:2,color:5,deco:5},
  scandi:{type:3,space:5,contrast:2,border:0,round:1,shadow:0,color:2,deco:1},
  jpminimal:{type:4,space:5,contrast:2,border:0,round:0,shadow:0,color:1,deco:0},
  acid:{type:4,space:3,contrast:5,border:2,round:2,shadow:1,color:5,deco:5},
};
const DNA_LABEL={type:'Typography',space:'Whitespace',contrast:'Contrast',border:'Border Strength',round:'Roundness',shadow:'Shadow',color:'Color Intensity',deco:'Decoration'};
const DNA_NOTE={type:'무겁고 큰 타이포일수록 존재감이 강하다.',space:'여백이 많을수록 차분·격조, 적을수록 압축·에너지.',contrast:'대비가 셀수록 메시지가 강해진다.',border:'보더가 두꺼울수록 단단·도식적.',round:'모서리가 둥글수록 부드럽·친근.',shadow:'그림자가 깊을수록 입체·질감.',color:'색이 강할수록 감성·장식적.',deco:'장식이 많을수록 풍성·복잡.'};

const STYLE_REL={
  minimal:{rel:['scandi','jpminimal','swiss','corporate'],infBy:['bauhaus','destijl'],inf:['corporate','neobrutal'],conf:['scandi','jpminimal'],opp:['brutal','cyberpunk','acid']},
  material:{rel:['material-you','fluent','neumorph'],infBy:['skeuo'],inf:['material-you'],conf:['fluent'],opp:['brutal']},
  'material-you':{rel:['material','fluent','glass'],infBy:['material'],inf:[],conf:['glass'],opp:[]},
  fluent:{rel:['material','glass','frutiger'],infBy:['skeuo','material'],inf:['glass'],conf:['material'],opp:['brutal']},
  corporate:{rel:['minimal','editorial','swiss'],infBy:['swiss','flat'],inf:[],conf:['minimal'],opp:['brutal','acid','memphis']},
  luxury:{rel:['artdeco','editorial'],infBy:['artdeco'],inf:[],conf:['minimal'],opp:['brutal','acid']},
  editorial:{rel:['luxury','corporate'],infBy:['swiss','bauhaus'],inf:[],conf:['minimal'],opp:['cyberpunk']},
  'corp-memphis':{rel:['memphis','acid','clay'],infBy:['memphis','bauhaus'],inf:[],conf:['memphis'],opp:['brutal','luxury']},
  brutal:{rel:['neobrutal','construct','swiss'],infBy:['construct','bauhaus'],inf:['neobrutal'],conf:['neobrutal'],opp:['minimal','luxury','glass']},
  neobrutal:{rel:['brutal','acid','corp-memphis'],infBy:['brutal'],inf:['corp-memphis'],conf:['brutal'],opp:['glass','neumorph']},
  glass:{rel:['fluent','material-you','frutiger','neumorph'],infBy:['skeuo','frutiger'],inf:['neumorph','material-you'],conf:['neumorph'],opp:['brutal','editorial']},
  neumorph:{rel:['glass','clay','skeuo'],infBy:['skeuo','glass'],inf:[],conf:['glass'],opp:['brutal','swiss']},
  clay:{rel:['neumorph','glass','corp-memphis'],infBy:['glass','neumorph'],inf:[],conf:['neumorph','glass'],opp:['brutal']},
  skeuo:{rel:['frutiger','neumorph','y2k'],infBy:[],inf:['neumorph','material','glass','frutiger'],conf:['y2k','frutiger'],opp:['minimal','flat']},
  flat:{rel:['material','minimal','swiss'],infBy:['swiss','minimal'],inf:['material','corporate'],conf:['minimal','material'],opp:['skeuo','neumorph']},
  frutiger:{rel:['y2k','glass','skeuo'],infBy:['skeuo'],inf:['glass','y2k'],conf:['y2k'],opp:['brutal','minimal']},
  bauhaus:{rel:['swiss','destijl','construct','memphis'],infBy:['destijl','construct'],inf:['swiss','minimal'],conf:['destijl'],opp:['luxury','skeuo']},
  swiss:{rel:['minimal','bauhaus','brutal','corporate'],infBy:['bauhaus','construct'],inf:['minimal','corporate','brutal'],conf:['minimal'],opp:['acid','memphis']},
  memphis:{rel:['corp-memphis','acid','bauhaus'],infBy:['bauhaus','destijl'],inf:['corp-memphis','acid'],conf:['corp-memphis'],opp:['minimal','swiss']},
  destijl:{rel:['bauhaus','minimal','construct'],infBy:[],inf:['bauhaus','minimal'],conf:['bauhaus'],opp:['luxury','acid']},
  artdeco:{rel:['luxury','retro','construct'],infBy:['construct'],inf:['luxury'],conf:['luxury'],opp:['brutal','minimal']},
  construct:{rel:['bauhaus','swiss','brutal','artdeco'],infBy:[],inf:['swiss','brutal','bauhaus'],conf:['bauhaus'],opp:['luxury']},
  retro:{rel:['y2k','frutiger','brutal'],infBy:[],inf:['y2k'],conf:['y2k'],opp:['glass']},
  y2k:{rel:['frutiger','retro','vaporwave'],infBy:['skeuo','retro'],inf:['vaporwave'],conf:['frutiger'],opp:['brutal']},
  cyberpunk:{rel:['vaporwave','acid','brutal'],infBy:['construct','brutal'],inf:[],conf:['vaporwave'],opp:['minimal','scandi']},
  vaporwave:{rel:['cyberpunk','y2k','acid'],infBy:['y2k','memphis'],inf:[],conf:['cyberpunk'],opp:['minimal','corporate']},
  scandi:{rel:['minimal','jpminimal'],infBy:['minimal','jpminimal'],inf:[],conf:['minimal','jpminimal'],opp:['brutal','cyberpunk']},
  jpminimal:{rel:['scandi','minimal'],infBy:[],inf:['scandi','minimal'],conf:['scandi'],opp:['acid','cyberpunk']},
  acid:{rel:['corp-memphis','memphis','cyberpunk','vaporwave'],infBy:['memphis','construct'],inf:['neobrutal'],conf:['vaporwave','neobrutal'],opp:['minimal','corporate','luxury']},
};
const REL_LABEL={rel:'Related',sim:'Similar',infBy:'Influenced By',inf:'Influenced',conf:'Often Confused With',opp:'Opposite Direction'};

const STYLE_KW={
  minimal:['미니멀','단순','깔끔','여백','모던','제거','simple','clean','less'],
  material:['구글','안드로이드','카드','그림자','섀도','elevation','구글디자인'],
  'material-you':['안드로이드','동적색','머티리얼3','다이내믹','개인화'],
  fluent:['마이크로소프트','아크릴','블러','윈도우','재질'],
  corporate:['기업','비즈니스','신뢰','보고서','데이터','네이비','뉴트럴'],
  luxury:['럭셔리','고급','금색','세리프','명품','브랜드','gold','귀족'],
  editorial:['잡지','매거진','신문','기사','세리프','독서','에디토리얼','magazine','long-form','매거진'],
  'corp-memphis':['일러스트','캐릭터','플랫','스타트업','일러','그림','팔'],
  brutal:['거친','원시','강렬','과감','원색','레트로웹','raw','bold','웹','날것'],
  neobrutal:['거친','밝은','하드섀도','보더','장난','신브루탈','playful','두꺼운'],
  glass:['유리','블러','반투명','투명','글래스','frost','유리모피즘','포스트잇'],
  neumorph:['뉴모피즘','소프트','음각','양각','질감','촉감'],
  clay:['클레이','찰흙','파스텔','둥근','통통','pastel','부드러운'],
  skeuo:['스큐어','질감','재질','가죽','실사','리얼','책상'],
  flat:['플랫','flat','평면','단색','ios7','무그림자','flat design','메트로'],
  frutiger:['프루티거','2000년대','윈도우비스타','반짝','글래스','노스탤지어','aqua'],
  bauhaus:['바우하우스','원색','기하학','독일','디자인운동','bauhaus','이동식'],
  swiss:['스위스','그리드','인터내셔널','국제타이포','헬베티카','red','빨간','타이포','grid'],
  memphis:['멤피스','패턴','파스텔','1980','장난','geometric','장식'],
  destijl:['데스틸','몬드리안','네덜란드','직선','원색','추상','수직'],
  artdeco:['아르데코','금색','대칭','1920','고전','장식','기하'],
  construct:['구성주의','러시아','선전','사선','포스터','혁명','프로파간다'],
  retro:['레트로','90년대','올드웹','윈도우93','노스탤지어','구식','복고','베이지'],
  y2k:['y2k','2000년대','크롬','거품','미래','메탈릭','광택'],
  cyberpunk:['사이버펑크','네온','글리치','디스토피아','네온사인','sf','SF','과학'],
  vaporwave:['베이퍼웨이브','보라','핑크','노스탤지어','aesthetic','80년대','꿈'],
  scandi:['스칸디','북유럽','나무','따뜻','이케아','hygge','세이지'],
  jpminimal:['일본','와비사비','여백','ma','간','정적','미니멀','일본미니멀','마'],
  acid:['애시드','네온','무지개','레이브','pvc','반디자인','역디자인'],
};

const STYLE_OBSERVE={
  minimal:['콘텐츠 밖의 여백이 얼마나 넓은지 본다. 여백이 곧 디자인이다.','사용된 색이 몇 가지인지 센다 — 보통 한두 개에 그친다.','타이포그래피가 장식의 자리를 대신하고 있는지 본다.','불필요한 선과 그림자가 하나도 없는지 확인한다.'],
  material:['그림자의 깊이(z-elevation)가 정보의 층을 어떻게 구분하는지 본다.','FAB, 카드, 스낵바처럼 정의된 컴포넌트가 눈에 띄는지 본다.','리플(물결) 피드백이 터치 위치에서 시작하는지 확인한다.','색상 시스템이 중립 위에 포인트 색을 얹는 구조인지 본다.'],
  'material-you':['배경화면의 색이 인터페이스의 토큰으로 번지는지 본다.','알약·둥근 형태가 컴포넌트 전반에 적용되었는지 확인한다.','같은 앱이라도 기기마다 색이 달라질 수 있는지 생각한다.','다크 모드에서 색의 대비가 유지되는지 본다.'],
  fluent:['아크릴 블러 뒤로 배경이 비치는지 본다.','빛의 방향이 깊이를 어떻게 만드는지 관찰한다.','호버 시 라이트 리빌 피드백이 있는지 확인한다.','토큰 기반의 재질이 일관되게 쓰이는지 본다.'],
  corporate:['네이비·화이트 같은 중립 팔레트가 신뢰를 만드는지 본다.','차트와 표가 디자인의 중심에 있는지 확인한다.','레이블에 스몰캡(대문자를 소문자 크기로 줄인 형태)과 넓은 자간이 쓰이는지 본다.','어떤 곳에도 센세이션한 색이 없는지 확인한다.'],
  luxury:['금색이 배경이 아니라 포인트로 쓰이는 위치를 본다.','자간(letter-spacing)이 얼마나 넓은지 확인한다.','세리프 폰트가 희소성을 어떻게 만드는지 느낀다.','대비가 낮아도 고급스러움은 유지되는지 본다.'],
  editorial:['헤드라인의 세리프가 첫 인상을 만드는지 본다.','단(column) 폭과 행간이 읽기 속도를 조절하는지 본다.','드롭캡·인용구 같은 잡지 요소를 찾아본다.','글이 이어지는 리듬이 어떻게 유지되는지 본다.'],
  'corp-memphis':['단순 도형이 복잡한 의미를 압축하는지 본다.','캐릭터가 브랜드 감성을 담당하는지 확인한다.','밝은 원색이 일러스트 전반을 지배하는지 본다.','플랫한 스타일이 일관되게 쓰이는지 확인한다.'],
  brutal:['타이포가 장식이 아니라 구조 그 자체인지 본다.','원색·고대비가 어디에서 터지는지 관찰한다.','비대칭이 실수처럼 보이지만 계산된 것인지 본다.','장식과 그림자가 얼마나 없는지 확인한다.'],
  neobrutal:['두꺼운 보더와 오프셋 섀도가 일관되게 쓰이는지 본다.','섀도가 "떠 있는" 게 아니라 단단히 붙어 있는지 확인한다.','밝은 버튼색이 클릭할 곳을 알려주는지 본다.','장난기와 가독성의 균형을 관찰한다.'],
  glass:['블러 뒤에 뭔가 색이 있어야 유리가 존재함을 확인한다.','테두리의 밝은 하이라이트가 두께를 만드는지 본다.','배경이 비치면서도 텍스트는 또렷한지 확인한다.','유리 패널 위의 콘텐츠가 읽히는지 본다.'],
  neumorph:['같은 톤의 양각·음각 그림자가 질감을 만드는지 본다.','버튼이 눌러진 듯 안쪽으로 들어가는지 확인한다.','대비가 낮아 접근성이 어떻게 훼손되는지 본다.','질감이 "빛"이 아니라 "촉감"인지 느낀다.'],
  clay:['파스텔 배경 위 도형이 토기처럼 앉아 있는지 본다.','그림자가 아래쪽에만 있어 "앉은" 느낌을 주는지 확인한다.','둥근 모서리와 통통한 비율을 관찰한다.','커서를 올렸을 때 눌리는 피드백이 있는지 본다.'],
  skeuo:['실제 사물의 질감(가죽·종이·금속)이 재현되는지 본다.','재질이 "무엇을 하는 물건"인지 즉시 알려주는지 확인한다.','빛과 그림자의 방향이 실제 세계와 같은지 본다.','익숙한 물건의 형상이 사용법을 암시하는지 본다.'],
  flat:['그라데이션·그림자·베벨이 하나도 없는지 확인한다.','채도 높은 단색 면이 영역을 구분하는지 본다.','버튼이 버튼처럼 보이는지 — 눌리는 것과 아닌 것을 구별할 수 있는지 본다.','아이콘이 외곽선만으로 뜻을 전달하는지 관찰한다.'],
  frutiger:['반투명 유리와 물결·잎사귀 모티프를 찾아본다.','광택 하이라이트가 "미래"를 표현하는지 본다.','청록·하늘색 계열이 얼마나 채도가 높은지 확인한다.','과장된 3D 아이콘과 버튼을 관찰한다.'],
  bauhaus:['원색(빨강·노랑·파랑)이 섞이지 않고 나란히 놓이는지 본다.','기본 도형(원·삼각·사각)으로 구성되는지 확인한다.','장식이 없지만 질서가 있는지 본다.','타이포가 기하학적이고 절제되었는지 관찰한다.'],
  swiss:['그리드 위의 질서가 대칭을 대신하는지 본다.','산세리프(헬베티카 계열)가 객관성을 만드는지 확인한다.','빨간 포인트 하나가 전체를 장악하는 위치를 본다.','대문자·자간이 정보 계층을 만드는지 관찰한다.'],
  memphis:['패턴이 배경이 아니라 주인공인지 본다.','파스텔+원색의 조합을 확인한다.','혼돈 속에도 반복되는 리듬이 있는지 본다.','기하학적 모양이 장난기를 만드는지 관찰한다.'],
  destijl:['수직·수평선과 직사각형만으로 이루어졌는지 본다.','원색(빨·노·파)과 흑백만 사용되는지 확인한다.','사선이 하나도 없는지 확인한다.','질서와 추상이 어떻게 결합하는지 본다.'],
  artdeco:['대칭이 유지되면서도 장식이 과하지 않은지 본다.','금색이 포인트로만 쓰이는 위치를 본다.','기하학적 패턴(선 부채꼴 등)을 찾아본다.','어두운 배경과 금색의 대비를 관찰한다.'],
  construct:['사선이 정지된 화면에 운동감을 주입하는지 본다.','빨강·검정의 대비가 긴장감을 만드는지 확인한다.','원·삼각이 겹쳐 선전 에너지를 내는지 본다.','타이포가 비스듬하거나 과격한지 관찰한다.'],
  retro:['크림·갈색 톤이 온기를 만드는지 본다.','구식 창문·테두리 요소를 찾아본다.','픽셀·보더가 "시간 여행"의 장치인지 확인한다.','노스탤지어가 의도적으로 배치되는지 본다.'],
  y2k:['크롬·메탈 그라데이션이 미래를 표현하는지 본다.','거품·광택 하이라이트를 찾아본다.','형광색과 메탈릭이 결합되는 방식을 본다.','오늘의 시선으로 "과거의 미래"를 본다.'],
  cyberpunk:['네온(사이언·마젠타)이 배경과 분리되는 대비를 만드는지 본다.','글로우 효과를 찾아본다.','HUD 패널이 정보 밀도를 높이는지 확인한다.','글리치 텍스트가 장르감을 강화하는지 본다.'],
  vaporwave:['보라·핑크 그라데이션이 꿈결을 만드는지 본다.','그리스 조각·격자·석양 같은 모티프를 찾아본다.','고전과 미래의 충돌이 핵심임을 기억한다.','일본어 문자·ASCII가 장식으로 쓰이는지 본다.'],
  scandi:['밝은 배경과 나무 질감이 실내 온도를 올리는지 본다.','세이지·파스텔 톤이 차분함을 만드는지 확인한다.','기능 중심의 배치가 자연스러운지 본다.','"따뜻하게 비우는" 미니멀리즘을 느낀다.'],
  jpminimal:['여백(間)이 공허가 아니라 의도인지 본다.','포인트 색 하나가 화면 의미를 정하는지 확인한다.','정적인 타이포가 침묵을 만드는지 느낀다.','낡고 불완전한 것에서 아름다움을 보는 와비사비의 태도가 배어 있는지 본다.'],
  acid:['네온 원색이 겹치되 서로 덮지 않는지 본다.','무지개 그라데이션과 PVC 광택을 찾아본다.','기하·글리치가 "질서 밖" 감성을 만드는지 확인한다.','반디자인(anti-design)의 의도를 본다.'],
};

const SEARCH_ALIASES={
  '거친 디자인':['brutal','neobrutal','construct'],
  '거친':['brutal','neobrutal','construct'],
  '부드러운':['glass','neumorph','clay','scandi'],
  '카드 여러 개':['bento','card','dashboard','grid'],
  '카드':['bento','card','dashboard','grid'],
  '잡지 같은':['editorial','editorial-ly','magazine'],
  '잡지':['editorial','editorial-ly','magazine'],
  '유리':['glass','frutiger','fluent'],
  '투명':['glass','frutiger','fluent'],
  '네온':['cyberpunk','acid','vaporwave'],
  '레트로':['retro','y2k','vaporwave','frutiger'],
  '복고':['retro','y2k','vaporwave','memphis'],
  '미래':['y2k','cyberpunk','frutiger'],
  '고급':['luxury','artdeco'],
  '럭셔리':['luxury','artdeco'],
  '심플':['minimal','scandi','jpminimal','corporate'],
  '단순':['minimal','scandi','jpminimal'],
  '깔끔':['minimal','scandi','jpminimal'],
  '독특한':['brutal','memphis','acid','cyberpunk'],
  '개성':['brutal','memphis','acid','cyberpunk'],
  '대시보드':['dashboard'],
  '잡동사니':['bento','card'],
};

/* ============================================================
   LAYOUT REALISTIC + ANATOMY
   ============================================================ */
const REAL_STAGE=(inner)=>`<div class="real-stage">${inner}</div>`;
const LAYOUT_REAL={
  grid:REAL_STAGE(`<div style="display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--line)"><b style="font-family:var(--disp);font-size:11px">acme</b><span style="flex:1"></span><span style="font-size:8px;color:var(--ink-3)">Work · Studio · Contact</span></div><div data-an="cards" style="display:flex;gap:8px;flex:1">${'<div style="flex:1;border:1px solid var(--line-2);border-radius:9px;overflow:hidden;display:flex;flex-direction:column"><span style="height:34px;background:var(--acc-100)"></span><span style="height:6px;width:70%;margin:7px 8px 3px;background:var(--line-2);border-radius:3px"></span><span style="height:6px;width:50%;margin:0 8px 8px;background:var(--line);border-radius:3px"></span></div>'.repeat(3)}</div><div data-an="nav" style="display:flex;justify-content:center;gap:8px"><span style="background:var(--ink);color:var(--bg);font-size:8px;padding:5px 10px;border-radius:6px">CTA</span></div>`),
  '12col':REAL_STAGE(`<div style="display:flex;align-items:center;gap:6px;padding-bottom:8px;border-bottom:1px solid var(--line)"><b style="font-family:var(--disp);font-size:11px">acme</b><span style="flex:1"></span><span style="font-size:8px;color:var(--ink-3)">Menu</span></div><div style="display:flex;gap:8px;flex:1"><div data-an="main" style="flex:2;border:1px solid var(--line-2);border-radius:9px;padding:8px;display:flex;flex-direction:column;gap:5px"><span style="height:9px;width:60%;background:var(--ink);border-radius:3px"></span><span style="height:26px;background:var(--acc-100);border-radius:6px"></span><span style="height:5px;width:90%;background:var(--line-2);border-radius:3px"></span><span style="height:5px;width:70%;background:var(--line);border-radius:3px"></span></div><div data-an="aside" style="flex:1;border:1px solid var(--line-2);border-radius:9px;padding:8px;display:flex;flex-direction:column;gap:5px">${'<span style="height:5px;width:100%;background:var(--line-2);border-radius:3px"></span>'.repeat(5)}</div></div>`),
  modular:REAL_STAGE(`<div data-an="cells" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;flex:1">${'<div style="border:1px solid var(--line-2);border-radius:7px;display:flex;flex-direction:column;padding:5px;gap:4px"><span style="height:20px;background:var(--acc-100);border-radius:5px"></span><span style="height:4px;width:80%;background:var(--line-2);border-radius:2px"></span><span style="height:4px;width:55%;background:var(--line);border-radius:2px"></span></div>'.repeat(12)}</div><div style="text-align:center;font-size:8px;color:var(--ink-3)">셀 단위 콘텐츠 (캘린더·주간뷰)</div>`),
  bento:REAL_STAGE(`<div data-an="hero" style="flex:1.3;border-radius:10px;background:var(--ink);color:var(--bg);padding:10px;display:flex;flex-direction:column;justify-content:flex-end"><span style="font-family:var(--disp);font-size:12px;font-weight:600">허브의 중심</span><span style="font-size:7.5px;opacity:.7">Hero Cell</span></div><div style="display:flex;gap:8px;flex:1"><div data-an="feat" style="flex:1;border:1px solid var(--line-2);border-radius:9px;padding:8px"><span style="height:6px;width:70%;background:var(--acc-500);border-radius:3px;display:block"></span><span style="height:4px;width:90%;background:var(--line-2);border-radius:2px;display:block;margin-top:6px"></span></div><div data-an="visual" style="flex:1.4;border-radius:9px;background:var(--acc-100)"></div><div data-an="cta" style="flex:1;border-radius:9px;border:1px solid var(--line-2);display:grid;place-items:center"><span style="background:var(--ink);color:var(--bg);font-size:8px;padding:5px 9px;border-radius:6px">CTA</span></div></div>`),
  masonry:REAL_STAGE(`<div data-an="col" style="display:flex;gap:7px;flex:1;align-items:flex-start">${'<div style="flex:1;display:flex;flex-direction:column;gap:6px"><span style="height:34px;background:var(--acc-100);border-radius:6px"></span><span style="height:22px;background:var(--line-2);border-radius:6px"></span><span style="height:30px;background:var(--acc-500);opacity:.5;border-radius:6px"></span><span style="height:20px;background:var(--line-2);border-radius:6px"></span></div>'.repeat(3)}</div>`),
  split:REAL_STAGE(`<div style="display:flex;gap:8px;flex:1"><div data-an="left" style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:5px;padding:6px"><b style="font-family:var(--disp);font-size:12px">좌측 · 서비스 A</b><span style="height:5px;width:80%;background:var(--line-2);border-radius:3px"></span><span style="height:5px;width:60%;background:var(--line);border-radius:3px"></span><span style="width:44px;background:var(--ink);color:var(--bg);font-size:7.5px;padding:4px 8px;border-radius:5px;margin-top:4px">Button</span></div><div data-an="right" style="flex:1;border-radius:9px;background:var(--ink);display:grid;place-items:center;color:var(--bg);font-family:var(--mono);font-size:8px;letter-spacing:.1em">B · IMAGE</div></div>`),
  sidebar:REAL_STAGE(`<div style="display:flex;gap:8px;flex:1"><div data-an="side" style="width:34%;border:1px solid var(--line-2);border-radius:9px;padding:7px;display:flex;flex-direction:column;gap:4px"><b style="font-family:var(--disp);font-size:10px">App</b>${'<span style="height:5px;width:90%;background:var(--line-2);border-radius:3px"></span>'.repeat(4)}</div><div data-an="main" style="flex:1;display:flex;flex-direction:column;gap:5px"><span style="height:8px;width:50%;background:var(--ink);border-radius:3px"></span><span style="flex:1;background:var(--acc-100);border-radius:8px"></span><span style="height:18px;background:var(--line-2);border-radius:6px"></span></div></div>`),
  dashboard:REAL_STAGE(`<div data-an="kpi" style="display:flex;gap:6px">${'<div style="flex:1;border:1px solid var(--line-2);border-radius:7px;padding:6px"><span style="height:4px;width:60%;background:var(--ink-3);border-radius:2px;display:block"></span><span style="height:9px;width:80%;background:var(--ink);border-radius:2px;display:block;margin-top:4px"></span></div>'.repeat(4)}</div><div style="display:flex;gap:6px;flex:1"><div data-an="charts" style="flex:1;border:1px solid var(--line-2);border-radius:8px;padding:6px;display:flex;align-items:flex-end;gap:3px">${'<span style="flex:1;background:var(--acc-500);opacity:.75;height:70%"></span><span style="flex:1;background:var(--acc-500);opacity:.75;height:90%"></span><span style="flex:1;background:var(--acc-500);opacity:.5;height:55%"></span><span style="flex:1;background:var(--acc-500);opacity:.75;height:80%"></span>'.split('</span>').slice(0,4).join('</span>')+'</span>'}
</div><div data-an="table" style="flex:1;border:1px solid var(--line-2);border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:4px">${'<span style="height:5px;width:100%;background:var(--line);border-radius:2px"></span>'.repeat(4)}</div></div>`),
  magazine:REAL_STAGE(`<div data-an="headline" style="font-family:Georgia,'Noto Serif KR',serif;font-size:15px;font-weight:700;line-height:1.15">A Quiet<br>Typography of Space</div><div style="display:flex;gap:7px;flex:1"><div data-an="lead" style="flex:1;border-radius:8px;background:var(--acc-100)"></div><div data-an="cols" style="flex:1.2;display:flex;flex-direction:column;gap:4px;padding-top:3px">${'<span style="height:4px;width:100%;background:var(--line-2);border-radius:2px"></span>'.repeat(6)}</div></div>`),
  'editorial-ly':REAL_STAGE(`<div data-an="headline" style="font-family:Georgia,'Noto Serif KR',serif;font-size:14px;font-weight:700">An Essay in<br>Two Columns</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;flex:1;margin-top:6px"><div data-an="body" style="display:flex;flex-direction:column;gap:4px"><b style="float:left;font-family:Georgia;font-size:18px;line-height:.9;padding:2px 4px 0 0;color:var(--acc-text)">T</b>${'<span style="height:4px;width:100%;background:var(--line-2);border-radius:2px"></span>'.repeat(6)}</div><div data-an="body" style="display:flex;flex-direction:column;gap:4px">${'<span style="height:4px;width:100%;background:var(--line-2);border-radius:2px"></span>'.repeat(6)}</div></div><div data-an="quote" style="border-left:2px solid var(--acc-500);padding-left:8px;font-family:Georgia;font-style:italic;font-size:9px;margin-top:5px">"여백이 리듬을 만든다."</div>`),
  card:REAL_STAGE(`<div data-an="card" style="display:flex;gap:7px;flex:1;align-items:flex-start">${'<div style="flex:1;border:1px solid var(--line-2);border-radius:9px;overflow:hidden;display:flex;flex-direction:column"><span style="height:30px;background:var(--acc-100)"></span><span style="height:6px;width:75%;margin:6px 7px 3px;background:var(--line-2);border-radius:3px"></span><span style="height:5px;width:55%;margin:0 7px 7px;background:var(--line);border-radius:3px"></span></div>'.repeat(3)}</div>`),
  timeline:REAL_STAGE(`<div style="display:flex;flex-direction:column;gap:7px;flex:1;padding-left:4px">${'<div data-an="event" style="display:flex;gap:7px;align-items:flex-start"><span style="width:10px;height:10px;border-radius:50%;background:var(--acc-500);flex:none;margin-top:2px"></span><div style="flex:1;display:flex;flex-direction:column;gap:3px"><span style="height:6px;width:45%;background:var(--ink);border-radius:3px"></span><span style="height:4px;width:75%;background:var(--line-2);border-radius:2px"></span></div></div>'.repeat(4)}</div>`),
  fpattern:REAL_STAGE(`<div data-an="title" style="height:9px;width:55%;background:var(--ink);border-radius:3px"></div><div data-an="lines" style="display:flex;flex-direction:column;gap:5px">${'<span style="height:5px;width:92%;background:var(--line-2);border-radius:2px"></span><span style="height:5px;width:70%;background:var(--line);border-radius:2px"></span><span style="height:5px;width:88%;background:var(--line-2);border-radius:2px"></span><span style="height:5px;width:52%;background:var(--line);border-radius:2px"></span>'.repeat(2)}</div><div data-an="media" style="flex:1;border-radius:8px;background:var(--acc-100)"></div>`),
  zpattern:REAL_STAGE(`<div data-an="header" style="display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--disp);font-size:11px">acme</b><span style="height:8px;width:34px;background:var(--acc-500);border-radius:999px"></span></div><div data-an="center" style="flex:1;border:2px dashed var(--line-2);border-radius:9px;display:grid;place-items:center"><div style="text-align:center"><span style="display:block;height:10px;width:120px;background:var(--ink);border-radius:3px;margin:0 auto"></span><span style="display:block;height:5px;width:80px;background:var(--line-2);border-radius:2px;margin:6px auto 0"></span></div></div><div data-an="cta" style="display:flex;justify-content:flex-end"><span style="background:var(--acc-fill);color:#fff;font-size:8px;font-weight:600;padding:5px 10px;border-radius:6px">CTA →</span></div>`),
};
const LAYOUT_ANATOMY={
  grid:[{n:'Navigation',d:'로고·메뉴·CTA가 한 줄',an:'nav'},{n:'Content Cards',d:'동일한 카드가 균등 배치',an:'cards'}],
  '12col':[{n:'Navigation',d:'상단 고정 탐색',an:'nav'},{n:'Main · 8col',d:'콘텐츠가 8개 열을 차지',an:'main'},{n:'Aside · 4col',d:'보조 콘텐츠가 4개 열',an:'aside'}],
  modular:[{n:'Module Cell',d:'같은 크기의 셀이 격자로 반복',an:'cells'}],
  bento:[{n:'Hero Cell',d:'가장 큰 앵커 영역',an:'hero'},{n:'Feature Cell',d:'기능 소개 카드',an:'feat'},{n:'Visual Cell',d:'이미지·비주얼 영역',an:'visual'},{n:'CTA Cell',d:'행동 유도 영역',an:'cta'}],
  masonry:[{n:'Column',d:'높이가 제각각인 열이 흐름',an:'col'}],
  split:[{n:'Left Panel',d:'서비스 A · 텍스트/버튼',an:'left'},{n:'Right Panel',d:'서비스 B · 이미지',an:'right'}],
  sidebar:[{n:'Sidebar',d:'항상 노출되는 탐색',an:'side'},{n:'Main Content',d:'실제 작업 영역',an:'main'}],
  dashboard:[{n:'KPI Row',d:'핵심 지표 카드',an:'kpi'},{n:'Charts',d:'데이터 시각화',an:'charts'},{n:'Table',d:'상세 데이터 표',an:'table'}],
  magazine:[{n:'Headline',d:'화면을 지배하는 제목',an:'headline'},{n:'Lead Image',d:'기사 대표 이미지',an:'lead'},{n:'Columns',d:'다단 콘텐츠',an:'cols'}],
  'editorial-ly':[{n:'Headline',d:'세리프 헤드라인',an:'headline'},{n:'Body Columns',d:'다단 본문',an:'body'},{n:'Pull Quote',d:'인용구로 리듬 분리',an:'quote'}],
  card:[{n:'Card',d:'자기완결적 정보 단위',an:'card'}],
  timeline:[{n:'Event',d:'시간 순서의 사건 + 연결선',an:'event'}],
  fpattern:[{n:'Headline',d:'F의 가로 획',an:'title'},{n:'Text Lines',d:'F형으로 읽히는 본문',an:'lines'},{n:'Media',d:'본문을 끊는 이미지',an:'media'}],
  zpattern:[{n:'Header',d:'시선 시작점',an:'header'},{n:'Center',d:'핵심 메시지',an:'center'},{n:'CTA',d:'시선 종착점',an:'cta'}],
};

/* ============================================================
   UI PATTERN USE / AVOID / MISTAKES
   ============================================================ */
const PATTERN_GUIDE={
  Navbar:{use:'사이트 전체의 탐색 골격이 필요할 때',avoid:'기능이 10개를 넘는 깊은 서비스에서는 진입 장벽이 된다',mistakes:'모바일에서 메뉴를 전부 한 줄에 쏟아내는 것'},
  Sidebar:{use:'탐색이 많고 자주 오가는 앱·대시보드',avoid:'콘텐츠 중심의 마케팅 페이지',mistakes:'화면이 좁은데도 접지 않고 화면을 막는 것'},
  Tab:{use:'동일한 계층의 콘텐츠를 빠르게 전환할 때',avoid:'순서가 강제되는 절차(결제·가입)',mistakes:'탭 수를 지나치게 늘려 각 탭이 비어 보이게 하는 것'},
  Breadcrumb:{use:'깊이가 깊은 페이지에서 현재 위치를 보여줄 때',avoid:'한 단계짜리 얕은 구조',mistakes:'이동할 수 없는 텍스트로 장식만 하는 것'},
  Drawer:{use:'모바일에서 많은 탐색을 접어둘 때',avoid:'핵심 탐색을 항상 감추면 발견성이 떨어진다',mistakes:'드로어 안에서 또 드로어를 여는 중첩'},
  Card:{use:'독립된 정보 단위(상품·글·기능)를 나열할 때',avoid:'행 단위로 비교해야 하는 데이터(표가 낫다)',mistakes:'카드 하나에 행동 버튼을 여러 개 넣는 것'},
  Table:{use:'정렬·비교·수치가 중심일 때',avoid:'이미지·스토리 위주의 콘텐츠',mistakes:'정렬 가능한 헤더임을 전혀 알려주지 않는 것'},
  Timeline:{use:'시간 순서나 진행 상황을 보여줄 때',avoid:'순서가 무의미한 단순 목록',mistakes:'날짜만 나열하고 맥락을 생략하는 것'},
  Kanban:{use:'작업 상태를 단계로 나눠 관리할 때',avoid:'단계가 두 개뿐인 단순 흐름',mistakes:'카드 이동이 불가능한 정적인 보드'},
  Carousel:{use:'시각 콘텐츠를 순환 전시할 때',avoid:'중요 정보를 슬라이드에만 숨길 때',mistakes:'자동 재생에 핵심 콘텐츠를 맡기는 것'},
  Modal:{use:'사용자의 중요한 결정·확인이 필요할 때',avoid:'긴 콘텐츠나 복잡한 폼(별도 페이지가 낫다)',mistakes:'모달 안에 또 모달을 여는 중첩'},
  Toast:{use:'짧고 가벼운 상태 피드백(저장·삭제)',avoid:'되돌릴 수 없는 중대한 결과는 모달로',mistakes:'여러 개를 동시에 쌓아 올리는 것'},
  Tooltip:{use:'요소 옆에 붙이는 짧은 보충 설명',avoid:'필수 정보를 툴팁에만 넣는 것',mistakes:'호버가 없는 모바일에서만 동작하게 만드는 것'},
  Alert:{use:'상태를 즉시 알릴 때(정보·성공·경고·오류)',avoid:'사소한 변화마다 전체 배너를 띄우는 것',mistakes:'모든 알림을 같은 색·레벨로 처리하는 것'},
  Search:{use:'목록이 길어 필터링이 필요할 때',avoid:'아이템이 10개 미만일 때',mistakes:'결과가 없을 때의 안내(빈 상태)가 없는 것'},
  Form:{use:'구조화된 데이터 입력이 필요할 때',avoid:'한 줄 답변에 폼 전체를 쓰는 것',mistakes:'라벨 없이 placeholder에만 의존하는 것'},
  'Date Picker':{use:'달력 기반의 날짜 선택이 자연스러울 때',avoid:'항상 같은 날짜만 고를 때(선택 비용이 커진다)',mistakes:'키보드 입력과 스크린리더를 배제하는 것'},
  Stepper:{use:'수량 조절 + 진행 단계를 함께 보여줄 때',avoid:'단계가 한두 개뿐인 흐름',mistakes:'단계 표시가 실제 진행 상태와 어긋나는 것'},
};

/* ============================================================
   STYLE COMPARE LAB — 같은 콘텐츠, 다른 렌더 레시피
   ============================================================ */
const CMP_CONTENT={brand:'acme',head:'Design that works.',sub:'Clean ideas, sharp execution.',p:'The same content, rendered in completely different visual languages. Compare structure, not words.',cta:'Get Started',card:'Feature',cardp:'Everything you need, nothing you don\'t.'};
const CMP_RECIPE={
  material:{meta:{type:'Sans · Roboto',color:'Purple primary',layout:'App bar + cards',border:'None',radius:'8px',spacing:'Comfortable',motion:'Ripple'},
    html:`<div style="height:100%;background:#EFE6DD;color:#1c1b1f;font-family:var(--sans);display:flex;flex-direction:column;position:relative"><div style="background:#6A4DDB;color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px;box-shadow:0 2px 4px rgba(0,0,0,.2)"><span style="width:16px;height:2px;background:rgba(255,255,255,.85);box-shadow:0 5px 0 rgba(255,255,255,.85),0 -5px 0 rgba(255,255,255,.85)"></span><b style="font-size:13px;font-weight:500">${CMP_CONTENT.brand}</b><span style="flex:1"></span><span style="font-size:10px;opacity:.8">Work · Studio</span></div><div style="padding:16px 16px 0"><h3 role="presentation" style="font-size:22px;font-weight:500;letter-spacing:0;line-height:1.2">${CMP_CONTENT.head}</h3><p style="font-size:11px;color:#49454f;margin-top:6px;line-height:1.6">${CMP_CONTENT.p}</p></div><div style="flex:1;margin:14px 16px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.14),0 4px 12px rgba(0,0,0,.10);display:grid;place-items:center;color:#c3bfc9;font-family:var(--mono);font-size:9px;letter-spacing:.1em">IMAGE</div><div style="margin:0 16px 16px;background:#fff;border-radius:8px;padding:13px;box-shadow:0 1px 3px rgba(0,0,0,.14),0 4px 12px rgba(0,0,0,.10)"><b style="font-size:12px;font-weight:500">${CMP_CONTENT.card}</b><p style="font-size:9.5px;color:#49454f;margin:4px 0 10px">${CMP_CONTENT.cardp}</p><span style="display:inline-block;color:#6A4DDB;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">${CMP_CONTENT.cta}</span></div><div style="position:absolute;right:16px;bottom:74px;width:34px;height:34px;border-radius:50%;background:#6A4DDB;color:#fff;display:grid;place-items:center;font-size:18px;box-shadow:0 3px 8px rgba(106,77,219,.5)">+</div></div>`},
  'material-you':{meta:{type:'Sans · rounded',color:'Extracted pastel',layout:'Pill blocks',border:'None',radius:'24px',spacing:'Airy',motion:'Springy'},
    html:`<div style="height:100%;background:#DCEFE5;color:#0d2a1f;font-family:var(--sans);display:flex;flex-direction:column;padding:14px;gap:10px"><div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.6);border-radius:999px;padding:8px 14px"><b style="font-size:12px;font-weight:600">${CMP_CONTENT.brand}</b><span style="flex:1"></span><span style="font-size:9px;background:#7FC8A9;padding:5px 11px;border-radius:999px">${CMP_CONTENT.cta}</span></div><div style="background:#7FC8A9;border-radius:24px;padding:16px"><h3 role="presentation" style="font-size:21px;font-weight:600;line-height:1.15">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:#12402f;margin-top:6px;line-height:1.6">${CMP_CONTENT.p}</p></div><div style="flex:1;background:#fff;border-radius:24px;display:grid;place-items:center;color:#b6cfc4;font-family:var(--mono);font-size:9px;letter-spacing:.1em">IMAGE</div><div style="background:#F5B7A8;border-radius:24px;padding:14px"><b style="font-size:12px;font-weight:600;display:block">${CMP_CONTENT.card}</b><span style="font-size:9.5px;color:#5c2b20;display:block;margin:3px 0 9px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:rgba(13,42,31,.14);font-size:9px;padding:6px 13px;border-radius:999px">Learn more</span></div></div>`},
  fluent:{meta:{type:'Sans · Segoe',color:'Translucent blue',layout:'Layered panels',border:'1px light',radius:'6px',spacing:'Compact',motion:'Reveal'},
    html:`<div style="height:100%;background:linear-gradient(140deg,#2B4A7E,#5C7FB8 55%,#8FA9CE);color:#fff;font-family:var(--sans);display:flex;flex-direction:column;padding:14px;gap:9px"><div style="background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:6px;padding:9px 12px;display:flex;align-items:center;gap:9px;backdrop-filter:blur(8px)"><b style="font-size:12px;font-weight:600">${CMP_CONTENT.brand}</b><span style="flex:1"></span><span style="font-size:9px;opacity:.85">Work · Studio</span><span style="font-size:9px;background:rgba(255,255,255,.24);border:1px solid rgba(255,255,255,.35);padding:4px 9px;border-radius:6px">${CMP_CONTENT.cta}</span></div><div style="background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.26);border-radius:6px;padding:14px;backdrop-filter:blur(8px)"><h3 role="presentation" style="font-size:21px;font-weight:600;letter-spacing:-.01em;line-height:1.15">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:rgba(255,255,255,.82);margin-top:6px;line-height:1.6">${CMP_CONTENT.p}</p></div><div style="flex:1;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);border-radius:6px;display:grid;place-items:center;font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:rgba(255,255,255,.6)">IMAGE</div><div style="background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:6px;padding:12px;backdrop-filter:blur(8px)"><b style="font-size:11.5px;display:block">${CMP_CONTENT.card}</b><span style="font-size:9px;color:rgba(255,255,255,.78);display:block;margin:3px 0 9px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:#4A7DE6;font-size:9px;font-weight:600;padding:5px 11px;border-radius:6px">Learn more</span></div></div>`},
  'corp-memphis':{meta:{type:'Sans · geometric',color:'Blue / coral flat',layout:'Illustration led',border:'None',radius:'14px',spacing:'Loose',motion:'Gentle'},
    html:`<div style="height:100%;background:#F4F3FF;color:#241C4C;font-family:var(--sans);display:flex;flex-direction:column;padding:16px;gap:11px"><div style="display:flex;align-items:center;gap:9px"><span style="width:20px;height:20px;border-radius:50%;background:#6C63FF"></span><b style="font-size:13px;font-weight:700">${CMP_CONTENT.brand}</b><span style="flex:1"></span><span style="font-size:9px;background:#6C63FF;color:#fff;padding:6px 13px;border-radius:999px;font-weight:600">${CMP_CONTENT.cta}</span></div><h3 role="presentation" style="font-size:21px;font-weight:700;line-height:1.15;letter-spacing:-.01em">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:#6B648F;line-height:1.65">${CMP_CONTENT.p}</p><div style="flex:1;background:#EDEAFF;border-radius:14px;position:relative;overflow:hidden"><span style="position:absolute;left:22%;bottom:0;width:26px;height:52px;background:#6C63FF;border-radius:13px 13px 0 0"></span><span style="position:absolute;left:20%;bottom:46px;width:20px;height:20px;border-radius:50%;background:#8F87FF"></span><span style="position:absolute;left:34%;bottom:0;width:56px;height:16px;background:#FF8A65;border-radius:8px"></span><span style="position:absolute;right:16%;bottom:0;width:24px;height:70px;background:#4ECDC4;border-radius:12px 12px 0 0"></span><span style="position:absolute;right:15%;bottom:64px;width:18px;height:18px;border-radius:50%;background:#7FE0D8"></span><span style="position:absolute;right:30px;top:16px;width:34px;height:34px;border-radius:50%;background:#FFD166"></span></div><div style="background:#fff;border-radius:14px;padding:13px"><b style="font-size:12px;font-weight:700;display:block">${CMP_CONTENT.card}</b><span style="font-size:9.5px;color:#6B648F;display:block;margin:3px 0 9px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;color:#6C63FF;font-size:10px;font-weight:700">Learn more →</span></div></div>`},
  clay:{meta:{type:'Sans · rounded',color:'Pastel lilac',layout:'Puffy blocks',border:'None',radius:'26px',spacing:'Padded',motion:'Squish'},
    html:`<div style="height:100%;background:#EDE7FB;color:#3A3160;font-family:var(--sans);display:flex;flex-direction:column;padding:15px;gap:11px"><div style="background:#F7F3FF;border-radius:26px;padding:10px 15px;display:flex;align-items:center;gap:9px;box-shadow:inset 0 -5px 10px rgba(160,140,220,.28),inset 0 5px 10px rgba(255,255,255,.9),0 8px 18px rgba(120,100,190,.20)"><b style="font-size:12px;font-weight:700">${CMP_CONTENT.brand}</b><span style="flex:1"></span><span style="font-size:9px;color:#7A6BB8">Work · Studio</span></div><div style="background:#F7F3FF;border-radius:26px;padding:16px;box-shadow:inset 0 -6px 12px rgba(160,140,220,.26),inset 0 6px 12px rgba(255,255,255,.9),0 10px 22px rgba(120,100,190,.20)"><h3 role="presentation" style="font-size:20px;font-weight:700;line-height:1.18">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:#7A6BB8;margin-top:6px;line-height:1.6">${CMP_CONTENT.p}</p></div><div style="flex:1;background:#DCCFF7;border-radius:26px;display:grid;place-items:center;font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:#9585C7;box-shadow:inset 0 -6px 12px rgba(150,130,210,.3),inset 0 6px 12px rgba(255,255,255,.75)">IMAGE</div><div style="background:#FFB4A2;border-radius:26px;padding:14px;box-shadow:inset 0 -6px 12px rgba(200,120,100,.26),inset 0 6px 12px rgba(255,255,255,.7),0 10px 22px rgba(190,120,110,.24)"><b style="font-size:12px;font-weight:700;display:block;color:#57291F">${CMP_CONTENT.card}</b><span style="font-size:9.5px;color:#8A4838;display:block;margin:3px 0 9px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:#F7F3FF;color:#3A3160;font-size:9px;font-weight:700;padding:6px 13px;border-radius:999px">${CMP_CONTENT.cta}</span></div></div>`},
  skeuo:{meta:{type:'Serif · shadowed',color:'Leather & brass',layout:'Panelled',border:'Beveled 1px',radius:'10px',spacing:'Tight',motion:'Press'},
    html:`<div style="height:100%;background:linear-gradient(180deg,#9C6B3C,#7A4F27);color:#FFF6E8;font-family:Georgia,serif;display:flex;flex-direction:column;padding:13px;gap:9px;box-shadow:inset 0 0 40px rgba(0,0,0,.35)"><div style="background:linear-gradient(180deg,#4A3520,#31210F);border:1px solid #22160A;border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:9px;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 3px 6px rgba(0,0,0,.4)"><b style="font-size:12px;text-shadow:0 1px 1px rgba(0,0,0,.6)">${CMP_CONTENT.brand}</b><span style="flex:1"></span><span style="font-size:9px;color:#D8BE93">Work · Studio</span></div><div style="background:#EFE3CE;color:#3A2A18;border:1px solid #B79A6C;border-radius:10px;padding:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 4px 8px rgba(0,0,0,.35)"><h3 role="presentation" style="font-size:19px;font-weight:700;line-height:1.2;text-shadow:0 1px 0 rgba(255,255,255,.7)">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:#6B5539;margin-top:6px;line-height:1.6">${CMP_CONTENT.p}</p></div><div style="flex:1;border:1px solid #22160A;border-radius:10px;background:repeating-linear-gradient(45deg,#5C4126,#5C4126 3px,#553C22 3px,#553C22 6px);display:grid;place-items:center;font-size:9px;letter-spacing:.14em;color:#C9A971;box-shadow:inset 0 2px 6px rgba(0,0,0,.5)">IMAGE</div><div style="background:#EFE3CE;color:#3A2A18;border:1px solid #B79A6C;border-radius:10px;padding:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 4px 8px rgba(0,0,0,.35)"><b style="font-size:11.5px;display:block">${CMP_CONTENT.card}</b><span style="font-size:9px;color:#6B5539;display:block;margin:3px 0 9px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:linear-gradient(180deg,#C89A4E,#9A6F2C);color:#FFF6E8;font-size:9.5px;font-weight:700;padding:6px 13px;border-radius:8px;border:1px solid #6E4C18;text-shadow:0 1px 1px rgba(0,0,0,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 2px 4px rgba(0,0,0,.4)">${CMP_CONTENT.cta}</span></div></div>`},
  flat:{meta:{type:'Sans · bold',color:'Saturated solids',layout:'Color blocks',border:'None',radius:'0',spacing:'Even',motion:'Instant'},
    html:`<div style="height:100%;background:#ECF0F1;color:#2C3E50;font-family:var(--sans);display:flex;flex-direction:column"><div style="background:#2C3E50;color:#fff;padding:11px 15px;display:flex;align-items:center;gap:9px"><span style="width:13px;height:13px;background:#1ABC9C"></span><b style="font-size:12px;font-weight:700">${CMP_CONTENT.brand}</b><span style="flex:1"></span><span style="font-size:9px;opacity:.75">Work · Studio</span><span style="font-size:9px;background:#1ABC9C;padding:5px 10px;font-weight:600">${CMP_CONTENT.cta}</span></div><div style="padding:16px 15px 0"><h3 role="presentation" style="font-size:22px;font-weight:700;line-height:1.15;letter-spacing:-.01em">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:#7F8C8D;margin-top:6px;line-height:1.6">${CMP_CONTENT.p}</p></div><div style="display:flex;margin:13px 15px 0"><span style="flex:1;height:34px;background:#E74C3C"></span><span style="flex:1;height:34px;background:#3498DB"></span><span style="flex:1;height:34px;background:#F1C40F"></span><span style="flex:1;height:34px;background:#9B59B6"></span></div><div style="flex:1;margin:13px 15px;background:#BDC3C7;display:grid;place-items:center;color:#fff;font-family:var(--mono);font-size:9px;letter-spacing:.1em">IMAGE</div><div style="margin:0 15px 15px;background:#fff;padding:13px"><b style="font-size:12px;font-weight:700;display:block">${CMP_CONTENT.card}</b><span style="font-size:9.5px;color:#7F8C8D;display:block;margin:3px 0 9px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:#E74C3C;color:#fff;font-size:9.5px;font-weight:600;padding:6px 13px">Learn more</span></div></div>`},
  frutiger:{meta:{type:'Sans · humanist',color:'Aqua gradient',layout:'Glossy panels',border:'1px white',radius:'14px',spacing:'Rounded',motion:'Shine'},
    html:`<div style="height:100%;background:linear-gradient(180deg,#8FD7FF,#2A7FC4 60%,#0F4E8A);color:#fff;font-family:var(--sans);display:flex;flex-direction:column;padding:14px;gap:10px;position:relative;overflow:hidden"><span style="position:absolute;left:-30px;top:-40px;width:150px;height:110px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.6),transparent 65%)"></span><div style="position:relative;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.18));border:1px solid rgba(255,255,255,.7);border-radius:14px;padding:9px 13px;display:flex;align-items:center;gap:9px;box-shadow:0 3px 8px rgba(0,40,90,.3)"><b style="font-size:12px;color:#0B3E6F;text-shadow:0 1px 0 rgba(255,255,255,.6)">${CMP_CONTENT.brand}</b><span style="flex:1"></span><span style="font-size:9px;color:#0B3E6F">Work · Studio</span></div><div style="position:relative"><h3 role="presentation" style="font-size:21px;font-weight:700;line-height:1.15;text-shadow:0 2px 3px rgba(0,40,90,.45)">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:rgba(255,255,255,.9);margin-top:6px;line-height:1.6">${CMP_CONTENT.p}</p></div><div style="position:relative;flex:1;border-radius:14px;border:1px solid rgba(255,255,255,.6);background:linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,.08));display:grid;place-items:center;font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:rgba(255,255,255,.85);box-shadow:inset 0 1px 0 rgba(255,255,255,.8)">IMAGE</div><div style="position:relative;background:linear-gradient(180deg,rgba(255,255,255,.6),rgba(255,255,255,.25));border:1px solid rgba(255,255,255,.75);border-radius:14px;padding:12px;color:#0B3E6F;box-shadow:0 4px 10px rgba(0,40,90,.3)"><b style="font-size:11.5px;display:block">${CMP_CONTENT.card}</b><span style="font-size:9px;display:block;margin:3px 0 9px;color:#2A5E8C">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:linear-gradient(180deg,#7FD3F7,#2A8FD4);color:#fff;font-size:9.5px;font-weight:700;padding:6px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.8);text-shadow:0 1px 1px rgba(0,40,90,.5)">${CMP_CONTENT.cta}</span></div></div>`},
  destijl:{meta:{type:'Sans · geometric',color:'Primaries + black',layout:'Rectangle grid',border:'Black 3px',radius:'0',spacing:'Modular',motion:'Instant'},
    html:`<div style="height:100%;background:#F4F1E9;color:#111;font-family:var(--sans);display:flex;flex-direction:column;padding:12px;gap:4px"><div style="display:flex;gap:4px;align-items:stretch"><div style="background:#111;color:#F4F1E9;padding:8px 12px"><b style="font-size:12px;font-weight:700">${CMP_CONTENT.brand}</b></div><div style="flex:1;border:3px solid #111;display:flex;align-items:center;padding:0 10px;font-size:9px;letter-spacing:.06em">Work · Studio · Contact</div><div style="background:#D83124;color:#fff;display:grid;place-items:center;padding:0 12px;font-size:9px;font-weight:700">${CMP_CONTENT.cta}</div></div><div style="border:3px solid #111;padding:14px"><h3 role="presentation" style="font-size:21px;font-weight:700;line-height:1.1;letter-spacing:-.01em">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:#333;margin-top:6px;line-height:1.55;max-width:88%">${CMP_CONTENT.p}</p></div><div style="flex:1;display:flex;gap:4px"><div style="flex:1.5;display:flex;flex-direction:column;gap:4px"><div style="flex:1;background:#D83124"></div><div style="height:34%;border:3px solid #111"></div></div><div style="flex:1;display:flex;flex-direction:column;gap:4px"><div style="height:30%;background:#F2C500"></div><div style="flex:1;border:3px solid #111;display:grid;place-items:center;font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:#777">IMAGE</div><div style="height:26%;background:#0B4EA2"></div></div></div><div style="border:3px solid #111;padding:11px;display:flex;align-items:center;gap:10px"><div style="flex:1"><b style="font-size:11.5px;display:block">${CMP_CONTENT.card}</b><span style="font-size:9px;color:#444">${CMP_CONTENT.cardp}</span></div><span style="background:#0B4EA2;color:#fff;font-size:9px;font-weight:700;padding:6px 11px">Learn more</span></div></div>`},
  artdeco:{meta:{type:'Serif · caps',color:'Black & gold',layout:'Symmetric',border:'Gold 1px',radius:'0',spacing:'Formal',motion:'Slow fade'},
    html:`<div style="height:100%;background:#0E0D0B;color:#E8D9A8;font-family:Georgia,serif;display:flex;flex-direction:column;padding:16px;gap:10px;text-align:center"><div style="display:flex;align-items:center;gap:10px;border-bottom:1px solid #B99A4A;padding-bottom:9px"><span style="flex:1;height:1px;background:#B99A4A"></span><b style="font-size:12px;letter-spacing:.28em;text-transform:uppercase">${CMP_CONTENT.brand}</b><span style="flex:1;height:1px;background:#B99A4A"></span></div><div><h3 role="presentation" style="font-size:20px;font-weight:400;letter-spacing:.1em;text-transform:uppercase;line-height:1.3;color:#D9BE6E">${CMP_CONTENT.head}</h3><p style="font-size:9.5px;color:#9C8C63;margin-top:7px;line-height:1.75;letter-spacing:.04em">${CMP_CONTENT.p}</p></div><div style="flex:1;border:1px solid #B99A4A;position:relative;display:grid;place-items:center"><span style="position:absolute;inset:5px;border:1px solid rgba(185,154,74,.4)"></span><span style="font-family:var(--mono);font-size:9px;letter-spacing:.22em;color:#8A7A52">IMAGE</span></div><div style="display:flex;align-items:center;justify-content:center;gap:8px"><span style="width:34px;height:1px;background:#B99A4A"></span><span style="font-size:9px;letter-spacing:.2em;color:#B99A4A">◆</span><span style="width:34px;height:1px;background:#B99A4A"></span></div><div style="border:1px solid #B99A4A;padding:12px"><b style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;display:block;color:#D9BE6E">${CMP_CONTENT.card}</b><span style="font-size:9px;color:#9C8C63;display:block;margin:5px 0 10px;letter-spacing:.03em">${CMP_CONTENT.cardp}</span><span style="display:inline-block;border:1px solid #B99A4A;color:#E8D9A8;font-size:9px;letter-spacing:.2em;text-transform:uppercase;padding:6px 15px">${CMP_CONTENT.cta}</span></div></div>`},
  construct:{meta:{type:'Sans · condensed caps',color:'Red · black · cream',layout:'Diagonal',border:'Black 4px',radius:'0',spacing:'Dynamic',motion:'Instant'},
    html:`<div style="height:100%;background:#EDE7DC;color:#141414;font-family:'Helvetica Neue',Arial,sans-serif;display:flex;flex-direction:column;padding:14px;gap:8px;position:relative;overflow:hidden"><span style="position:absolute;right:-60px;top:-30px;width:190px;height:190px;background:#C8281E;transform:rotate(28deg)"></span><span style="position:absolute;left:-40px;bottom:-50px;width:150px;height:150px;background:#141414;transform:rotate(20deg)"></span><div style="position:relative;display:flex;align-items:center;gap:9px;border-bottom:4px solid #141414;padding-bottom:8px"><b style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${CMP_CONTENT.brand}</b><span style="flex:1"></span><span style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Work · Studio</span></div><div style="position:relative"><h3 role="presentation" style="font-size:24px;font-weight:800;text-transform:uppercase;letter-spacing:-.01em;line-height:.95;transform:skewY(-3deg);transform-origin:left">${CMP_CONTENT.head}</h3><p style="font-size:9.5px;color:#3A3A3A;margin-top:12px;line-height:1.55;max-width:74%;font-weight:600">${CMP_CONTENT.p}</p></div><div style="position:relative;flex:1;border:4px solid #141414;display:grid;place-items:center;background:#EDE7DC;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.16em">IMAGE</div><div style="position:relative;background:#141414;color:#EDE7DC;padding:11px;display:flex;align-items:center;gap:10px"><div style="flex:1"><b style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;display:block">${CMP_CONTENT.card}</b><span style="font-size:9px;color:#B9B2A6">${CMP_CONTENT.cardp}</span></div><span style="background:#C8281E;color:#fff;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:6px 12px">${CMP_CONTENT.cta}</span></div></div>`},
  y2k:{meta:{type:'Sans · techno',color:'Chrome & cyan',layout:'Bevelled boxes',border:'Silver 2px',radius:'12px',spacing:'Bubbly',motion:'Shine'},
    html:`<div style="height:100%;background:linear-gradient(160deg,#0B1A3A,#123A6E 55%,#0B1A3A);color:#E6F4FF;font-family:var(--sans);display:flex;flex-direction:column;padding:13px;gap:9px"><div style="background:linear-gradient(180deg,#F2F6FA,#B8C6D6 48%,#8E9DAE);border:2px solid #6E7C8C;border-radius:12px;padding:8px 12px;display:flex;align-items:center;gap:9px;box-shadow:inset 0 1px 0 #fff,0 3px 7px rgba(0,0,0,.45)"><b style="font-size:12px;font-weight:800;color:#13284A;text-shadow:0 1px 0 rgba(255,255,255,.8)">${CMP_CONTENT.brand}</b><span style="flex:1"></span><span style="font-size:9px;color:#43566E;font-weight:600">Work · Studio</span></div><div><h3 role="presentation" style="font-size:21px;font-weight:800;line-height:1.12;background:linear-gradient(180deg,#FFFFFF,#7FD8FF);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 2px 6px rgba(0,180,255,.4)">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:#9FC4E6;margin-top:6px;line-height:1.6">${CMP_CONTENT.p}</p></div><div style="flex:1;border:2px solid #6E7C8C;border-radius:12px;background:linear-gradient(180deg,rgba(160,220,255,.25),rgba(10,30,60,.5));display:grid;place-items:center;font-family:var(--mono);font-size:9px;letter-spacing:.14em;color:#8FD0FF;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)">IMAGE</div><div style="background:linear-gradient(180deg,#F2F6FA,#C3D0DE);border:2px solid #6E7C8C;border-radius:12px;padding:12px;color:#13284A;box-shadow:inset 0 1px 0 #fff,0 3px 7px rgba(0,0,0,.4)"><b style="font-size:11.5px;font-weight:800;display:block">${CMP_CONTENT.card}</b><span style="font-size:9px;color:#43566E;display:block;margin:3px 0 9px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:linear-gradient(180deg,#59D0FF,#1C7FD6);color:#fff;font-size:9.5px;font-weight:800;padding:6px 14px;border-radius:999px;border:1px solid #17608F;text-shadow:0 1px 1px rgba(0,0,0,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.6)">${CMP_CONTENT.cta}</span></div></div>`},
  jpminimal:{meta:{type:'Mincho serif',color:'Off-white · one red',layout:'Vast margin',border:'Hairline',radius:'0',spacing:'Extreme',motion:'Slow fade'},
    html:`<div style="height:100%;background:#FAF9F6;color:#222;font-family:'Hiragino Mincho ProN','Noto Serif KR',Georgia,serif;display:flex;flex-direction:column;padding:24px 26px;position:relative"><span style="position:absolute;top:22px;right:26px;width:9px;height:9px;border-radius:50%;background:#C4311B"></span><div style="font-size:8.5px;letter-spacing:.24em;color:#9A968E;font-family:var(--sans)">${CMP_CONTENT.brand.toUpperCase()} · 静寂</div><h3 role="presentation" style="font-size:19px;font-weight:400;line-height:1.5;margin-top:40px;letter-spacing:.02em">${CMP_CONTENT.head}</h3><div style="width:30px;height:1px;background:#CFCAC0;margin-top:20px"></div><p style="font-size:9.5px;color:#A29D93;margin-top:20px;line-height:2;max-width:62%;font-family:var(--sans)">${CMP_CONTENT.p}</p><div style="flex:1"></div><div style="border-top:1px solid #E6E2DA;padding-top:16px;display:flex;align-items:flex-end;gap:16px"><div style="flex:1"><b style="font-size:11px;font-weight:400;display:block;letter-spacing:.06em">${CMP_CONTENT.card}</b><span style="font-size:8.5px;color:#A29D93;font-family:var(--sans);display:block;margin-top:5px">${CMP_CONTENT.cardp}</span></div><span style="font-size:8.5px;letter-spacing:.2em;color:#C4311B;font-family:var(--sans);white-space:nowrap">${CMP_CONTENT.cta.toUpperCase()} →</span></div></div>`},
  minimal:{meta:{type:'Sans · light',color:'Neutral only',layout:'Centered · airy',border:'None',radius:'10px',spacing:'Generous',motion:'Fade'},
    html:`<div style="height:100%;background:#FAFAF9;color:#16161A;font-family:var(--sans);display:flex;flex-direction:column;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding-bottom:12px;border-bottom:1px solid rgba(22,22,26,.12)"><b style="font-family:var(--disp);font-size:13px">${CMP_CONTENT.brand}</b><span style="color:#6b6b70">Work · Studio · Contact</span><span style="font-size:10px;border:1px solid #16161A;padding:5px 11px;border-radius:999px">${CMP_CONTENT.cta}</span></div><h3 role="presentation" style="font-family:var(--disp);font-size:27px;font-weight:600;letter-spacing:-.02em;margin:26px 0 6px;line-height:1.08">${CMP_CONTENT.head}</h3><p style="font-size:11.5px;color:#6b6b70;max-width:80%;line-height:1.6">${CMP_CONTENT.p}</p><div style="flex:1;display:grid;place-items:center;margin:18px 0;background:#F1F1EE;border-radius:10px;color:#b5b5b0;font-family:var(--mono);font-size:9px;letter-spacing:.1em">IMAGE</div><div style="display:flex;gap:10px"><div style="flex:1;border:1px solid #E5E5E1;border-radius:10px;padding:12px"><b style="font-size:12px">${CMP_CONTENT.card}</b><p style="font-size:9.5px;color:#6b6b70;margin:4px 0 10px">${CMP_CONTENT.cardp}</p><span style="display:inline-block;background:#16161A;color:#FAFAF9;font-size:9.5px;font-weight:600;padding:6px 12px;border-radius:7px">Learn more</span></div></div></div>`},
  swiss:{meta:{type:'Sans · grotesk',color:'Black / red accent',layout:'Strict grid',border:'Hard 2px',radius:'0',spacing:'Compact',motion:'Instant'},
    html:`<div style="height:100%;background:#F4F2EE;color:#111;font-family:'Helvetica Neue',Arial,sans-serif;display:flex;flex-direction:column;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #E2231A;padding-bottom:9px;font-size:10px;font-weight:600;letter-spacing:.12em"><b>${CMP_CONTENT.brand.toUpperCase()}</b><span style="color:#E2231A">ZÜRICH · 01</span></div><h3 role="presentation" style="font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:.98;margin:22px 0 10px">${CMP_CONTENT.head}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px"><span style="height:18px;background:#111"></span><span style="height:18px;background:#E2231A"></span><span style="height:18px;border:2px solid #111"></span><span style="height:18px;background:#111"></span></div><p style="font-size:10.5px;color:#333;line-height:1.55;max-width:85%">${CMP_CONTENT.p}</p><div style="flex:1;display:grid;place-items:center;margin:14px 0;background:#111;color:#F4F2EE;font-family:var(--mono);font-size:9px;letter-spacing:.14em">BILD · IMAGE</div><div style="display:flex;gap:8px"><div style="flex:1;border:2px solid #111;padding:10px"><b style="font-size:11px;display:block">${CMP_CONTENT.card}</b><span style="font-size:9px;color:#444;display:block;margin:3px 0 8px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:#E2231A;color:#fff;font-size:9px;font-weight:700;padding:5px 11px">${CMP_CONTENT.cta}</span></div></div></div>`},
  brutal:{meta:{type:'Display · bold',color:'Yellow on black',layout:'Asymmetric',border:'Hard 3px',radius:'0',spacing:'Compressed',motion:'Instant'},
    html:`<div style="height:100%;background:#000;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;display:flex;flex-direction:column;padding:20px;border:3px solid #F6EF43;position:relative"><span style="align-self:flex-start;background:#F6EF43;color:#000;font-weight:700;font-size:9px;letter-spacing:.1em;padding:3px 8px">RAW.</span><h3 role="presentation" style="font-size:30px;font-weight:700;text-transform:uppercase;line-height:.92;margin:16px 0 6px;letter-spacing:-.02em">${CMP_CONTENT.head}<br>NO. MERCY.</h3><p style="color:#bbb;font-size:10.5px;max-width:82%;line-height:1.5">${CMP_CONTENT.p}</p><div style="flex:1;display:grid;place-items:center;margin:14px 0;border:3px solid #F6EF43;color:#F6EF43;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.14em">[ IMAGE ]</div><div style="border:3px solid #F6EF43;padding:10px"><b style="font-size:11px;display:block;text-transform:uppercase">${CMP_CONTENT.card}</b><span style="font-size:9px;color:#bbb;display:block;margin:3px 0 9px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:#F6EF43;color:#000;font-weight:700;font-size:10px;padding:6px 12px">${CMP_CONTENT.cta.toUpperCase()} ▸</span></div></div>`},
  neobrutal:{meta:{type:'Sans · bold',color:'Bright palette',layout:'Stacked cards',border:'2.5px black',radius:'12px',spacing:'Playful',motion:'Bounce'},
    html:`<div style="height:100%;background:#FFF7E0;color:#111;font-family:var(--sans);display:flex;flex-direction:column;padding:18px;gap:10px"><div style="background:#fff;border:2.5px solid #111;border-radius:12px;padding:11px 13px;box-shadow:4px 4px 0 #111;display:flex;align-items:center;justify-content:space-between"><b style="font-family:var(--disp);font-size:13px">${CMP_CONTENT.brand}</b><span style="font-size:8px;color:#555">Work · Studio</span><span style="background:#111;color:#fff;font-size:9px;font-weight:600;padding:5px 10px;border-radius:8px">${CMP_CONTENT.cta}</span></div><div style="background:#fff;border:2.5px solid #111;border-radius:12px;padding:12px;box-shadow:4px 4px 0 #111"><h3 role="presentation" style="font-family:var(--disp);font-size:22px;font-weight:700;letter-spacing:-.02em">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:#555;margin-top:5px;line-height:1.55">${CMP_CONTENT.p}</p></div><div style="flex:1;border:2.5px solid #111;border-radius:12px;box-shadow:4px 4px 0 #111;background:repeating-linear-gradient(45deg,#FFE08A,#FFE08A 8px,#FFD23F 8px,#FFD23F 16px);display:grid;place-items:center;font-family:var(--mono);font-size:9px;font-weight:700">IMAGE</div><div style="background:#FF5D5D;border:2.5px solid #111;border-radius:12px;padding:11px;box-shadow:4px 4px 0 #111"><b style="font-family:var(--disp);font-size:12px;display:block">${CMP_CONTENT.card}</b><span style="font-size:9px;color:#5a1111;display:block;margin:3px 0 8px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:#111;color:#FFD23F;font-size:9px;font-weight:700;padding:5px 11px;border-radius:7px">${CMP_CONTENT.cta}</span></div></div>`},
  glass:{meta:{type:'Sans',color:'Gradient background',layout:'Floating panels',border:'1px white',radius:'16px',spacing:'Layered',motion:'Float'},
    html:`<div style="height:100%;background:linear-gradient(120deg,#FFD3C2,#FFB59A 40%,#B7A6FF 75%,#8FD6FF);font-family:var(--sans);display:flex;flex-direction:column;padding:18px;position:relative;overflow:hidden"><span style="position:absolute;width:52px;height:52px;border-radius:18px;background:rgba(255,255,255,.55);top:-12px;left:-8px;transform:rotate(14deg)"></span><span style="position:absolute;width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.35);bottom:-10px;right:-6px;transform:rotate(-12deg)"></span><div style="background:rgba(255,255,255,.42);border:1px solid rgba(255,255,255,.6);border-radius:14px;padding:14px;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 12px 40px rgba(0,0,0,.14);color:#241a35;display:flex;flex-direction:column;flex:1"><div style="display:flex;justify-content:space-between;align-items:center;font-size:11px"><b style="font-family:var(--disp);font-size:13px">${CMP_CONTENT.brand}</b><span style="opacity:.7">Work · Studio</span></div><h3 role="presentation" style="font-family:var(--disp);font-size:24px;font-weight:600;margin:22px 0 6px">${CMP_CONTENT.head}</h3><p style="font-size:11px;opacity:.8;line-height:1.6">${CMP_CONTENT.p}</p><div style="flex:1;border-radius:12px;background:rgba(255,255,255,.35);border:1px solid rgba(255,255,255,.5);display:grid;place-items:center;margin:16px 0;font-family:var(--mono);font-size:9px;color:#3a2b52">IMAGE</div><div style="display:flex;gap:10px"><div style="flex:1;background:rgba(255,255,255,.45);border:1px solid rgba(255,255,255,.6);border-radius:12px;padding:11px"><b style="font-size:12px">${CMP_CONTENT.card}</b><p style="font-size:9px;opacity:.8;margin:4px 0 10px">${CMP_CONTENT.cardp}</p><span style="background:#fff;color:#241a35;font-weight:700;font-size:9px;padding:6px 11px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.12)">${CMP_CONTENT.cta}</span></div></div></div></div>`},
  neumorph:{meta:{type:'Sans · soft',color:'Same-tone gray',layout:'Pressed panels',border:'None',radius:'16px',spacing:'Even',motion:'Soft'},
    html:`<div style="height:100%;background:#E2E4EC;color:#5B6270;font-family:var(--sans);display:flex;flex-direction:column;padding:20px;gap:12px"><div style="background:#E2E4EC;border-radius:14px;padding:13px 15px;box-shadow:-6px -6px 14px rgba(255,255,255,.75),6px 6px 14px rgba(0,0,0,.13);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--disp);font-size:13px;color:#3E4450">${CMP_CONTENT.brand}</b><span style="font-size:8.5px">Work · Studio</span></div><div style="background:#E2E4EC;border-radius:14px;padding:16px;box-shadow:inset -4px -4px 10px rgba(255,255,255,.7),inset 4px 4px 10px rgba(0,0,0,.09)"><h3 role="presentation" style="font-size:21px;font-weight:600;color:#3E4450">${CMP_CONTENT.head}</h3><p style="font-size:10px;margin-top:6px;line-height:1.6">${CMP_CONTENT.p}</p></div><div style="flex:1;border-radius:14px;background:#E2E4EC;box-shadow:inset 4px 4px 10px rgba(0,0,0,.1),inset -4px -4px 10px rgba(255,255,255,.7);display:grid;place-items:center;font-family:var(--mono);font-size:9px">IMAGE</div><div style="background:#E2E4EC;border-radius:14px;padding:12px 14px;box-shadow:-6px -6px 14px rgba(255,255,255,.75),6px 6px 14px rgba(0,0,0,.13);display:flex;align-items:center;justify-content:space-between"><div><b style="font-size:11px;color:#3E4450;display:block">${CMP_CONTENT.card}</b><span style="font-size:8.5px">${CMP_CONTENT.cardp}</span></div><span style="background:#E2E4EC;border-radius:50%;width:34px;height:34px;box-shadow:inset -4px -4px 8px rgba(255,255,255,.7),inset 4px 4px 8px rgba(0,0,0,.1);display:grid;place-items:center;font-size:12px">→</span></div></div>`},
  corporate:{meta:{type:'Sans · medium',color:'Navy / white',layout:'Formal grid',border:'1px',radius:'4px',spacing:'Disciplined',motion:'Instant'},
    html:`<div style="height:100%;background:#0E1B3D;color:#fff;font-family:var(--sans);display:flex;flex-direction:column;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;font-size:9.5px;letter-spacing:.06em"><b style="font-size:11px;letter-spacing:.05em">${CMP_CONTENT.brand.toUpperCase()} CORPORATE</b><span style="color:#9FB0D9">FY 2026</span></div><h3 role="presentation" style="font-size:23px;font-weight:600;letter-spacing:-.01em;margin:24px 0 8px">${CMP_CONTENT.head}</h3><p style="font-size:10px;color:#C3CEF0;line-height:1.6;max-width:86%">${CMP_CONTENT.p}</p><div style="flex:1;display:flex;align-items:flex-end;gap:6px;margin:16px 0"><span style="flex:1;height:60%;background:#3E72FF"></span><span style="flex:1;height:88%;background:#5C8AFF"></span><span style="flex:1;height:72%;background:#3E72FF"></span><span style="flex:1;height:95%;background:#7BA1FF"></span></div><div style="border-top:1px solid rgba(255,255,255,.2);padding-top:10px;display:flex;gap:8px"><div style="flex:1;background:#122A52;border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:9px"><b style="font-size:10.5px;display:block">${CMP_CONTENT.card}</b><span style="font-size:8px;color:#9FB0D9;display:block;margin:3px 0 7px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:#3E72FF;font-size:8.5px;font-weight:600;padding:5px 11px;border-radius:4px">${CMP_CONTENT.cta}</span></div></div></div>`},
  editorial:{meta:{type:'Serif',color:'Ink on paper',layout:'Multi-column',border:'Rules',radius:'0',spacing:'Columnar',motion:'Instant'},
    html:`<div style="height:100%;background:#FCFAF6;color:#1b1b1b;font-family:Georgia,'Noto Serif KR',serif;display:flex;flex-direction:column;padding:20px"><div style="font-size:10px;letter-spacing:.24em;color:#8B3A2A;text-transform:uppercase">${CMP_CONTENT.brand}</div><h3 role="presentation" style="font-size:22px;font-weight:700;line-height:1.1;margin:12px 0 8px;max-width:85%">${CMP_CONTENT.head}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;flex:1;margin:8px 0"><div style="font-size:9px;line-height:1.7;color:#444"><b style="float:left;font-size:24px;line-height:.8;padding:3px 5px 0 0;color:#8B3A2A">T</b>${CMP_CONTENT.p}</div><div style="font-size:9px;line-height:1.7;color:#444">Typography governs the pace of reading. The measure, the leading, the margins.</div></div><div style="display:flex;gap:10px;align-items:center;border-top:1px solid #ddd;padding-top:10px"><span style="flex:1;height:26px;background:var(--acc-100);border-radius:3px"></span><div><b style="font-size:11px;display:block">${CMP_CONTENT.card}</b><span style="font-size:8.5px;color:#555;display:block;margin:2px 0 6px">${CMP_CONTENT.cardp}</span><span style="font-family:var(--mono);font-size:9px;border-bottom:1px solid #8B3A2A;color:#8B3A2A">${CMP_CONTENT.cta} →</span></div></div></div>`},
  bauhaus:{meta:{type:'Geometric sans',color:'Primary RGB',layout:'Constructivist',border:'Black rules',radius:'0',spacing:'Balanced',motion:'Instant'},
    html:`<div style="height:100%;background:#F2F0E8;color:#111;font-family:var(--sans);display:flex;flex-direction:column;padding:18px;position:relative;overflow:hidden"><span style="position:absolute;width:56px;height:56px;border-radius:50%;background:#D83124;right:-12px;top:-12px"></span><span style="position:absolute;width:50px;height:50px;background:#0B4EA2;left:-10px;top:-16px;transform:rotate(45deg)"></span><div style="display:flex;justify-content:space-between;align-items:center;position:relative"><b style="font-family:var(--disp);font-size:12px;letter-spacing:.08em">${CMP_CONTENT.brand.toUpperCase()}</b><span style="font-size:8px;letter-spacing:.2em">1926</span></div><h3 role="presentation" style="font-family:var(--disp);font-size:25px;font-weight:700;letter-spacing:-.01em;margin:26px 0 8px;position:relative">${CMP_CONTENT.head}</h3><div style="display:flex;gap:6px;position:relative"><span style="flex:1;height:16px;background:#D83124"></span><span style="flex:1;height:16px;background:#F2C300"></span><span style="flex:1;height:16px;background:#0B4EA2"></span></div><p style="font-size:9.5px;color:#444;margin-top:10px;line-height:1.55;max-width:85%;position:relative">${CMP_CONTENT.p}</p><div style="flex:1;position:relative;display:grid;place-items:center"><div style="width:72px;height:72px;border-radius:50%;border:3px solid #111;display:grid;place-items:center;font-family:var(--mono);font-size:8px;font-weight:700">IMAGE</div></div><div style="position:relative;display:flex;align-items:center;gap:10px"><div style="flex:1;border:3px solid #111;padding:9px"><b style="font-size:10.5px;display:block">${CMP_CONTENT.card}</b><span style="font-size:8px;color:#555;display:block;margin:2px 0 7px">${CMP_CONTENT.cardp}</span></div><span style="background:#D83124;color:#fff;font-weight:700;font-size:9px;padding:6px 10px">${CMP_CONTENT.cta.toUpperCase()}</span></div></div>`},
  retro:{meta:{type:'System sans',color:'Beige / brown',layout:'Window frames',border:'2px',radius:'4px',spacing:'Tight',motion:'Instant'},
    html:`<div style="height:100%;background:#EADFC4;color:#4A3826;font-family:var(--sans);display:flex;flex-direction:column;padding:18px;gap:8px"><div style="background:#F8F2E0;border:2px solid #8A6B4A;border-radius:6px;padding:8px 10px;box-shadow:inset 0 0 0 1px #F0E8D0;display:flex;justify-content:space-between;align-items:center;font-size:9px;font-weight:700"><span>${CMP_CONTENT.brand.toUpperCase()} — welcome</span><span style="background:#6b4f31;color:#F8F2E0;padding:1px 6px;border-radius:3px">✕</span></div><div style="background:#F8F2E0;border:2px solid #8A6B4A;border-radius:6px;padding:11px;box-shadow:inset 0 0 0 1px #F0E8D0"><h3 role="presentation" style="font-size:19px;font-weight:700;color:#3A2A18">${CMP_CONTENT.head}</h3><p style="font-size:9.5px;line-height:1.55;margin-top:5px">${CMP_CONTENT.p}</p></div><div style="flex:1;background:#F8F2E0;border:2px solid #8A6B4A;border-radius:6px;box-shadow:inset 0 0 0 1px #F0E8D0;display:grid;place-items:center;font-family:var(--mono);font-size:8px;color:#8a6b4a">[ IMAGE — est. 1998 ]</div><div style="background:#F8F2E0;border:2px solid #8A6B4A;border-radius:6px;padding:9px;box-shadow:inset 0 0 0 1px #F0E8D0;display:flex;align-items:center;justify-content:space-between"><div><b style="font-size:10.5px">${CMP_CONTENT.card}</b><span style="font-size:8px;display:block;color:#6b4f31">${CMP_CONTENT.cardp}</span></div><span style="background:#6b4f31;color:#F8F2E0;font-size:8.5px;font-weight:700;padding:5px 10px;border-radius:4px">${CMP_CONTENT.cta}</span></div></div>`},
  cyberpunk:{meta:{type:'Display · techno',color:'Cyan / magenta neon',layout:'HUD panels',border:'1.5px neon',radius:'4px',spacing:'Dense',motion:'Glitch'},
    html:`<div style="height:100%;background:#0B0A12;color:#0FF;font-family:'Helvetica Neue',Arial,sans-serif;display:flex;flex-direction:column;padding:18px;position:relative;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:9px;letter-spacing:.14em;color:#FF2FA0;text-shadow:0 0 8px rgba(255,47,160,.8)"><b style="color:#0FF;text-shadow:0 0 10px rgba(0,255,255,.8)">${CMP_CONTENT.brand.toUpperCase()}</b><span>// SYS.ONLINE</span></div><h3 role="presentation" style="font-size:24px;font-weight:800;line-height:.95;letter-spacing:-.01em;margin:20px 0 8px;text-shadow:0 0 12px rgba(0,255,255,.7)">${CMP_CONTENT.head}</h3><p style="font-size:9.5px;color:#8F8FB8;line-height:1.6;max-width:88%">${CMP_CONTENT.p}</p><div style="flex:1;border:1.5px solid #FF2FA0;box-shadow:0 0 14px rgba(255,47,160,.5) inset;border-radius:4px;margin:14px 0;display:grid;place-items:center;font-family:var(--mono);font-size:9px;color:#0FF;text-shadow:0 0 8px rgba(0,255,255,.8)">[ IMG // SECTOR 7G ]</div><div style="display:flex;gap:8px"><div style="flex:1;border:1.5px solid rgba(0,255,255,.6);border-radius:4px;padding:10px;background:rgba(0,255,255,.04)"><b style="font-size:10px;display:block;color:#0FF;text-shadow:0 0 8px rgba(0,255,255,.7)">${CMP_CONTENT.card}</b><span style="font-size:8px;color:#8F8FB8;display:block;margin:3px 0 8px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:#FF2FA0;color:#0B0A12;font-weight:700;font-size:8.5px;padding:5px 10px">${CMP_CONTENT.cta.toUpperCase()} ▸</span></div></div></div>`},
  scandi:{meta:{type:'Sans',color:'Sage / pastel',layout:'Warm minimal',border:'None',radius:'8px',spacing:'Airy',motion:'Gentle'},
    html:`<div style="height:100%;background:#F6F4EC;color:#3E4A3F;font-family:var(--sans);display:flex;flex-direction:column;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;letter-spacing:.06em"><b style="font-family:var(--disp);font-size:13px;color:#3E4A3F">${CMP_CONTENT.brand}</b><span style="color:#9aa391">Work · Studio · Contact</span></div><h3 role="presentation" style="font-family:var(--disp);font-size:23px;font-weight:600;letter-spacing:-.01em;margin:24px 0 8px">${CMP_CONTENT.head}</h3><p style="font-size:10.5px;color:#7c8576;line-height:1.65;max-width:85%">${CMP_CONTENT.p}</p><div style="flex:1;display:flex;gap:8px;margin:16px 0"><span style="flex:1;background:#D9C9AE;border-radius:8px"></span><span style="flex:1;background:#B9C4A8;border-radius:8px"></span></div><div style="background:#fff;border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-s)"><div><b style="font-size:11.5px">${CMP_CONTENT.card}</b><span style="font-size:8.5px;color:#9aa391;display:block;margin:2px 0 7px">${CMP_CONTENT.cardp}</span></div><span style="margin-left:auto;background:#3E4A3F;color:#F6F4EC;font-size:8.5px;font-weight:600;padding:6px 12px;border-radius:7px">${CMP_CONTENT.cta}</span></div></div>`},
  luxury:{meta:{type:'Serif · tracked',color:'Black / gold',layout:'Centered',border:'1px gold',radius:'0',spacing:'Wide',motion:'Slow fade'},
    html:`<div style="height:100%;background:#101010;color:#EDE6D5;font-family:Georgia,serif;display:flex;flex-direction:column;padding:22px;position:relative"><span style="position:absolute;right:20px;top:18px;width:26px;height:26px;border:1px solid #B79A5B;transform:rotate(45deg);opacity:.7"></span><div style="display:flex;justify-content:space-between;font-size:8px;letter-spacing:.3em;color:#B79A5B;font-family:var(--mono)"><span>MAISON</span><span>EST. 1927</span></div><h3 role="presentation" style="font-size:21px;font-weight:400;letter-spacing:.01em;line-height:1.15;margin:26px 0 10px">${CMP_CONTENT.head}</h3><div style="width:34px;height:1px;background:#B79A5B;margin-bottom:10px"></div><p style="font-size:9.5px;color:#8f887a;line-height:1.7;max-width:82%">${CMP_CONTENT.p}</p><div style="flex:1;border:1px solid rgba(183,154,91,.35);margin:18px 0;display:grid;place-items:center;color:#8f887a;font-family:var(--mono);font-size:8px;letter-spacing:.24em">IMAGE</div><div style="border-top:1px solid rgba(183,154,91,.3);padding-top:12px;display:flex;align-items:flex-end;justify-content:space-between"><div><b style="font-size:11px;letter-spacing:.06em;display:block">${CMP_CONTENT.card}</b><span style="font-size:8px;color:#8f887a;display:block;margin-top:3px">${CMP_CONTENT.cardp}</span></div><span style="border:1px solid #B79A5B;color:#B79A5B;font-family:var(--mono);font-size:8px;letter-spacing:.18em;padding:6px 12px">${CMP_CONTENT.cta.toUpperCase()}</span></div></div>`},
  memphis:{meta:{type:'Rounded sans',color:'Pastel + primary',layout:'Pattern-heavy',border:'2px black',radius:'12px',spacing:'Bouncy',motion:'Wiggle'},
    html:`<div style="height:100%;background:#FFE8D6;color:#2B2B2B;font-family:var(--sans);display:flex;flex-direction:column;padding:18px;position:relative;overflow:hidden"><span style="position:absolute;width:38px;height:38px;border-radius:10px;background:#FF6B5E;right:16px;top:14px;transform:rotate(10deg)"></span><span style="position:absolute;width:30px;height:30px;border-radius:50%;background:#FFC94D;left:16px;top:20px"></span><div style="display:flex;justify-content:space-between;align-items:center;position:relative"><b style="font-family:var(--disp);font-size:13px">${CMP_CONTENT.brand}</b><span style="font-size:8px;color:#7a5c4a">Work · Studio</span></div><h3 role="presentation" style="font-family:var(--disp);font-size:24px;font-weight:700;letter-spacing:-.01em;margin:24px 0 8px;position:relative">${CMP_CONTENT.head}</h3><div style="display:flex;gap:8px;position:relative"><span style="flex:1;height:18px;background:#4EC5A6;border-radius:999px;transform:rotate(-3deg)"></span><span style="flex:1;height:18px;background:#7A6CFF;border-radius:6px;transform:rotate(2deg)"></span><span style="flex:1;height:18px;border:2.5px solid #2B2B2B;border-radius:999px"></span></div><p style="font-size:9.5px;color:#7a5c4a;margin-top:10px;line-height:1.55;max-width:85%;position:relative">${CMP_CONTENT.p}</p><div style="flex:1;position:relative;display:grid;place-items:center"><span style="width:64px;height:64px;border-radius:16px;background:#FFC94D;transform:rotate(8deg);display:grid;place-items:center;font-family:var(--mono);font-size:8px;font-weight:700;border:2px solid #2B2B2B">IMG</span></div><div style="position:relative;display:flex;gap:8px"><div style="flex:1;background:#fff;border:2.5px solid #2B2B2B;border-radius:12px;padding:10px;box-shadow:3px 3px 0 #2B2B2B"><b style="font-size:11px;display:block">${CMP_CONTENT.card}</b><span style="font-size:8px;color:#7a5c4a;display:block;margin:2px 0 7px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:#FF6B5E;border:2px solid #2B2B2B;font-size:8.5px;font-weight:700;padding:5px 10px;border-radius:8px;box-shadow:2px 2px 0 #2B2B2B">${CMP_CONTENT.cta}</span></div></div></div>`},
  vaporwave:{meta:{type:'Retro future',color:'Purple / pink',layout:'Centered',border:'None',radius:'8px',spacing:'Dreamy',motion:'Glow'},
    html:`<div style="height:100%;background:linear-gradient(180deg,#2D1B4E 0%,#6B2A6E 45%,#B04A6E 100%);color:#FFB6C1;font-family:var(--sans);display:flex;flex-direction:column;padding:20px;position:relative;overflow:hidden"><span style="position:absolute;left:50%;bottom:6%;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;background:linear-gradient(180deg,#FF9A9E,#FF6A88);box-shadow:0 0 24px rgba(255,120,150,.6)"></span><div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;letter-spacing:.2em"><b style="font-family:var(--mono);font-size:10px">${CMP_CONTENT.brand.toUpperCase()}</b><span style="color:#D88AB0">1995—2019</span></div><h3 role="presentation" style="font-family:var(--disp);font-size:23px;font-weight:700;letter-spacing:.01em;margin:24px 0 8px;text-shadow:0 0 14px rgba(255,180,190,.7)">${CMP_CONTENT.head}</h3><p style="font-size:9.5px;color:#E8A9C0;line-height:1.65;max-width:85%">${CMP_CONTENT.p}</p><div style="flex:1;position:relative;display:grid;place-items:center;margin:14px 0"><span style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:10px;padding:8px 16px;font-family:var(--mono);font-size:8px;letter-spacing:.2em">A E S T H E T I C · IMG</span></div><div style="position:relative;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);border-radius:10px;padding:11px;-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:space-between"><div><b style="font-size:11px;display:block">${CMP_CONTENT.card}</b><span style="font-size:8px;color:#E8A9C0;display:block;margin-top:2px">${CMP_CONTENT.cardp}</span></div><span style="background:linear-gradient(180deg,#FF9A9E,#FF6A88);color:#2D1B4E;font-weight:700;font-size:8.5px;padding:6px 11px;border-radius:8px">${CMP_CONTENT.cta}</span></div></div>`},
  acid:{meta:{type:'Display · loud',color:'Rainbow neon',layout:'Anti-design',border:'2px black',radius:'4px',spacing:'Charged',motion:'Distort'},
    html:`<div style="height:100%;background:linear-gradient(135deg,#B9FF1F,#FF37E6 50%,#2BE6FF);color:#fff;font-family:var(--sans);display:flex;flex-direction:column;padding:18px;position:relative;overflow:hidden"><span style="position:absolute;width:56px;height:56px;border-radius:50%;background:radial-gradient(circle,#FFED57,transparent 65%);left:-12px;top:-10px"></span><span style="position:absolute;width:44px;height:44px;border-radius:50%;border:3px solid #111;right:14px;top:12px;background:rgba(255,255,255,.25)"></span><div style="display:flex;justify-content:space-between;align-items:center;position:relative;mix-blend-mode:difference"><b style="font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.06em">${CMP_CONTENT.brand.toUpperCase()}</b><span style="font-size:8px;font-weight:700">RAVE / SLAM</span></div><h3 role="presentation" style="font-size:26px;font-weight:800;letter-spacing:-.02em;line-height:.95;margin:24px 0 8px;mix-blend-mode:difference">${CMP_CONTENT.head}<br>SLAM.</h3><p style="font-size:9.5px;font-weight:600;mix-blend-mode:difference;line-height:1.6;max-width:86%">${CMP_CONTENT.p}</p><div style="flex:1;display:grid;place-items:center;margin:14px 0;position:relative"><span style="width:70px;height:70px;background:#111;color:#B9FF1F;border-radius:50%;display:grid;place-items:center;font-size:9px;font-weight:700;transform:rotate(-8deg)">IMG</span></div><div style="position:relative;display:flex;gap:8px;align-items:stretch"><div style="flex:1;background:rgba(255,255,255,.25);border:3px solid #111;padding:10px;mix-blend-mode:multiply"><b style="font-size:10.5px;display:block;color:#111">${CMP_CONTENT.card}</b><span style="font-size:8px;color:#111;font-weight:600;display:block;margin:2px 0 8px">${CMP_CONTENT.cardp}</span><span style="display:inline-block;background:#111;color:#B9FF1F;font-weight:700;font-size:8.5px;padding:5px 11px">${CMP_CONTENT.cta.toUpperCase()}</span></div></div></div>`},
};
/* 스타일 백과사전 순서를 따른다 — 비교 목록과 목록 순서가 어긋나면 찾기 어렵다. */
const CMP_STYLE_ORDER=STYLES.map(s=>s.id).filter(id=>CMP_RECIPE[id]);



'use strict';
/* 챕터가 페이지마다 다르므로, 이 페이지에 없는 섹션의 훅은 당연히 없다.
   null에 리스너를 걸거나 innerHTML을 쓰면 스크립트 전체가 죽으므로
   문서 전역 조회는 실패 시 버려지는 빈 요소를 돌려준다. 그 요소는 DOM에
   붙지 않으므로 화면에 아무 영향이 없고, 다른 렌더러와 섞이지도 않는다.
   컨테이너를 지정한 조회(=이미 있는 요소 안)는 그대로 null을 돌려준다. */
const VOID=()=>document.createElement('div');
const $=(s,c=document)=>c.querySelector(s)||(c===document?VOID():null);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};

/* ---------- toast ---------- */
let toastT;
function toast(msg){
  const el=$('#globalToast'); el.textContent=msg; el.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),2200);
}

/* ---------- theme ---------- */
function setTheme(t){document.documentElement.setAttribute('data-theme',t);store.set('dkm-theme',t);if(typeof renderSysTokens==='function')renderSysTokens();}
$('#themeBtn').addEventListener('click',()=>{
  setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
});

/* ---------- header / progress / backtop ---------- */
const header=$('#header'),progress=$('#progress'),backTop=$('#backTop');
function onScroll(){
  const y=window.scrollY;
  header.classList.toggle('scrolled',y>10);
  const h=document.documentElement.scrollHeight-window.innerHeight;
  progress.style.width=(h>0?(y/h)*100:0)+'%';
  backTop.classList.toggle('show',y>640);
}
window.addEventListener('scroll',onScroll,{passive:true});onScroll();
backTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

/* ---------- mobile menu ---------- */

/* ---------- reveal ---------- */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08});
$$('.reveal').forEach(el=>io.observe(el));

/* ============================================================
   ROADMAP
   ============================================================ */
const roadEl=$('#roadmapList');
/* 각 단계가 실제로 몇 개를 다루는지 — 전부 데이터에서 센다. */
const ROAD_VOL={
  principles:()=>`원칙 ${PRINCIPLES.length} · 게슈탈트 ${GESTALT.length}`,
  layouts:()=>`레이아웃 ${LAYOUTS.length}`,
  styles:()=>`스타일 ${STYLES.length}`,
  ui:()=>`패턴 ${Object.values(UI_PATTERNS).filter(Array.isArray).reduce((n,a)=>n+a.length,0)}`,
  type:()=>`용어 ${TERMS.length} · 폰트 분류 ${FONTS.length}`,
  system:()=>`토큰 ${SYS_TOKENS.reduce((n,g)=>n+g.t.length,0)}`,
};
function renderRoadmap(){
  roadEl.innerHTML=ROADMAP.map((r,i)=>`
    <div class="road-step reveal" data-step="${i}">
      <span class="road-dot"></span>
      <div class="road-card">
        <div class="road-gutter"><b>${r.step}</b><em>STEP</em></div>
        <div class="road-main">
          <div class="road-top">
            <h3>${r.name}</h3>
            <span class="road-kr">${r.en}</span>
            <span class="road-vol">${r.chapter&&ROAD_VOL[r.chapter]?ROAD_VOL[r.chapter]():'준비 중'}</span>
          </div>
          <p class="road-desc">${r.desc}</p>
          <div class="road-topics">${r.topics.map(t=>`<button class="road-topic" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}</div>
          <div class="road-prog" data-prog="${i}"></div>
        </div>
      </div>
    </div>`).join('');
  /* 토픽 칩이 전부 Styles로 갔다 — "Kerning"을 눌러도 스타일 목록이 열렸다.
     각 토픽을 실제 목적지에 연결한다. */
  const ROADMAP_TOPIC={
    'Visual Hierarchy':{ch:'principles'},'White Space':{ch:'principles'},'Contrast':{ch:'principles'},
    'Alignment':{ch:'principles'},'Balance':{ch:'principles'},'Proximity':{ch:'principles'},
    'Grid':{ch:'layouts',ly:'grid'},'Bento':{ch:'layouts',ly:'bento'},'Masonry':{ch:'layouts',ly:'masonry'},
    'Split Layout':{ch:'layouts',ly:'split'},'Editorial Layout':{ch:'layouts',ly:'editorial-ly'},
    'Brutalism':{ch:'styles',st:'brutal'},'Neo Brutalism':{ch:'styles',st:'neobrutal'},
    'Minimalism':{ch:'styles',st:'minimal'},'Swiss Style':{ch:'styles',st:'swiss'},
    'Glassmorphism':{ch:'styles',st:'glass'},'Bauhaus':{ch:'styles',st:'bauhaus'},
    'Navbar':{ch:'ui',cat:'Navigation'},'Card':{ch:'ui',cat:'Content'},'Modal':{ch:'ui',cat:'Feedback'},
    'Dashboard':{ch:'layouts',ly:'dashboard'},'Timeline':{ch:'ui',cat:'Content'},
    'Serif':{ch:'type'},'Sans Serif':{ch:'type'},'Grotesk':{ch:'type'},'Kerning':{ch:'type'},'Tracking':{ch:'type'},
    'Component':{ch:'system'},'Token':{ch:'system'},'Pattern Library':{ch:'system'},
  };
  bindRoadTopics();
}

function bindRoadTopics(){
  $$('.road-topic',roadEl).forEach(btn=>btn.addEventListener('click',()=>{
    const t=ROADMAP_TOPIC[btn.dataset.topic];if(!t)return;
    /* 페이지가 바뀌므로 "무엇을 열지"를 주소에 실어 보낸다. */
    const q=t.st?'?open='+t.st:t.ly?'?ly='+t.ly:t.cat?'?cat='+encodeURIComponent(t.cat):'';
    location.href=chapterHref(t.ch)+q;
  }));
}
$$('.reveal').forEach(el=>io.observe(el));

/* ============================================================
   STYLES
   ============================================================ */
let favs=store.get('dkm-favs',[]);
const styleState={cat:'all',favOnly:false,term:''};
const styleGrid=$('#styleGrid'),styleEmpty=$('#styleEmpty'),styleCount=$('#styleCount'),favFilterBtn=$('#favFilter');
const favBadge=$('#favBadge');

function favIds(){return favs}
function toggleFav(id,notify){
  const i=favs.indexOf(id);
  if(i>-1){favs.splice(i,1)}else{favs.push(id)}
  store.set('dkm-favs',favs);
  renderFavBadge();
  if(styleState.favOnly)renderStyles();
  if(notify)toast(favs.indexOf(id)>-1?'즐겨찾기에 추가했습니다':'즐겨찾기에서 제거했습니다');
  updateFavStars();
  renderLearnChips();
  const fm=$('#favModal');
  if(fm.classList.contains('open'))renderFavModal();
}
function renderFavBadge(){
  favBadge.textContent=favs.length;
  favBadge.classList.toggle('show',favs.length>0);
  favFilterBtn.classList.toggle('on',styleState.favOnly);
}
const cmpMotion=id=>CMP_RECIPE[id]?CMP_RECIPE[id].meta.motion.toLowerCase().replace(/\s+/g,'-'):'';
function starSVG(){return `<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20l1-6.1L3.2 9.5l6.1-.9z"/></svg>`}

function styleMatches(s,term){
  if(!term)return true;
  const t=term.toLowerCase();
  return (s.name+' '+s.kr+' '+s.tagline+' '+s.feats.join(' ')+' '+s.cat).toLowerCase().includes(t);
}
function filteredStyles(){
  return STYLES.filter(s=>
    (styleState.cat==='all'||s.cat===styleState.cat)&&
    (!styleState.favOnly||favs.includes(s.id))&&
    styleMatches(s,styleState.term)
  );
}
function renderStyles(){
  const list=filteredStyles();
  styleGrid.innerHTML=list.map((s,i)=>{
    const shown=s.feats.slice(0,3),rest=s.feats.length-shown.length;
    return `
    <article class="st-card" style="animation-delay:${Math.min(i,12)*35}ms">
      <div class="st-pv" data-open="${s.id}" data-motion="${cmpMotion(s.id)}"><div class="pv">${s.pv}</div></div>
      <div class="st-body">
        <div class="st-head">
          <div class="st-head-txt" data-open="${s.id}"><h2>${s.name}</h2><span class="st-cat">${s.cat} · ${s.kr}</span></div>
          <button class="st-fav ${favs.includes(s.id)?'on':''}" data-fav="${s.id}"
            aria-pressed="${favs.includes(s.id)}" aria-label="${esc(s.name)} 즐겨찾기">${starSVG()}</button>
        </div>
        <p class="st-tagline" data-open="${s.id}">${s.tagline}</p>
        <div class="st-feats">${shown.map(f=>`<span class="st-feat">${esc(f)}</span>`).join('')}${rest>0?`<span class="st-feat-more">+${rest}</span>`:''}</div>
        <div class="st-examples">${s.examples.map(e=>`<a class="ex-tile" href="${e.url}" target="_blank" rel="noopener"><span class="ico">${esc(e.site[0])}</span>${esc(e.site)}</a>`).join('')}</div>
        <button class="st-more" data-open="${s.id}">상세 분석 &amp; 실제 사례 보기 →</button>
      </div>
    </article>`}).join('');
  styleEmpty.hidden=list.length>0;
  styleCount.textContent=list.length+'개 표시 중';
}
styleGrid.addEventListener('click',e=>{
  const favBtn=e.target.closest('[data-fav]');
  if(favBtn){e.stopPropagation();toggleFav(favBtn.dataset.fav,true);return}
  if(e.target.closest('a'))return;      // example tiles open the real site
  const open=e.target.closest('[data-open]');
  if(open)openStyleModal(open.dataset.open);
});
$$('.f-btn[data-f]').forEach(b=>b.addEventListener('click',()=>{
  $$('.f-btn[data-f]').forEach(x=>x.classList.remove('on'));b.classList.add('on');
  styleState.cat=b.dataset.f;styleState.favOnly=false;renderStyles();
}));
favFilterBtn.addEventListener('click',()=>{
  styleState.favOnly=!styleState.favOnly;renderFavBadge();renderStyles();
  if(styleState.favOnly&&favs.length===0)toast('아직 즐겨찾기가 없습니다 — 카드의 ☆을 눌러보세요');
});

/* ---------- style detail modal ---------- */
const styleModal=$('#styleModal'),modalPv=$('#modalPv'),modalBody=$('#modalBody');
function openStyleModal(id){
  const s=STYLES.find(x=>x.id===id);if(!s)return;
  modalPv.innerHTML=`<div class="pv pv-lg">${s.pv}</div>`;
  modalBody.innerHTML=`
    <div class="modal-top">
      <h2>${s.name} <span style="font-size:15px;color:var(--ink-3)">${s.kr}</span></h2>
      <span class="chip solid">${s.cat}</span>
      <span class="chip">${s.tagline}</span>
    </div>
    <p class="modal-def">${s.def}</p>
    <div class="detail-grid">
      <div class="detail-col">
        <h4>핵심 특징</h4>
        ${s.feats.map((f,i)=>`<div class="feature-row"><b>0${i+1}</b>${esc(f)}</div>`).join('')}
      </div>
      <div class="detail-col">
        <h4>실제 디자인 사례</h4>
        ${s.examples.map(e=>`<div class="ex-detail"><span class="ico">${esc(e.site[0])}</span><div><b>${esc(e.site)}</b><a href="${e.url}" target="_blank" rel="noopener">${esc(e.url)}</a><p>${e.why}</p></div></div>`).join('')}
      </div>
    </div>
    <div class="analysis-box">
      <h4>분석 포인트</h4>
      <ul>${s.points.map(p=>`<li>${p}</li>`).join('')}</ul>
    </div>
    ${dnaBox(id)}
    ${relBox(id)}
    ${observeBox(id)}
    <div class="modal-actions">
      <button class="btn btn-ghost ${learned.includes(id)?'on':''}" id="modalLearned">${learned.includes(id)?'✓ 학습 완료':'학습 표시'}</button>
      <button class="btn btn-primary" id="modalFav">${favs.includes(id)?'★ 즐겨찾기 해제':'☆ 즐겨찾기 저장'}</button>
      <button class="btn btn-ghost" id="modalClose2">닫기</button>
    </div>`;
  styleModal.classList.add('open');focusModal(styleModal);
  document.body.style.overflow='hidden';
  addViewed(id);renderLearnChips();
  requestAnimationFrame(()=>$$('#modalBody .dna-bar i').forEach(el=>el.style.width=el.dataset.w+'%'));
  $('#modalFav').addEventListener('click',()=>{toggleFav(id,true);$('#modalFav').textContent=favs.includes(id)?'★ 즐겨찾기 해제':'☆ 즐겨찾기 저장'});
  $('#modalLearned').addEventListener('click',()=>{
    const i=learned.indexOf(id);if(i>-1)learned.splice(i,1);else learned.push(id);
    store.set('dkm-learned',learned);
    const b=$('#modalLearned');b.classList.toggle('on',learned.includes(id));b.textContent=learned.includes(id)?'✓ 학습 완료':'학습 표시';
    renderLearnChips();
  });
  $('#modalClose2').addEventListener('click',closeStyleModal);
}
function closeStyleModal(){if(!styleModal.classList.contains('open'))return;styleModal.classList.remove('open');document.body.style.overflow='';releaseModal()}
$('#modalClose').addEventListener('click',closeStyleModal);
styleModal.addEventListener('click',e=>{if(e.target===styleModal)closeStyleModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeStyleModal();closeFavModal();$('#searchResults')?.classList.remove('open')}});
/* 다이얼로그를 열면 포커스를 안으로 옮기고, 닫으면 열었던 자리로 돌려준다.
   이게 없으면 키보드 사용자는 모달이 열린 줄도 모르고, 닫은 뒤 문서 맨 앞으로 튕긴다. */
let modalReturn=null;
function focusModal(back){
  modalReturn=document.activeElement;
  const first=back.querySelector('.modal-close')||back.querySelector('.modal');
  requestAnimationFrame(()=>first?.focus?.());
}
function releaseModal(){const t=modalReturn;modalReturn=null;t?.focus?.()}

function updateFavStars(){
  $$('.st-fav').forEach(b=>{const on=favs.includes(b.dataset.fav);b.classList.toggle('on',on)});
}

/* ---------- favorites modal ---------- */
const favModal=$('#favModal');
function renderFavModal(){
  const grid=$('#favGrid'),empty=$('#favEmpty');
  const list=favs.map(id=>STYLES.find(s=>s.id===id)).filter(Boolean);
  grid.innerHTML=list.map((s,i)=>`
    <article class="st-card" style="animation-delay:${Math.min(i,10)*30}ms">
      <div class="st-pv" data-open="${s.id}" data-motion="${cmpMotion(s.id)}"><div class="pv">${s.pv}</div></div>
      <div class="st-body">
        <div class="st-head">
          <div class="st-head-txt" data-open="${s.id}"><h3>${s.name}</h3><span class="st-cat">${s.cat}</span></div>
          <button class="st-fav on" data-fav="${s.id}" aria-pressed="true" aria-label="${esc(s.name)} 즐겨찾기 해제">${starSVG()}</button>
        </div>
        <p class="st-tagline" data-open="${s.id}">${s.tagline}</p>
        <button class="st-more" data-open="${s.id}">상세 보기 →</button>
      </div>
    </article>`).join('');
  empty.hidden=list.length>0;
}
$('#favGrid').addEventListener('click',e=>{
  const fb=e.target.closest('[data-fav]');
  if(fb){e.stopPropagation();toggleFav(fb.dataset.fav,true);renderFavModal();return}
  const op=e.target.closest('[data-open]');
  if(op){closeFavModal();openStyleModal(op.dataset.open)}
});
$('#favBtn').addEventListener('click',()=>{renderFavModal();favModal.classList.add('open');focusModal(favModal)});
$('#favModalClose').addEventListener('click',closeFavModal);
favModal.addEventListener('click',e=>{if(e.target===favModal)closeFavModal()});
function closeFavModal(){if(!favModal.classList.contains('open'))return;favModal.classList.remove('open');releaseModal()}

/* ============================================================
   LAYOUTS
   ============================================================ */
const layoutGrid=$('#layoutGrid'),layoutEmpty=$('#layoutEmpty');
let lyMode='real';
const cardMode={};
function lyContent(l){return (cardMode[l.id]||lyMode)==='real'&&LAYOUT_REAL[l.id]?LAYOUT_REAL[l.id]:l.wire}
function renderLayouts(term=''){
  const list=LAYOUTS.filter(l=>{
    if(!term)return true;
    const t=term.toLowerCase();
    return (l.name+' '+l.kr+' '+l.use+' '+l.desc+' '+l.ex).toLowerCase().includes(t);
  });
  layoutGrid.innerHTML=list.map((l,i)=>`
    <article class="ly-card reveal" style="animation-delay:${Math.min(i,10)*30}ms">
      <div class="ly-pv" data-lyopen="${l.id}">${lyContent(l)}<button class="ly-card-toggle" data-lytog="${l.id}" aria-label="${(cardMode[l.id]||lyMode)==='real'?'와이어프레임으로 보기':'실제 모습으로 보기'}"><b>${(cardMode[l.id]||lyMode)==='real'?'REAL':'WIRE'}</b> → ${(cardMode[l.id]||lyMode)==='real'?'WIRE':'REAL'}</button><span class="w-label">${esc(l.name)}</span></div>
      <div class="ly-body">
        <h2>${l.name} <span style="color:var(--ink-3);font-weight:500;font-size:13px">${l.kr}</span></h2>
        <div class="ly-use">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>
          ${esc(l.use)}
        </div>
        <p class="ly-desc">${l.desc}</p>
        <div class="ly-meta"><span>실사용 예 · ${l.ex}</span><span>${l.id.toUpperCase()}</span></div>
      </div>
    </article>`).join('');
  layoutEmpty.hidden=list.length>0;
  $$('.reveal').forEach(el=>io.observe(el));
}
renderLayouts();
$('#layoutSearch').addEventListener('input',e=>renderLayouts(e.target.value.trim()));

/* ---------- layout global / per-card toggle + modal ---------- */
function setLyMode(m){
  lyMode=m;
  $$('#lyGlobalToggle button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  renderLayouts($('#layoutSearch').value.trim());
}
$$('#lyGlobalToggle button').forEach(b=>b.addEventListener('click',()=>setLyMode(b.dataset.m)));
layoutGrid.addEventListener('click',e=>{
  const tog=e.target.closest('[data-lytog]');
  if(tog){e.stopPropagation();const id=tog.dataset.lytog;cardMode[id]=(cardMode[id]||lyMode)==='real'?'wire':'real';renderLayouts($('#layoutSearch').value.trim());return}
  const op=e.target.closest('[data-lyopen]');
  if(op)openLayoutModal(op.dataset.lyopen);
});
const lyModal=$('#lyModal'),lyModalPv=$('#lyModalPv');
let lyModalMode='real',lyAnatomy=[];
function setLyModalToggle(){
  $$('#lyModalToggle button').forEach(b=>b.classList.toggle('on',b.dataset.m===lyModalMode));
  const id=lyModal.dataset.lid;
  lyModalPv.innerHTML=(lyModalMode==='real'&&LAYOUT_REAL[id]?LAYOUT_REAL[id]:LAYOUTS.find(x=>x.id===id).wire);
}
$$('#lyModalToggle button').forEach(b=>b.addEventListener('click',()=>{lyModalMode=b.dataset.m;setLyModalToggle();highlightLy() }));
function openLayoutModal(id){
  const l=LAYOUTS.find(x=>x.id===id);if(!l)return;
  lyModal.dataset.lid=id;
  $('#lyModalTitle').textContent=l.name+' · '+l.kr;
  $('#lyModalUse').textContent=l.use;
  $('#lyModalDesc').textContent=l.desc;
  $('#lyModalEx').textContent=l.ex;
  lyAnatomy=LAYOUT_ANATOMY[id]||[];
  $('#lyAnatomy').innerHTML=lyAnatomy.map((a,i)=>`
    <div class="ly-an-item" data-anitem="${a.an}" tabindex="0"><span class="n">0${i+1}</span><div><div class="an-name">${a.n}</div><div class="an-desc">${a.d}</div></div></div>`).join('')||`<div class="rel-empty">해부도 정보 없음</div>`;
  lyModalMode='real';setLyModalToggle();
  addViewedLy(id);renderLearnChips();
  lyModal.classList.add('open');focusModal(lyModal);document.body.style.overflow='hidden';
}
function closeLyModal(){if(!lyModal.classList.contains('open'))return;lyModal.classList.remove('open');document.body.style.overflow='';releaseModal()}
$('#lyModalClose').addEventListener('click',closeLyModal);
lyModal.addEventListener('click',e=>{if(e.target===lyModal)closeLyModal()});
function highlightLy(){
  const an=lyModal.querySelector('.ly-an-item.hl');
  $$('.ly-an-item',lyModal).forEach(x=>x.classList.toggle('hl',x===an));
  const pv=lyModalPv;
  $$('.real-hl',pv).forEach(x=>x.classList.remove('real-hl'));
  if(an)$$(`[data-an="${an.dataset.anitem}"]`,pv).forEach(x=>x.classList.add('real-hl'));
}
$('#lyAnatomy').addEventListener('focusin',e=>{const it=e.target.closest('.ly-an-item');if(it)it.dispatchEvent(new Event('mouseover',{bubbles:true}))});
$('#lyAnatomy').addEventListener('mouseover',e=>{
  const it=e.target.closest('.ly-an-item');if(!it)return;
  $$('.ly-an-item',lyModal).forEach(x=>x.classList.remove('hl'));it.classList.add('hl');
  $$('.real-hl',lyModalPv).forEach(x=>x.classList.remove('real-hl'));
  $$(`[data-an="${it.dataset.anitem}"]`,lyModalPv).forEach(x=>x.classList.add('real-hl'));
});
$('#lyAnatomy').addEventListener('mouseleave',()=>{$$('.ly-an-item',lyModal).forEach(x=>x.classList.remove('hl'));$$('.real-hl',lyModalPv).forEach(x=>x.classList.remove('real-hl'))});

/* ============================================================
   HERO SWITCHER
   ============================================================ */
const stageBody=$('#stageBody'),stageName=$('#stageName'),stageGo=$('#stageGo'),heroSwitcher=$('#heroSwitcher');
const HERO_ORDER=Object.keys(HERO_STAGES);
let stageAnim=null;
function setStage(v){
  if(!HERO_STAGES[v]||stageBody.dataset.v===v)return;
  $$('#heroSwitcher button').forEach(x=>x.classList.toggle('on',x.dataset.v===v));
  stageBody.classList.add('swap-out');
  clearTimeout(stageAnim);
  stageAnim=setTimeout(()=>{
    stageBody.dataset.v=v;stageName.textContent=HERO_STAGES[v];
    stageGo.dataset.sopen=v;
    stageBody.classList.remove('swap-out');
  },300);
}
/* "한 스타일, 네 가지 렌더"라고 써 놓고 아무도 안 누르면 하나만 보고 나간다.
   모션 감소 설정을 존중하고, 호버·포커스 동안 멈추며,
   사용자가 직접 스타일을 고르면 그 선택을 존중해 순환을 끝낸다. */
let heroTimer=null,heroStopped=false;
const heroReduced=matchMedia('(prefers-reduced-motion:reduce)');
function pauseHeroCycle(){clearInterval(heroTimer);heroTimer=null}
function startHeroCycle(){
  if(heroTimer||heroStopped||heroReduced.matches)return;
  heroTimer=setInterval(()=>{
    if(document.hidden)return;
    const i=HERO_ORDER.indexOf(stageBody.dataset.v);
    setStage(HERO_ORDER[(i+1)%HERO_ORDER.length]);
  },4800);
}
heroSwitcher.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  heroStopped=true;pauseHeroCycle();setStage(b.dataset.v);
});
const heroStage=$('.hero-stage');
heroStage.addEventListener('mouseenter',pauseHeroCycle);
heroStage.addEventListener('mouseleave',startHeroCycle);
heroStage.addEventListener('focusin',pauseHeroCycle);
heroStage.addEventListener('focusout',()=>{if(!heroStage.contains(document.activeElement))startHeroCycle()});
stageGo.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();location.href=chapterHref('styles')+'?open='+stageGo.dataset.sopen});
startHeroCycle();

/* ============================================================
   UI PATTERNS
   ============================================================ */
const uiGrid=$('#uiGrid');
let uiCat='Navigation';
function renderUi(){
  const items=UI_PATTERNS[uiCat];
  uiGrid.innerHTML=items.map((p,i)=>`
    <div class="ui-card reveal" data-ui="${p.name}" style="animation-delay:${Math.min(i,8)*30}ms">
      <div class="ui-stage"><div style="display:grid;place-items:center;width:100%;height:100%">${p.html}</div></div>
      <div class="ui-body">
        <h2>${p.name}</h2>
        <div class="ui-why">${p.why}</div>
        <p>${p.desc}</p>
        ${patternGuide(p.name)}
      </div>
    </div>`).join('');
  $$('#uiGrid .ui-card').forEach((card,i)=>{
    if(UI_PATTERNS[uiCat][i]&&UI_PATTERNS[uiCat][i].init)initWidget(card);
    card.classList.add('in');
  });
}
function patternGuide(name){
  const g=PATTERN_GUIDE[name];if(!g)return '';
  return `<div class="pg3">
    <div class="pg3-row use"><b>Use</b>${g.use}</div>
    <div class="pg3-row avoid"><b>Avoid</b>${g.avoid}</div>
    <div class="pg3-row mistake"><b>Mistake</b>${g.mistakes}</div>
  </div>`;
}
$('#uiTabs').addEventListener('click',e=>{
  const t=e.target.closest('.ui-tab');if(!t)return;
  $$('#uiTabs .ui-tab').forEach(x=>x.classList.remove('on'));t.classList.add('on');
  uiCat=t.dataset.cat;renderUi();
});
function initWidget(card){
  const q=s=>$(s,card);
  if(q('.mini-tabs')){
    $$('button',q('.mini-tabs')).forEach(b=>b.addEventListener('click',()=>{
      $$('button',q('.mini-tabs')).forEach(x=>x.classList.remove('on'));b.classList.add('on');
      const content=q('.mini-tabcontent');
      content.textContent=b.textContent+' — 탭 전환 데모';
    }));
  }
  const drawer=q('[data-open-drawer]');
  if(drawer){
    const dr=q('.mini-drawer'),ov=q('.mini-drawer-overlay');
    drawer.addEventListener('click',()=>{dr.classList.add('open');ov.classList.add('open')});
    ov.addEventListener('click',()=>{dr.classList.remove('open');ov.classList.remove('open')});
  }
  const table=q('.mini-table');
  if(table){
    let sortKey='',dir=1;
    $$('th[data-k]',table).forEach(th=>th.addEventListener('click',()=>{
      const k=th.dataset.k;
      if(k===sortKey)dir*=-1;else{sortKey=k;dir=1}
      $$('th[data-k]',table).forEach(x=>{const d=x.querySelector('.dir');d.textContent=''});
      th.querySelector('.dir').textContent=dir>0?'↑':'↓';
      const rows=$$('tbody tr',table).slice();
      rows.sort((a,b)=>{
        const av=a.children[['name','status','count'].indexOf(k)].textContent;
        const bv=b.children[['name','status','count'].indexOf(k)].textContent;
        if(k==='count')return dir*(+av-+bv);
        return dir*av.localeCompare(bv);
      });
      rows.forEach(r=>q('tbody',table).appendChild(r));
    }));
  }
  const kanban=q('.kanban');
  if(kanban){
    const cols=$$('.kb-col',kanban);
    kanban.addEventListener('click',e=>{
      const c=e.target.closest('.kb-card');if(!c)return;
      const cur=c.closest('.kb-col');const next=cols[(cols.indexOf(cur)+1)%cols.length];
      next.insertBefore(c,next.querySelector('h5').nextSibling);
      cols.forEach(col=>{const i=q('i',col);i.textContent=$$('.kb-card',col).length});
    });
  }
  const carousel=q('.carousel');
  if(carousel){
    const track=q('.cs-track',carousel),dots=$$('.cs-dots i',carousel),slides=$$('.cs-slide',carousel);
    let idx=0;
    const go=n=>{idx=(n+slides.length)%slides.length;track.style.transform=`translateX(-${idx*100}%)`;dots.forEach((d,i)=>d.classList.toggle('on',i===idx))};
    $$('button',q('.cs-nav',carousel)).forEach(b=>b.addEventListener('click',()=>go(idx+(b.dataset.cs==='next'?1:-1))));
    setInterval(()=>go(idx+1),3200);
  }
  const mOpen=q('[data-open-modal]');
  if(mOpen){
    const mm=q('.mini-modal',card);
    mOpen.addEventListener('click',()=>{mm.hidden=false});
    $$('[data-close-modal]',card).forEach(b=>b.addEventListener('click',()=>mm.hidden=true));
  }
  const toasts=$$('[data-toast]',card);
  if(toasts.length){
    const tEl=q('.toast',card);
    toasts.forEach(b=>b.addEventListener('click',()=>{
      tEl.querySelector('.t-ico').textContent='✓';tEl.lastChild.textContent=' '+b.dataset.toast;
      tEl.classList.add('show');
      setTimeout(()=>tEl.classList.remove('show'),1800);
    }));
  }
  const ms=q('[data-ms]');
  if(ms){
    const list=q('.ms-list',card),opts=$$('button',list);
    ms.addEventListener('input',()=>{
      const v=ms.value.toLowerCase();
      const shown=opts.filter(o=>o.textContent.toLowerCase().includes(v));
      opts.forEach(o=>o.style.display=shown.includes(o)?'':'none');
      list.classList.toggle('open',!!v);
      if(!v){list.classList.remove('open');return}
    });
    ms.addEventListener('focus',()=>{if(ms.value)list.classList.add('open')});
    document.addEventListener('click',e=>{if(!card.contains(e.target))list.classList.remove('open')});
    opts.forEach(o=>o.addEventListener('click',()=>{ms.value=o.textContent;list.classList.remove('open')}));
  }
  const form=q('.mini-form');
  if(form){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const em=q('[data-femail]',card),msg=q('.f-msg',card);
      const ok=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value);
      msg.textContent=ok?'✓ 구독 완료! 감사합니다.':(em.value?'올바른 이메일을 입력하세요.':'이메일을 입력해주세요.');
      msg.className='f-msg'+(ok?'':' err');
    });
  }
  const cal=q('.mini-date');
  if(cal){
    const input=q('[data-cal-input]',card),panel=q('.cal',card),grid=q('.cal-grid',card),label=q('[data-cal-label]',card);
    let y=new Date().getFullYear(),m=new Date().getMonth(),sel=null;
    const DAYS=['일','월','화','수','목','금','토'];
    const draw=()=>{
      const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
      label.textContent=y+'년 '+(m+1)+'월';
      grid.innerHTML=DAYS.map(d=>`<span>${d}</span>`).join('');
      for(let i=0;i<first;i++)grid.insertAdjacentHTML('beforeend','<span></span>');
      for(let d=1;d<=days;d++){
        const today=new Date().getFullYear()===y&&new Date().getMonth()===m&&new Date().getDate()===d;
        grid.insertAdjacentHTML('beforeend',`<button data-d="${d}" class="${today?'today':''}${sel===d?' sel':''}">${d}</button>`);
      }
    };
    draw();
    input.addEventListener('click',()=>panel.classList.toggle('open'));
    $$('[data-cal]',card).forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.cal==='prev'){m--;if(m<0){m=11;y--}}else{m++;if(m>11){m=0;y++}}
      draw();
    }));
    grid.addEventListener('click',e=>{
      const b=e.target.closest('button[data-d]');if(!b)return;
      sel=+b.dataset.d;input.value=y+'-'+String(m+1).padStart(2,'0')+'-'+String(sel).padStart(2,'0');panel.classList.remove('open');draw();
    });
  }
  const stp=q('.mini-stepper');
  if(stp){
    const val=q('[data-stp-val]',card);let n=1;
    $$('[data-stp]',card).forEach(b=>b.addEventListener('click',()=>{
      n=Math.max(0,Math.min(9,n+(b.dataset.stp==='inc'?1:-1)));
      val.textContent=n;
      $$('.stp-bar i',card).forEach((d,i)=>d.className=i<n?'done':i===n?'on':'');
    }));
  }
}
renderUi();

/* ============================================================
   TYPOGRAPHY
   ============================================================ */
$('#fontCats').innerHTML=FONTS.map(f=>`
  <div class="fc-card reveal">
    <span class="fc-label">${f.name} · ${f.en}</span>
    <div class="fc-sample ${f.name.toLowerCase().includes('serif')?'serif':f.name.toLowerCase().includes('mono')?'mono':'sans'}">${f.sample}</div>
    <div class="fc-feels">${f.feels.map(x=>`<span>${x}</span>`).join('')}</div>
    <p>${f.desc}</p>
  </div>`).join('');

const TERM_DEMO={
  kerning:['AV To','Kerning'], tracking:['TRACKING','Tracking'], leading:['Line one\nLine two','Leading'],
  baseline:['Baseline','Baseline'], capheight:['CAP','Cap'], xheight:['x-height','X Height']
};
$('#termGrid').innerHTML=TERMS.map(t=>`
  <div class="term-card reveal" data-term="${t.type}">
    <h3>${t.name}<span class="t-en">${t.kr}</span></h3>
    <p>${t.desc}</p>
    <div class="term-demo" data-demo="${t.type}">
      <span class="td-label" data-tdval></span>
      <div class="td-baseline" data-base></div>
      ${t.type==='capheight'||t.type==='xheight'?'<div class="td-guide" data-guide></div>':''}
      <span class="td-text" data-tdtext>${TERM_DEMO[t.type][0]}</span>
    </div>
    <div class="term-slider">
      <div class="ts-row"><span>${t.name}</span><span data-tsval>0</span></div>
      <input type="range" min="0" max="100" value="40" aria-label="슬라이더 데모" data-tsslider>
    </div>
  </div>`).join('');

$$('#termGrid .term-card').forEach(card=>{
  const q=s=>$(s,card);
  const type=card.dataset.term,demo=q('[data-demo]',card),text=q('[data-tdtext]',card),
        slider=q('[data-tsslider]',card),val=q('[data-tsval]',card),tdval=q('[data-tdval]',card);
  const apply=v=>{
    val.textContent=v;
    switch(type){
      case 'kerning': text.style.letterSpacing=(v/100*0.3-0.06)+'em';tdval.textContent='+'+((v/100*0.3-0.06)*100).toFixed(0)+'em';break;
      case 'tracking': text.style.letterSpacing=(v/100*0.5)+'em';tdval.textContent=(v/100*0.5*100).toFixed(0)+'em';break;
      case 'leading': text.style.whiteSpace='pre';text.style.lineHeight=(1+ v/100*2.6)+'';tdval.textContent=(1+v/100*2.6).toFixed(2)+'×';break;
      case 'baseline': text.style.fontSize=(0.6+v/100*1.4)+'em';tdval.textContent=(0.6+v/100*1.4).toFixed(2)+'em';break;
      case 'capheight': {
        const g=q('[data-guide]',card);
        text.style.fontSize=(0.7+v/100*1.8)+'em';
        if(g){const base=demo.querySelector('[data-base]');const bb=text.getBoundingClientRect(),bd=base.getBoundingClientRect();g.style.bottom=(bb.bottom-bd.bottom)+'px';g.style.height=(bb.height*0.72)+'px'}
        tdval.textContent='cap h';break;
      }
      case 'xheight': {
        const g=q('[data-guide]',card);
        text.style.fontSize=(0.7+v/100*1.8)+'em';
        if(g){const base=demo.querySelector('[data-base]');const bb=text.getBoundingClientRect();const xh=bb.height*0.5;g.style.bottom=(bb.bottom-demo.querySelector('[data-base]').getBoundingClientRect().bottom)+'px';g.style.height=xh+'px'}
        tdval.textContent='x h';break;
      }
    }
  };
  slider.addEventListener('input',()=>apply(+slider.value));apply(+slider.value);
});

function renderTypeCompare(t){t=t||'Design is how it works.';$('#typeCompare').innerHTML=TYPE_COMPARE.map(c=>`
  <div class="tc-row">
    <div class="tc-label"><b>${c.label}</b><span>${c.sub}</span></div>
    <div class="tc-sample ${c.cls}">${esc(t)}</div>
  </div>`).join('')}
renderTypeCompare();
$('#typeInput').addEventListener('input',e=>renderTypeCompare(e.target.value||' '));
$('#typeCount').textContent=TYPE_COMPARE.length+' styles';

/* ============================================================
   COLOR
   ============================================================ */
$('#colorGrid').innerHTML=COLORS.map((c,i)=>`
  <div class="cl-card reveal" style="animation-delay:${Math.min(i,6)*40}ms">
    <div class="cl-visual">
      ${c.mesh?`<div class="mesh color-effect"><div class="color-effect-label"><b>Mesh field</b><span>${c.swatches.join(' → ')}</span></div></div>`
      :c.name==='Gradient'?`<div class="grad-bar color-effect" style="background-image:${c.grad};background-color:var(--acc-500)"><div class="color-effect-label"><b>120° gradient</b><span>${c.swatches.join(' → ')}</span></div></div>`
      :`<div class="palette-strip" style="grid-template-columns:repeat(${c.swatches.length},minmax(0,1fr))">${c.swatches.map(s=>`<div class="palette-chip"><i style="background:${s}"></i><span class="sw-hex">${s}</span></div>`).join('')}</div>`}
    </div>
    <div class="cl-body">
      <h2>${c.name} <span style="color:var(--ink-3);font-weight:500;font-size:13px">${c.kr}</span></h2>
      <p>${c.desc}</p>
      <div class="cl-use">사용처 · ${c.use}</div>
    </div>
  </div>`).join('');

/* ============================================================
   ANALYZER
   ============================================================ */
const anAnswers={};
$('#anQuestions').innerHTML=ANALYZER.questions.map((q,qi)=>`
  <div class="an-question" data-qk="${q.key}">
    <div class="an-q-head">
      <span class="an-q-num">Q${qi+1}</span>
      <b>${q.title}</b>
      <span>${q.en}</span>
    </div>
    <div class="an-opts">
      ${q.opts.map((o,oi)=>`<button class="an-opt" data-qi="${qi}" data-oi="${oi}">${o.label}</button>`).join('')}
    </div>
  </div>`).join('')+`
  <div class="an-foot">
    <div class="an-steps" id="anSteps" aria-hidden="true"></div>
    <span class="an-count" id="anCount"></span>
    <button class="btn btn-primary an-go" id="anGo">분석 리포트 생성 →</button>
  </div>`;

/* 답을 다 채우기 전까지 아무 신호가 없었다 — 버튼을 눌러야 토스트로 알려줬다.
   몇 개를 채웠는지 세는 눈금을 질문 아래에 둔다. */
function anSyncProgress(){
  const done=ANALYZER.questions.map(q=>!!anAnswers[q.key]);
  const n=done.filter(Boolean).length,total=done.length;
  $('#anSteps').innerHTML=done.map(d=>`<i class="${d?'on':''}"></i>`).join('');
  $('#anCount').textContent=n===total?'다섯 질문 모두 답함':`${n} / ${total} 답함`;
  $('#anGo').classList.toggle('ready',n===total);
}
$$('#anQuestions .an-opt').forEach(btn=>btn.addEventListener('click',()=>{
  const qi=+btn.dataset.qi,oi=+btn.dataset.oi;
  const siblings=$$(`[data-qi="${qi}"]`,$('#anQuestions'));
  siblings.forEach(x=>{x.classList.remove('on');x.setAttribute('aria-pressed','false')});
  btn.classList.add('on');btn.setAttribute('aria-pressed','true');
  btn.closest('.an-question').classList.add('answered');
  anAnswers[ANALYZER.questions[qi].key]=ANALYZER.questions[qi].opts[oi];
  anSyncProgress();
}));
anSyncProgress();

function buildAnalysis(){
  if(Object.keys(anAnswers).length<5){toast('다섯 질문에 모두 답해주세요');return}
  const lay=ANALYZER.questions.find(q=>q.key==='layout'),sty=ANALYZER.questions.find(q=>q.key==='style');
  const a=anAnswers;
  const layId=a.layout.tags.find(t=>LAYOUTS.some(l=>l.id===t));
  const matchCount={};
  Object.values(a).forEach(o=>o.tags.forEach(t=>matchCount[t]=(matchCount[t]||0)+1));
  const matchedStyles=STYLES.map(s=>({s,score:Object.keys(matchCount).filter(t=>t===s.id||s.feats.some(f=>f.toLowerCase().includes(t))).length}));
  const top=matchedStyles.filter(x=>x.score>0).sort((x,y)=>y.score-x.score).slice(0,4);
  const topStyle=top[0]?STYLES.find(s=>s.id===top[0].s.id):null;
  const catCount={};top.forEach(x=>catCount[x.s.cat]=(catCount[x.s.cat]||0)+1);
  const total=top.reduce((n,x)=>n+x.score,0)||1;

  const sum=`이 화면은 <b>${a.layout.label}</b> 계열 레이아웃 위에 <b>${a.style.label}</b> 스타일의 시각 언어를 얹었고, 타이포그래피는 <b>${a.type.label}</b> 계열을 사용했습니다. 컬러는 <b>${a.color.label}</b> 팔레트가 주도하며, 목적은 <b>${a.purpose.label}</b>입니다. ${topStyle?'전체적으로 <b>'+topStyle.name+'</b>의 어휘와 가장 유사합니다.':''}`;

  $('#anSummary').innerHTML=sum;
  /* 예전에는 Type 60 · Color 65 · Purpose 55처럼 입력과 무관한 고정값을
     "분석 리포트"로 내보냈다. 실제로 계산되는 유일한 값은 어휘 겹침 점수다.
     그 값을 그대로 보여주고, 무엇을 센 수치인지도 밝힌다. */
  const bars=top.map(x=>({name:x.s.name,score:x.score,pct:Math.round(x.score/total*100)}));
  $('#anBars').innerHTML=bars.length
    ? `<div class="an-bars-cap">선택한 답변 5개의 키워드와 각 스타일의 어휘가 겹친 정도 — 전체 ${total}건 중</div>`
      +bars.map(b=>`<div class="an-bar-row"><span>${esc(b.name)}</span><div class="an-bar"><i data-w="${b.pct}"></i></div><b>${b.score}건</b></div>`).join('')
    : `<div class="an-bars-cap">어휘가 겹치는 스타일이 하나도 없습니다. 그것도 결과입니다 — ${STYLES.length}개 어디에도 딱 들어맞지 않는 조합이라는 뜻이니까요.</div>`;
  requestAnimationFrame(()=>$$('#anBars .an-bar i').forEach((el,i)=>{el.style.width=bars[i].pct+'%'}));

  const catMap={'Modern':'모던·기능','Brutal':'거침·강한 메시지','Effect':'질감·재질','Art':'미술사적','Emotion':'감성·노스탤지어'};
  const lead=topStyle
    ? `가장 두드러진 특성은 <b>${topStyle.name}</b>입니다.`
      +(catMap[topStyle.cat]?` <b>${catMap[topStyle.cat]}</b> 계열의 성격이 강합니다.`:'')
      +' 더 깊게 보려면 아래 스타일을 열어 프리뷰와 실제 사례를 비교해보세요.'
    : '고른 조합이 어느 한 스타일로 모이지 않습니다. 답을 하나씩 바꿔보면 어떤 항목이 결과를 좌우하는지 보입니다.';
  $('#anVerdict').innerHTML=`<b>디자인 리딩</b><p>${lead}</p>`;
  $('#anMatch').innerHTML=top.map(x=>`<button class="chip" data-sopen="${x.s.id}">${x.s.name}</button>`).join('')+`${layId?`<button class="chip" data-lopen="${layId}">${LAYOUTS.find(l=>l.id===layId).name}</button>`:''}`;
  $$('#anMatch .chip').forEach(ch=>ch.addEventListener('click',()=>{
    const st=ch.dataset.sopen,lo=ch.dataset.lopen;
    if(st){closeStyleModal();scrollToId('#styles');setTimeout(()=>openStyleModal(st),100)}
    if(lo){scrollToId('#layouts');$('#layoutSearch').value=LAYOUTS.find(l=>l.id===lo).name;renderLayouts(LAYOUTS.find(l=>l.id===lo).name)}
  }));

  $('#anIdle').hidden=true;$('#anOut').hidden=false;
}
$('#anGo').addEventListener('click',buildAnalysis);
$('#anReset').addEventListener('click',()=>{
  Object.keys(anAnswers).forEach(k=>delete anAnswers[k]);
  $$('#anQuestions .an-opt').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-pressed','false')});
  $$('#anQuestions .an-question').forEach(q=>q.classList.remove('answered'));
  anSyncProgress();
  $('#anIdle').hidden=false;$('#anOut').hidden=true;
  $('#anQuestions').scrollIntoView({behavior:'smooth',block:'start'});
});

/* ---------- analyzer quiz mode ---------- */
const paneAnalyze=$('#paneAnalyze'),paneQuiz=$('#paneQuiz');
$$('.an-mode').forEach(b=>b.addEventListener('click',()=>{
  $$('.an-mode').forEach(x=>x.classList.remove('on'));b.classList.add('on');
  const q=b.dataset.mode==='quiz';
  paneAnalyze.hidden=q;paneQuiz.hidden=!q;
  if(q&&!qz.started)newQuiz();
}));
const qz={started:false,sid:null,answers:{},qs:[]};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function newQuiz(){
  qz.started=true;
  const ids=CMP_STYLE_ORDER.slice();
  qz.sid=shuffle(ids)[0];
  const r=CMP_RECIPE[qz.sid];
  $('#qzStage').innerHTML=`<div style="height:100%">${r.html}</div>`;
  const sname=STYLES.find(s=>s.id===qz.sid).name;
  const others=shuffle(ids.filter(x=>x!==qz.sid));
  const styleOpts=shuffle([qz.sid,...others.slice(0,3)].map(id=>({id,label:STYLES.find(s=>s.id===id).name})));
  const typeOpts=shuffle(Array.from(new Set([r.meta.type,...others.map(o=>CMP_RECIPE[o].meta.type)])).slice(0,4));
  const colorOpts=shuffle(Array.from(new Set([r.meta.color,...others.map(o=>CMP_RECIPE[o].meta.color)])).slice(0,4));
  qz.qs=[
    {k:'style',label:'STYLE',q:'이 화면의 스타일 어휘에 가장 가깝나요?',opts:styleOpts.map(o=>({v:o.id,label:o.label}))},
    {k:'type',label:'TYPOGRAPHY',q:'타이포그래피의 성격은?',opts:typeOpts.map(v=>({v,label:v}))},
    {k:'color',label:'COLOR',q:'컬러의 성격은?',opts:colorOpts.map(v=>({v,label:v}))},
  ];
  qz.answers={};
  renderQuiz();
}
function renderQuiz(){
  $('#qzQuestions').innerHTML=qz.qs.map((q,qi)=>`
    <div class="qz-q"><span class="qz-label">${q.label}</span><b>${q.q}</b>
      <div class="qz-opts">${q.opts.map((o,oi)=>`<button class="qz-opt" data-qi="${qi}" data-oi="${oi}">${esc(o.label)}</button>`).join('')}</div>
    </div>`).join('');
  $('#qzResult').innerHTML='';$('#qzWhy').hidden=true;
  qz.answers={};
  $$('#qzQuestions .qz-opt').forEach(b=>b.addEventListener('click',()=>{
    const qi=+b.dataset.qi;
    $$(`[data-qi="${qi}"]`,$('#qzQuestions')).forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    qz.answers[qi]=+b.dataset.oi;
  }));
}
function submitQuiz(){
  const qs=qz.qs;
  if(Object.keys(qz.answers).length<qs.length){toast('세 질문에 모두 답해주세요');return}
  const r=CMP_RECIPE[qz.sid];
  const correct=[qz.sid,r.meta.type,r.meta.color];
  let score=0;
  qs.forEach((q,qi)=>{
    const picked=q.opts[qz.answers[qi]].v,isOk=picked===correct[qi];
    if(isOk)score++;
    $$(`[data-qi="${qi}"]`,$('#qzQuestions')).forEach(b=>{
      const oi=+b.dataset.oi;
      b.classList.remove('on');
      const optVal=q.opts[oi].v;
      if(optVal===correct[qi])b.classList.add('ok');
      else if(oi===qz.answers[qi])b.classList.add('no');
    });
    const row=qz.answers[qi];
    const sname=STYLES.find(s=>s.id===qz.sid).name;
    const explain=q.label==='STYLE'?`정답은 <b>${sname}</b>. ${STYLE_OBSERVE[qz.sid][0]}`:
      q.label==='TYPOGRAPHY'?`정답은 <b>${r.meta.type}</b>. ${DNA_NOTE.type}`:
      `정답은 <b>${r.meta.color}</b>. ${DNA_NOTE.color}`;
    $('#qzResult').insertAdjacentHTML('beforeend',
      `<div class="qz-row ${isOk?'ok':'no'}"><span class="qmark">${isOk?'✓':'✗'}</span><div>${q.label} — ${q.opts[row].label}<br><span style="font-size:11.5px;color:var(--ink-3)">${explain}</span></div></div>`);
  });
  $('#qzWhy').hidden=false;
  $('#qzWhy').innerHTML=`<b>해설 — ${STYLES.find(s=>s.id===qz.sid).name}</b><p>${STYLE_OBSERVE[qz.sid].map((t,i)=>`${i+1}. ${t}`).join(' ')}<br>${DNA_NOTE[Object.keys(STYLE_DNA[qz.sid]).sort((a,b)=>STYLE_DNA[qz.sid][b]-STYLE_DNA[qz.sid][a])[0]]}</p>`;
  $('#qzResult').insertAdjacentHTML('beforeend',`<div class="qz-row ok"><span class="qmark">${score}/3</span><div><b>${score===3?'완벽! ':score>=2?'좋아요! ':'조금 더 볼까요? '}</b>${score}개 정답.</div></div>`);
}
$('#qzSubmit').addEventListener('click',submitQuiz);
$('#qzRetry').addEventListener('click',()=>{renderQuiz();$('#qzResult').innerHTML='';$('#qzWhy').hidden=true});
$('#qzNew').addEventListener('click',()=>newQuiz());

/* ============================================================
   LEARNING PROGRESS (viewed / learned)
   ============================================================ */
let viewed=store.get('dkm-viewed',[]);
let viewedLy=store.get('dkm-viewed-ly',[]);
let learned=store.get('dkm-learned',[]);
function addViewed(id){if(!viewed.includes(id)){viewed.push(id);store.set('dkm-viewed',viewed);renderLearnChips()}}
function addViewedLy(id){if(!viewedLy.includes(id)){viewedLy.push(id);store.set('dkm-viewed-ly',viewedLy);renderLearnChips()}}
let visitedCh=store.get('dkm-visited',[]);
function addVisited(id){if(id&&!visitedCh.includes(id)){visitedCh.push(id);store.set('dkm-visited',visitedCh);renderRoadmapProgress()}}
function renderLearnChips(){
  const chip=(n,c,d)=>`<span class="learn-chip ${d?'done':''}"><i></i>${n}<b>${c}</b></span>`;
  $('#learnChips').innerHTML=chip('탐색한 스타일',viewed.length+'/'+STYLES.length,viewed.length>0)+chip('학습 완료',learned.length+'/'+STYLES.length,learned.length>0)+chip('즐겨찾기',favs.length+'/'+STYLES.length,favs.length>0);
  $('#learnChipsLy').innerHTML=chip('탐색한 레이아웃',viewedLy.length+'/14',viewedLy.length>0);
  renderRoadmapProgress();
}
/* 로드맵을 "현재 위치를 아는 지도"로 만든다.
   링은 항목 단위 기록이 실제로 있는 두 단계에만 그린다 — 나머지 네 단계는
   추적되는 것이 챕터 방문 여부뿐이므로 그렇게만 말한다. 없는 퍼센트는 만들지 않는다. */
function renderRoadmapProgress(){
  const ring=pct=>`<svg class="road-ring" viewBox="0 0 38 38" aria-hidden="true"><circle class="rr-bg" cx="19" cy="19" r="15.915"/><circle class="rr-fg" cx="19" cy="19" r="15.915" stroke-dasharray="${pct} ${100-pct}"/></svg>`;
  ROADMAP.forEach((r,i)=>{
    const box=document.querySelector(`[data-prog="${i}"]`);if(!box)return;
    const visited=r.chapter&&visitedCh.includes(r.chapter);
    let html;
    if(r.track==='st'){
      const pct=Math.round(viewed.length/STYLES.length*100);
      html=`${ring(pct)}<span class="rp-txt"><b>탐색한 스타일</b>${viewed.length} / ${STYLES.length} · 학습 완료 ${learned.length} · 즐겨찾기 ${favs.length}</span>`;
    }else if(r.track==='ly'){
      const pct=Math.round(viewedLy.length/LAYOUTS.length*100);
      html=`${ring(pct)}<span class="rp-txt"><b>탐색한 레이아웃</b>${viewedLy.length} / ${LAYOUTS.length}</span>`;
    }else if(r.chapter){
      html=`<span class="road-visit ${visited?'done':''}">${visited?'챕터 방문함':'아직 방문 전'}</span>`;
    }else{
      html=`<span class="road-visit">챕터 준비 중</span>`;
    }
    if(r.chapter)html+=`<a class="rp-go" href="${chapterHref(r.chapter)}">챕터로 →</a>`;
    box.innerHTML=html;
    box.closest('.road-step').classList.toggle('done',!!visited);
  });
  const steps=$$('.road-step'),last=ROADMAP.reduce((n,r,i)=>r.chapter&&visitedCh.includes(r.chapter)?i:n,-1);
  roadEl.style.setProperty('--road-fill',last<0?'0%':Math.round((last+0.5)/steps.length*100)+'%');
}

/* ============================================================
   DETAIL MODAL EXTRAS — DNA / RELATIONS / OBSERVE
   ============================================================ */
const relName=id=>{const s=STYLES.find(x=>x.id===id);return s?s.name:id};
const relExists=id=>STYLES.some(x=>x.id===id);
function dnaBox(id){
  const d=STYLE_DNA[id];if(!d)return '';
  const keys=Object.keys(d).sort((a,b)=>d[b]-d[a]);
  return `<div class="dna-box">
    <h4>STYLE DNA — ${keys.slice(0,3).map(k=>DNA_LABEL[k]).join(' · ')} 강점</h4>
    ${Object.keys(d).map(k=>`<div class="dna-row"><span>${DNA_LABEL[k]}</span><div class="dna-bar"><i data-w="${d[k]*20}"></i></div><b>${d[k]}</b></div>`).join('')}
    <div class="dna-note">${DNA_NOTE[keys[0]]}</div>
  </div>`;
}
function relBox(id){
  const r=STYLE_REL[id];if(!r)return '';
  const rows=Object.keys(REL_LABEL).filter(k=>r[k]&&r[k].length);
  if(!rows.length)return '';
  return `<div class="rel-box">
    <h4>RELATED STYLES — 클릭하여 이동</h4>
    ${rows.map(k=>`<div class="rel-row"><span class="rel-k">${REL_LABEL[k]}</span><div class="rel-v">${r[k].filter(relExists).map(t=>`<button class="rel-chip" data-sopen="${t}">${relName(t)}</button>`).join('')}</div></div>`).join('')}
  </div>`;
}
function observeBox(id){
  const o=STYLE_OBSERVE[id];if(!o)return '';
  return `<div class="observe-box">
    <h4>WHAT TO OBSERVE</h4>
    <ul>${o.map((t,i)=>`<li><span class="ob-n">0${i+1}</span><div><b>이 스타일을 볼 때</b>${t}</div></li>`).join('')}</ul>
  </div>`;
}
styleModal.addEventListener('click',e=>{
  const chip=e.target.closest('.rel-chip[data-sopen]');
  if(chip){openStyleModal(chip.dataset.sopen)}
});

/* ============================================================
    DESIGN PRINCIPLES (BAD/GOOD) + GESTALT — RENDER
    ============================================================ */
function renderPrinciples(){
  $('#prinGrid').innerHTML=PRINCIPLES.map((p,i)=>{
    const badChanges=p.badChanges?`<div class="pd-changes"><b>CHANGED — BAD</b><ul>${p.badChanges.map(c=>`<li>${c}</li>`).join('')}</ul></div>`:'';
    const goodChanges=p.goodChanges?`<div class="pd-changes"><b>CHANGED — GOOD</b><ul>${p.goodChanges.map(c=>`<li>${c}</li>`).join('')}</ul></div>`:'';
    return `
    <article class="prin-card reveal" data-principle="${p.id}" style="animation-delay:${Math.min(i,10)*30}ms">
      <div class="prin-head">
        <div class="prin-top"><h2>${p.name}</h2><span class="prin-num">P${String(i+1).padStart(2,'0')} · ${p.en}</span></div>
        <p>${p.def}</p>
      </div>
      <div class="prin-demos">
        <div class="pdemo-toggle" role="group" aria-label="${p.name} 예시 전환"><button data-show="bad" aria-pressed="false">BAD</button><button class="on" data-show="good" aria-pressed="true">GOOD</button></div>
        <div class="pdemo bad">
          <div class="pl">BAD</div>${p.bad}<div class="pd-note">${p.badNote}</div>${badChanges}
        </div>
        <div class="pdemo good">
          <div class="pl">GOOD</div>${p.good}<div class="pd-note">${p.goodNote}</div>${goodChanges}
        </div>
      </div>
    </article>`;
  }).join('');

  bindPdemoToggle($('#prinGrid'));
}
/* 모바일 Bad/Good 전환 — Principles와 Accessibility가 같이 쓴다.
   클래스로만 전환한다: 인라인 display를 쓰면 데스크톱 폭으로 넓혀도
   한쪽이 계속 숨겨진 채로 남는다. */
function bindPdemoToggle(root){
  $$('.pdemo-toggle button',root).forEach(btn=>{
    btn.addEventListener('click',()=>{
      const demos=btn.closest('.prin-demos'),show=btn.dataset.show;
      $$('button',demos).forEach(b=>{
        const on=b.dataset.show===show;
        b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));
      });
      demos.classList.toggle('show-bad',show==='bad');
    });
  });
}

/* ============================================================
   ACCESSIBILITY — 이 사이트에서 실제로 틀렸다가 고친 것들
   Principles와 같은 구조(bad/good + 무엇을 바꿨나)를 그대로 쓴다.
   ============================================================ */
const A11Y = [
{ id:'contrast', name:'색 대비', en:'Color Contrast',
  def:'WCAG는 본문 텍스트에 4.5:1, 18px 이상 큰 텍스트와 UI 요소에 3:1을 요구한다. 눈대중으로 "잘 보이는데" 싶은 건 믿을 게 못 된다. 재봐야 안다.',
  bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:22px;background:#F7F7F4;height:100%"><div style="font-family:var(--mono);font-size:11px;letter-spacing:.1em;color:#E04400">SECTION LABEL</div><div style="font-family:var(--mono);font-size:12px;color:#E04400;margin-top:10px">이 캡션은 12px입니다</div><div style="margin-top:18px;padding:12px 14px;background:#fff;border:1px solid #e5e5e1"><span style="font-size:13px;color:#E04400;font-weight:600">더 알아보기 →</span></div><div style="margin-top:16px;font-family:var(--mono);font-size:22px;font-weight:700;color:#C5221F">3.92 : 1</div><div style="font-size:12px;color:#5F5F58;margin-top:2px">#E04400 on #F7F7F4 — AA 본문 기준 미달</div></div></div>`,
  good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:22px;background:#F7F7F4;height:100%"><div style="font-family:var(--mono);font-size:11px;letter-spacing:.1em;color:#B33700">SECTION LABEL</div><div style="font-family:var(--mono);font-size:12px;color:#B33700;margin-top:10px">이 캡션은 12px입니다</div><div style="margin-top:18px;padding:12px 14px;background:#fff;border:1px solid #e5e5e1"><span style="font-size:13px;color:#B33700;font-weight:600">더 알아보기 →</span></div><div style="margin-top:16px;font-family:var(--mono);font-size:22px;font-weight:700;color:#137333">5.65 : 1</div><div style="font-size:12px;color:#5F5F58;margin-top:2px">#B33700 on #F7F7F4 — AA 통과</div></div></div>`,
  badNote:'액센트 색을 9~13px 작은 글씨에 그대로 썼다. 라벨·캡션·링크가 전부 기준 미달이었다.',
  goodNote:'같은 계열의 더 어두운 단계를 작은 텍스트 전용으로 분리했다. 밝은 단계는 큰 텍스트와 테두리에만 쓴다.',
  badChanges:['작은 텍스트 액센트 #E04400 → #B33700','다크 모드 캡션 #6D6D76 → #8A8A93 (3.81 → 5.71:1)','밝은 액센트는 24px 이상 · 보더 · 배경 전용으로 한정'],
  goodChanges:['같은 색의 "역할"을 둘로 나눴다 — 읽는 색과 칠하는 색','토큰 이름을 --acc-text로 두어 컴포넌트가 값을 모르게 했다','라이트/다크 각각 따로 측정했다 — 한쪽만 맞추면 반대쪽이 깨진다'] },

{ id:'coloralone', name:'색만으로 알리지 않기', en:'Not by Color Alone',
  def:'남성의 약 8%가 색각 이상이다. 빨강과 초록의 차이로만 상태를 알리면, 그런 사람 눈에는 똑같은 회색 점 두 개다.',
  bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:20px;height:100%;display:flex;flex-direction:column;gap:11px;justify-content:center">${['정상 가동','지연 발생','중단됨'].map((t,i)=>`<div style="display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--line-2);padding:11px 13px"><span style="width:11px;height:11px;border-radius:50%;background:${['#137333','#E8A317','#C5221F'][i]};flex:none"></span><span style="font-size:13px">${t}</span></div>`).join('')}<div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);margin-top:4px">색이 유일한 신호 — 흑백으로 인쇄하면 구별 불가</div></div></div>`,
  good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:20px;height:100%;display:flex;flex-direction:column;gap:11px;justify-content:center">${[['정상 가동','●','OK','#137333'],['지연 발생','▲','WARN','#8A5200'],['중단됨','■','DOWN','#C5221F']].map(([t,ic,lb,c])=>`<div style="display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--line-2);border-left:3px solid ${c};padding:11px 13px"><span style="color:${c};font-size:11px;flex:none">${ic}</span><span style="font-size:13px;flex:1">${t}</span><span style="font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:${c}">${lb}</span></div>`).join('')}<div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);margin-top:4px">색 + 모양 + 글자 — 어느 하나만 있어도 읽힌다</div></div></div>`,
  badNote:'점의 색이 유일한 구분 신호다. 색각 이상, 흑백 출력, 강한 햇빛 아래에서 정보가 사라진다.',
  goodNote:'모양과 글자 라벨, 왼쪽 색 바를 더했다. 이제 색은 거들기만 하고, 색을 못 봐도 내용은 그대로 남는다.',
  badChanges:['색 점 → 색 + 도형(● ▲ ■)','상태 텍스트 라벨 추가 (OK / WARN / DOWN)','좌측 3px 컬러 바로 스캔 가능성 확보'],
  goodChanges:['색을 없앤 게 아니라 색에만 의존하지 않게 했다','흑백으로 복사해도 세 상태가 구별된다','스크린리더는 텍스트 라벨을 그대로 읽는다'] },

{ id:'focus', name:'포커스가 보여야 한다', en:'Visible Focus',
  def:'키보드 사용자에게 포커스 링은 마우스 커서다. 지우면 화면 어디에 있는지 알 수 없다. 액센트 배경 위에서 액센트 링을 쓰는 것도 지우는 것과 같다.',
  bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:22px;height:100%;display:flex;flex-direction:column;gap:14px;justify-content:center"><div style="display:flex;gap:9px"><span style="font-size:13px;padding:9px 15px;background:#FF4D00;color:#fff;outline:2px solid #FF4D00;outline-offset:2px">활성 탭</span><span style="font-size:13px;padding:9px 15px;border:1px solid var(--line-2)">다른 탭</span></div><div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);line-height:1.7">주황 배경 위의 주황 링 — 포커스가 어디 있는지 알 수 없다.<br>outline:none으로 지운 것과 결과가 같다.</div></div></div>`,
  good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:22px;height:100%;display:flex;flex-direction:column;gap:14px;justify-content:center"><div style="display:flex;gap:9px"><span style="font-size:13px;padding:9px 15px;background:#C43C00;color:#fff;outline:2px solid #16161A;outline-offset:2px;box-shadow:0 0 0 2px #F7F7F4">활성 탭</span><span style="font-size:13px;padding:9px 15px;border:1px solid var(--line-2)">다른 탭</span></div><div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);line-height:1.7">잉크색 링 + 배경색 링 2겹.<br>어떤 배경 위에서도 최소 한 겹이 살아남는다.</div></div></div>`,
  badNote:'포커스 링을 액센트 색으로 잡아두면, 배경이 액센트인 요소에서는 링이 배경에 묻혀버린다. 이 사이트의 활성 탭이 딱 그랬다.',
  goodNote:'링을 잉크색으로 바꾸고 바깥에 배경색 링을 한 겹 더 둘렀다. 밝은 곳에서도 어두운 곳에서도 보인다.',
  badChanges:['outline 색 --acc-500 → --ink','box-shadow로 배경색 링 한 겹 추가','outline-offset 2px로 요소와 분리'],
  goodChanges:[':focus-visible만 사용 — 마우스 클릭에는 링이 뜨지 않는다','링을 지우지 않고 "다르게" 만들었다','대비는 요소가 아니라 요소 주변과 비교해 확보한다'] },

{ id:'target', name:'터치 타깃 크기', en:'Touch Target',
  def:'WCAG 2.2는 최소 24×24 CSS px을, 모바일 가이드라인은 대체로 44×44를 권한다. 작으면 옆 버튼이 눌린다 — 손이 떨리는 사람에게는 더 크게.',
  bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:22px;height:100%;display:flex;flex-direction:column;gap:16px;justify-content:center"><div style="display:flex;gap:2px">${[1,2,3,4].map(n=>`<span style="width:24px;height:24px;display:grid;place-items:center;border:1px solid var(--line-2);font-size:11px">${n}</span>`).join('')}</div><div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);line-height:1.7">24 × 24px · 간격 2px<br>손가락 접촉면(약 9mm ≈ 34px)보다 작다</div></div></div>`,
  good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:22px;height:100%;display:flex;flex-direction:column;gap:16px;justify-content:center"><div style="display:flex;gap:8px">${[1,2,3,4].map(n=>`<span style="width:44px;height:44px;display:grid;place-items:center;border:1px solid var(--line-2);font-size:13px">${n}</span>`).join('')}</div><div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);line-height:1.7">44 × 44px · 간격 8px<br>목표를 놓쳐도 빈 곳에 닿는다</div></div></div>`,
  badNote:'작은 타깃이 촘촘히 붙어 있으면 손이 빗나갔을 때 그냥 안 눌리는 게 아니라 엉뚱한 게 눌린다. 되돌릴 수 없는 버튼일수록 치명적이다.',
  goodNote:'44px + 간격 8px. 타깃 사이의 여백이 크기만큼 중요하다 — 빗나가도 아무 일이 없어야 한다.',
  badChanges:['24px → 44px (min-height/min-width)','간격 2px → 8px','시각적 크기는 유지하고 padding으로 히트 영역만 키울 수도 있다'],
  goodChanges:['이 사이트의 관계 지도 노드·필터 칩에 min-height:44px를 적용했다','작은 아이콘 버튼도 히트 영역은 44px로 확보','실수 비용이 큰 버튼은 더 넓게 띄운다'] },

{ id:'label', name:'이름 없는 컨트롤', en:'Accessible Name',
  def:'아이콘만 있는 버튼은 스크린리더가 그냥 "버튼"이라고만 읽는다. 뭘 하는 버튼인지 알 길이 없다. 켜고 끄는 버튼이라면 지금 켜져 있는지까지 말해야 한다.',
  bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:22px;height:100%;display:flex;flex-direction:column;gap:14px;justify-content:center"><div style="display:flex;gap:10px">${['☆','◐','⌕'].map(g=>`<span style="width:44px;height:44px;display:grid;place-items:center;border:1px solid var(--line-2);font-size:17px">${g}</span>`).join('')}</div><div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);line-height:1.8">&lt;button&gt;&lt;svg/&gt;&lt;/button&gt;<br>스크린리더: "버튼" · "버튼" · "버튼"</div></div></div>`,
  good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:22px;height:100%;display:flex;flex-direction:column;gap:14px;justify-content:center"><div style="display:flex;gap:10px">${[['☆','즐겨찾기'],['◐','테마 전환'],['⌕','검색']].map(([g,l])=>`<span style="min-width:44px;height:44px;display:flex;align-items:center;gap:7px;padding:0 12px;border:1px solid var(--line-2);font-size:15px">${g}<em style="font-style:normal;font-size:11px;font-family:var(--mono);color:var(--ink-3)">${l}</em></span>`).join('')}</div><div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);line-height:1.8">aria-label="즐겨찾기" · aria-pressed="true"<br>스크린리더: "즐겨찾기, 버튼, 선택됨"</div></div></div>`,
  badNote:'아이콘은 그림이라 이름이 없다. 눈으로 보면 뜻이 통하지만 접근성 트리에는 아무것도 남지 않는다.',
  goodNote:'aria-label로 이름을 붙이고 aria-pressed로 상태를 알린다. 토글이라면 지금 눌려 있는지까지 말해야 끝이다.',
  badChanges:['아이콘 버튼 전부에 aria-label 부여','토글 버튼(즐겨찾기·Bad/Good·정렬)에 aria-pressed 추가','장식용 이미지는 alt=""로 접근성 트리에서 제외'],
  goodChanges:['이름은 "보이는 라벨"과 같은 말로 — 음성 제어 사용자가 그대로 부른다','상태는 색이 아니라 속성으로 전달한다','아이콘 옆에 텍스트를 둘 수 있으면 그게 가장 좋다'] },
{ id:'keyboard', name:'키보드만으로 끝까지', en:'Keyboard Path',
  def:'마우스 없이 페이지 전체를 쓸 수 있어야 한다. 탭 순서, 건너뛰기, 목록 이동. 이 셋이 막히면 나머지가 아무리 좋아도 거기까지 갈 수가 없다.',
  bad:`<div class="pframe bad"><span class="pchip">BAD</span><div style="padding:20px;height:100%;display:flex;flex-direction:column;gap:13px;justify-content:center"><div style="display:flex;flex-wrap:wrap;gap:4px">${['Roadmap','Principles','Styles','Compare','Relations','Layouts','UI','Type','Color','A11y','System','Analyze'].map(t=>`<span style="font-size:10px;font-family:var(--mono);padding:5px 7px;border:1px solid var(--line-2);color:var(--ink-3)">${t}</span>`).join('')}</div><div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);line-height:1.8">본문에 닿기까지 <b style="color:var(--err)">Tab 12번</b> — 매 페이지마다<br>검색: 입력은 되는데 <b style="color:var(--err)">결과는 클릭으로만</b> 선택 가능</div></div></div>`,
  good:`<div class="pframe good"><span class="pchip">GOOD</span><div style="padding:20px;height:100%;display:flex;flex-direction:column;gap:13px;justify-content:center"><div style="display:inline-flex;align-self:flex-start;font-size:12px;font-weight:600;padding:9px 13px;background:#16161A;color:#F7F7F4;border:2px solid #F7F7F4;outline:2px solid #16161A">본문으로 건너뛰기</div><div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);line-height:1.8">첫 Tab에 나타난다 — <b style="color:var(--ok)">Tab 1번</b>으로 본문<br>검색 결과: <b style="color:var(--ok)">↑ ↓ Enter</b>로 이동·선택</div></div></div>`,
  badNote:'탭이 12개로 늘면서, 키보드로 다니는 사람은 페이지를 열 때마다 본문에 닿기 전에 12번을 지나쳐야 했다. 되살린 전역 검색도 결과를 마우스로만 고를 수 있었다.',
  goodNote:'포커스가 닿을 때만 나타나는 건너뛰기 링크를 두고, 검색 결과는 방향키로 오르내리게 했다. 눈에 보이는 화면은 하나도 달라지지 않는다.',
  badChanges:['건너뛰기 링크 추가 — 평소엔 화면 밖, :focus에서 등장','main에 tabindex="-1"을 주어 포커스를 실제로 옮긴다','검색 결과 div → button, ↑↓ 이동 · Enter 선택 · Esc 닫기'],
  goodChanges:['role="combobox" + aria-activedescendant로 현재 항목을 알린다','결과 건수를 aria-live로 읽어준다 — 화면을 못 보면 몇 건인지 알 수 없다','role="listbox"만 붙이고 role="option"이 없으면 없느니만 못하다'] },

];
function renderA11y(){
  const grid=$('#a11yGrid');if(!grid)return;
  grid.innerHTML=A11Y.map((p,i)=>{
    const bc=`<div class="pd-changes"><b>CHANGED — BAD</b><ul>${p.badChanges.map(c=>`<li>${c}</li>`).join('')}</ul></div>`;
    const gc=`<div class="pd-changes"><b>CHANGED — GOOD</b><ul>${p.goodChanges.map(c=>`<li>${c}</li>`).join('')}</ul></div>`;
    return `<article class="prin-card reveal" data-a11y="${p.id}">
      <div class="prin-head">
        <div class="prin-top"><h2>${p.name}</h2><span class="prin-num">A${String(i+1).padStart(2,'0')} · ${p.en}</span></div>
        <p>${p.def}</p>
      </div>
      <div class="prin-demos">
        <div class="pdemo-toggle" role="group" aria-label="${p.name} 예시 전환"><button data-show="bad" aria-pressed="false">BAD</button><button class="on" data-show="good" aria-pressed="true">GOOD</button></div>
        <div class="pdemo bad"><div class="pl">BAD</div>${p.bad}<div class="pd-note">${p.badNote}</div>${bc}</div>
        <div class="pdemo good"><div class="pl">GOOD</div>${p.good}<div class="pd-note">${p.goodNote}</div>${gc}</div>
      </div>
    </article>`;
  }).join('');
  bindPdemoToggle(grid);
}

/* ============================================================
   DESIGN SYSTEM — 교보재는 이 사이트 자신이다
   ============================================================ */
const SYS_BEFORE=[
  ['border-radius','15가지 값이 CSS에 흩어짐 (3·4·5·6·7·8·9·10·11·12·14·16·18·22px)','토큰 3개 (--r-s/m/l) + 알약 예외'],
  ['font-size','38가지 고유 값 (8px ~ 110px, 0.5px 단위까지)','역할 토큰 10개 (--fs-micro ~ --fs-disp)'],
  ['hover lift','-5 · -4 · -3 · -2 · -1px 다섯 가지','--lift · --nudge 둘'],
  ['프리뷰 높이','158 · 170 · 190 · 210 · 300 · 300 · 340px 일곱 가지','--pv-s/m/l 셋'],
  ['그리드 최소폭','280 · 300 · 300 · 330 · 340px — 챕터마다 열이 다르게 접혔다','--card-min 하나'],
  ['의미색','#137333 · #C5221F · #8A5200 · #174EA6이 CSS와 HTML 인라인에 산재','--ok/--warn/--err/--info + -bg/-line'],
  ['간격','2px 그리드 위에 87% — 나머지 81개 선언이 3·5·7·9·11·13·15px로 새어 있었다','2px 그리드 100% · 페이지 리듬은 --pad-sec/--pad-x'],
];
const SYS_TOKENS=[
  {g:'색 · 의미',t:['--ink','--ink-2','--ink-3','--acc-500','--acc-text','--ok','--warn','--err','--info']},
  {g:'모서리',t:['--r-s','--r-m','--r-l']},
  {g:'타입 스케일',t:['--fs-micro','--fs-label','--fs-cap','--fs-sm','--fs-ctl','--fs-body','--fs-lead','--fs-h3','--fs-h2','--fs-disp']},
  {g:'모션 · 치수',t:['--lift','--nudge','--pv-s','--pv-m','--pv-l','--card-min','--header-h']},
  {g:'페이지 리듬',t:['--pad-sec','--pad-x','--container']},
];
const isColorToken=n=>/^--(ink|acc|ok|warn|err|info|s[1-4]|line|bg|surface|wash)/.test(n);
function renderSystem(){
  const before=$('#sysBefore');if(!before)return;
  before.innerHTML=`<div class="sys-row sys-head"><span>대상</span><span>정리 전</span><span>정리 후</span></div>`+
    SYS_BEFORE.map(([k,a,b])=>`<div class="sys-row"><span class="sys-k">${k}</span><span class="sys-a">${a}</span><span class="sys-b">${b}</span></div>`).join('');
  renderSysTokens();
}
function renderSysTokens(){
  const box=$('#sysTokens');if(!box)return;
  const cs=getComputedStyle(document.documentElement);
  box.innerHTML=SYS_TOKENS.map(g=>`<div class="sys-tgroup"><h3>${g.g}</h3><div class="sys-tlist">${
    g.t.map(n=>{
      const v=cs.getPropertyValue(n).trim()||'—';
      const sw=isColorToken(n)?`<i class="sys-sw" style="background:var(${n})"></i>`:'';
      return `<div class="sys-token">${sw}<code>${n}</code><b>${v}</b></div>`;
    }).join('')}</div></div>`).join('');
}

function renderGestalt(){
  $('#gestaltGrid').innerHTML=GESTALT.map((g,i)=>`
    <article class="gestalt-card reveal" style="animation-delay:${Math.min(i,7)*30}ms" data-gestalt="${g.id}">
      ${g.demo}
      <div class="g-body">
        <h3><span class="gn">G${i+1}</span>${g.name}<span style="margin-left:auto;font-family:var(--mono);font-size:9px;color:var(--ink-3);letter-spacing:.08em">${g.kr}</span></h3>
        <p>${g.def}</p>
        ${g.interact?`<div class="g-interact"><span>${g.interact.label}</span><button class="btn btn-sm" data-gact="${g.id}">${g.interact.btn}</button></div>`:''}
      </div>
    </article>`).join('');

  // Interaction handlers
  $$('.gestalt-card').forEach(card=>{
    const id=card.dataset.gestalt;
    const g=GESTALT.find(x=>x.id===id);
    if(g&&g.interact){
      const btn=card.querySelector('[data-gact]');
      let state=0;
      btn.addEventListener('click',e=>{
        e.stopPropagation();
        state=(state+1)%g.interact.states.length;
        const demo=card.querySelector('.g-demo');
        demo.innerHTML=g.interact.states[state];
        btn.textContent=g.interact.btns[state]||g.interact.btn;
      });
    }
    // Lift is CSS-only, so `prefers-reduced-motion` can actually switch it off
    // and a tap no longer makes the card jump.
  });
}
renderRoadmap();renderPrinciples();renderGestalt();renderA11y();renderSystem();

/* ============================================================
   STYLE COMPARE LAB
   ============================================================ */
let cmpSel=['brutal','neobrutal'];
const CMP_META_LABEL={type:'Typography',color:'Color',layout:'Layout',border:'Border',radius:'Radius',spacing:'Spacing',motion:'Motion'};

function renderCompare(){
  $('#cmpPickers').innerHTML=CMP_STYLE_ORDER.map(id=>`
    <button class="cmp-chip ${cmpSel.includes(id)?'on':''}" data-cmp="${id}" aria-pressed="${cmpSel.includes(id)}">${STYLES.find(s=>s.id===id).name}</button>`).join('')
    +`<span class="cmp-count">${cmpSel.length} / 4 비교</span>`;
  /* 범위를 데이터에서 계산해 말한다 — 예전엔 커버리지가 16/28인데 UI가 아무 말도
     하지 않았다. 레시피 없는 스타일이 생기면 문장이 자동으로 그렇게 바뀐다. */
  const scope=$('#cmpScope'),miss=STYLES.length-CMP_STYLE_ORDER.length;
  if(scope)scope.innerHTML=miss
    ? `${STYLES.length}개 중 <b>${CMP_STYLE_ORDER.length}개</b>를 비교할 수 있다. 나머지 ${miss}개는 같은 콘텐츠를 재현한 레시피가 아직 없어 목록에 없다 — 프리뷰와 상세는 <a href="#styles">스타일 백과사전</a>에서 볼 수 있다.`
    : `<b>${STYLES.length}개 전부</b> 비교할 수 있다. 각 열은 내비게이션·헤드라인·본문·이미지·카드·CTA를 똑같은 문장으로 그린다. 그래서 열 사이에서 달라 보이는 건 전부 스타일 탓이다.`;

  const grid=$('#cmpGrid'),empty=$('#cmpEmpty');
  empty.hidden=cmpSel.length>0;
  grid.hidden=cmpSel.length===0;
  if(!cmpSel.length){grid.innerHTML='';renderCmpDna();return}

  grid.style.setProperty('--cmp-cols',cmpSel.length);
  const keys=Object.keys(CMP_RECIPE[cmpSel[0]].meta);
  const cell=id=>CMP_RECIPE[id];
  let h='';
  h+=`<div class="cb-corner"><span class="cb-corner-lab">Style</span></div>`+cmpSel.map((id,i)=>{
    const s=STYLES.find(x=>x.id===id);
    return `<div class="cb-head"><span class="cb-swatch" style="background:var(--s${i+1})"></span>
      <div class="cb-head-txt"><span class="cmp-kicker">${esc(s.cat)}</span>
        <h2>${esc(s.name)}</h2><span class="cmp-tag">${esc(s.kr)}</span></div></div>`;
  }).join('');
  h+=`<div class="cb-corner cb-corner-stage"><span class="cb-corner-lab">고정</span>
      <ul>${['내비게이션','헤드라인','본문','카드','CTA'].map(x=>`<li>${x}</li>`).join('')}</ul>
      <span class="cb-corner-note">이 다섯은 모든 열에서 같다</span></div>`
    +cmpSel.map(id=>`<div class="cb-stage">${cell(id).html}</div>`).join('');
  keys.forEach(k=>{
    const vals=cmpSel.map(id=>cell(id).meta[k]);
    const same=vals.every(v=>v===vals[0]);
    const cls=same?'same':'diff';
    h+=`<div class="cb-key ${cls}">${esc(CMP_META_LABEL[k]||k)}</div>`
      +vals.map(v=>`<div class="cb-val ${cls}">${esc(v)}</div>`).join('');
  });
  grid.innerHTML=h;
  renderCmpDna();
}

/* The eight DNA axes on one shared scale. Same data the detail modal already
   uses — here it answers the question the chapter actually asks: where do these
   styles diverge? */
function renderCmpDna(){
  const el=$('#cmpDna');if(!el)return;
  const ids=cmpSel.filter(id=>STYLE_DNA[id]);
  if(ids.length<2){el.innerHTML='';return}
  const axes=Object.keys(DNA_LABEL);
  const rows=axes.map(k=>{
    const vals=ids.map(id=>STYLE_DNA[id][k]);
    const spread=Math.max(...vals)-Math.min(...vals);
    return `<div class="cd-row ${spread>=3?'wide':''}">
      <span class="cd-axis">${DNA_LABEL[k]}</span>
      <div class="cd-bars">${ids.map((id,i)=>`
        <div class="cd-bar" title="${esc(STYLES.find(s=>s.id===id).name)} · ${DNA_LABEL[k]} ${vals[i]}/5">
          <div class="cd-track"><i style="width:${vals[i]/5*100}%;background:var(--s${i+1})"></i></div>
          <b>${vals[i]}</b>
        </div>`).join('')}</div>
      <span class="cd-spread">${spread?'Δ'+spread:'='}</span>
    </div>`;
  }).join('');
  el.innerHTML=`
    <div class="cd-head">
      <h4>Style DNA — 여덟 축에서 어디가 갈라지는가</h4>
      <div class="cd-legend">${ids.map((id,i)=>`<span><i style="background:var(--s${i+1})"></i>${esc(STYLES.find(s=>s.id===id).name)}</span>`).join('')}</div>
    </div>
    ${rows}
    <p class="cd-note">0–5 척도. Δ가 클수록 그 축에서 두 스타일이 멀다. 겉모습이 달라 보여도 Δ가 작은 축은 두 스타일이 공유하는 성질이다.</p>`;
}
$('#cmpPickers').addEventListener('click',e=>{
  const c=e.target.closest('.cmp-chip');if(!c)return;
  const id=c.dataset.cmp;
  if(cmpSel.includes(id)){cmpSel=cmpSel.filter(x=>x!==id)}
  else{
    if(cmpSel.length>=4){toast('비교는 최대 4개까지');return}
    cmpSel.push(id);
  }
  renderCompare();
});
$$('#cmpPresets .cmp-preset').forEach(b=>b.addEventListener('click',()=>{cmpSel=b.dataset.p.split(',');renderCompare()}));
renderCompare();

/* ============================================================
   RELATIONSHIP MAP
   ============================================================ */
const REL_SHORT={influence:'INFLUENCE',similarity:'SIMILAR',related:'RELATED',confused:'CONFUSED',opposite:'OPPOSITE'};
const REL_TYPES={influence:'Historical Influence',similarity:'Visual Similarity',related:'Related',confused:'Often Confused',opposite:'Opposite'};
/* 'related'로 시작하면 이 챕터가 약속한 역사적 흐름(influence)이 처음부터 가려진다. */
let relFilter='all',relSelected='minimal',relInspectorActive=true;
/* "Visual Similarity" used to be hardcoded as an empty list — it could never
   appear on the map, yet it still had a legend swatch. It is now computed from
   the eight DNA axes: the nearest styles by vector distance that aren't already
   related some other way. */
function dnaDistance(a,b){
  const A=STYLE_DNA[a],B=STYLE_DNA[b];
  if(!A||!B)return Infinity;
  return Math.sqrt(Object.keys(A).reduce((n,k)=>n+Math.pow(A[k]-B[k],2),0));
}
function dnaNearest(id,exclude,n=3){
  return STYLES.map(s=>s.id)
    .filter(x=>x!==id&&STYLE_DNA[x]&&!exclude.has(x))
    .map(x=>({x,d:dnaDistance(id,x)}))
    .sort((p,q)=>p.d-q.d).slice(0,n).map(o=>o.x);
}
function relData(id){
  const r=STYLE_REL[id]||{};
  const infBy=(r.infBy||[]).filter(relExists);
  const inf=(r.inf||[]).filter(relExists);
  const related=(r.rel||[]).filter(relExists);
  const confused=(r.conf||[]).filter(relExists);
  const opposite=(r.opp||[]).filter(relExists);
  const taken=new Set([...infBy,...inf,...related,...confused,...opposite]);
  return {infBy,inf,influence:[...infBy,...inf],similarity:dnaNearest(id,taken),related,confused,opposite};
}
function relTypeFor(a,b){
  const d=relData(a);
  if(d.influence.includes(b))return 'influence';
  if(d.related.includes(b))return 'related';
  if(d.confused.includes(b))return 'confused';
  if(d.opposite.includes(b))return 'opposite';
  if(d.similarity.includes(b))return 'similarity';
  return null;
}
/* Where a neighbour sits on the influence axis, from the selected style's view.
   Influence is recorded on both ends of the pair and not always symmetrically,
   so the neighbour's own lists are checked too — otherwise a one-sided edge
   (Editorial says it was influenced by Swiss, Swiss doesn't say so) fell into
   the undirected band and lost its direction. */
function relAxis(id){
  const d=relData(relSelected),o=STYLE_REL[id]||{};
  if(d.infBy.includes(id)||(o.inf||[]).includes(relSelected))return 'before';
  if(d.inf.includes(id)||(o.infBy||[]).includes(relSelected))return 'after';
  return 'side';
}
function relNeighbors(id){
  const out=new Set();
  STYLES.forEach(s=>{if(relTypeFor(id,s.id)||relTypeFor(s.id,id))out.add(s.id)});
  out.delete(id);return out;
}
function relInspectorHtml(id,mobile=false){
  const s=STYLES.find(x=>x.id===id),d=relData(id);if(!s)return '';
  const row=(label,key)=>d[key].length?`<div class="${mobile?'chip-row':'ins-rel-row'}"><span class="${mobile?'chip-label':'ins-rel-label'}">${label}</span><div class="${mobile?'chips':'ins-rel-chips'}">${d[key].map(t=>`<button class="${mobile?'rel-chip':'ins-rel-chip'}" data-relgo="${t}">${relName(t)}</button>`).join('')}</div></div>`:'';
  return `<h2>${s.name} <span style="font-size:14px;color:var(--ink-3);font-weight:500">${s.kr}</span></h2><div class="ins-meta">${s.cat} · ${s.tagline}</div><div class="${mobile?'':'ins-rel'}">${row(REL_TYPES.influence,'influence')}${row(REL_TYPES.similarity,'similarity')}${row(REL_TYPES.related,'related')}${row(REL_TYPES.confused,'confused')}${row(REL_TYPES.opposite,'opposite')}</div>${mobile?`<button class="btn btn-ghost btn-sm" data-reldetail="${id}" style="margin-top:12px">상세 분석 열기 →</button>`:''}`;
}
function renderRelFilters(){
  $('#relFilter').innerHTML=`<label class="rel-center-label">CENTER STYLE <select id="relCenterSelect">${STYLES.map(s=>`<option value="${s.id}" ${s.id===relSelected?'selected':''}>${s.name}</option>`).join('')}</select></label><span class="rel-filter-sep"></span><button class="f-btn ${relFilter==='all'?'on':''}" data-relfilter="all">All</button>${Object.entries(REL_TYPES).map(([k,v])=>`<button class="f-btn ${relFilter===k?'on':''}" data-relfilter="${k}">${v}</button>`).join('')}`;
}
/* Laid out along the influence axis rather than on a circle. A ring placed every
   neighbour at an arbitrary angle, so every style produced the same hub-and-spoke
   picture and the "historical flow" the chapter promises was nowhere on screen.
   Ancestors now sit left of the selected style, descendants right, and everything
   non-directional drops to a band underneath. */
function relGraph(){
  renderRelFilters();
  const W=960,cx=W/2,nodeW=174,nodeH=50,centerH=82,axisY=58,bandStep=66;
  const all=[...relNeighbors(relSelected)].map(id=>({id,type:relTypeFor(relSelected,id)||relTypeFor(id,relSelected)||'related',axis:relAxis(id)}));
  const visible=all.filter(x=>relFilter==='all'||x.type===relFilter).slice(0,14);

  const before=visible.filter(x=>x.axis==='before');
  const after =visible.filter(x=>x.axis==='after');
  const side  =visible.filter(x=>x.axis==='side');

  /* Every y below is derived from what is actually on screen. Fixed offsets left
     a style with one ancestor and no descendants — Luxury — with a third of the
     canvas empty above the band, while the band's last row fell outside the
     viewBox and got clipped by the wrapper's overflow:hidden. */
  const rows=Math.max(before.length,after.length,1);
  const midH=Math.max(rows*nodeH+(rows-1)*18,centerH);
  const midTop=axisY+44,cy=midTop+midH/2,midBottom=midTop+midH;
  const bandRows=Math.ceil(Math.min(side.length,8)/4);
  const RAIL=midBottom+40,bandY=RAIL+nodeH/2+2;

  const stack=(arr,x)=>arr.map((it,i)=>({...it,x,y:cy+(i-(arr.length-1)/2)*(nodeH+18)}));
  const band=arr=>{
    const capped=arr.slice(0,8),per=Math.min(4,capped.length||1);
    return capped.map((it,i)=>{
      const r=Math.floor(i/per),inRow=capped.slice(r*per,r*per+per).length;
      return {...it,x:(W/(inRow+1))*((i%per)+1),y:bandY+r*bandStep};
    });
  };
  const points=[...stack(before,150),...stack(after,W-150),...band(side)];
  const contentBottom=bandRows?bandY+(bandRows-1)*bandStep+nodeH/2:midBottom;
  const H=Math.max(contentBottom+28,visible.length?0:cy+120);

  // Non-directional neighbours hang off the shared rail instead of fanning out of
  // the centre node — a straight line per node reads where a starburst did not.
  // The relationship type is carried by the node's own border, not by the edge.
  const edge=p=>{
    if(p.axis==='side')return `<path class="rel-edge side" d="M${p.x} ${RAIL} V${p.y-nodeH/2}"/>`;
    // ancestors point INTO the selected style; descendants point away from it
    const [x1,y1,x2,y2]=p.axis==='before'?[p.x+nodeW/2,p.y,cx-104,cy]:[cx+104,cy,p.x-nodeW/2,p.y];
    return `<path class="rel-edge flow" d="M${x1} ${y1} L${x2} ${y2}"/>`;
  };
  const lines=(side.length?`<path class="rel-edge side" d="M${cx} ${cy+centerH/2+2} V${RAIL}"/>`:'')+points.map(edge).join('');

  const selected=STYLES.find(s=>s.id===relSelected);
  const nodes=points.map(p=>`<g class="rel-node ${p.type}" data-sid="${p.id}" transform="translate(${p.x-nodeW/2},${p.y-nodeH/2})" tabindex="0" role="button" aria-label="${esc(relName(p.id))} — ${REL_TYPES[p.type]||''}"><rect class="connected ${p.type}" width="${nodeW}" height="${nodeH}"></rect><text x="${nodeW/2}" y="20" dominant-baseline="middle" text-anchor="middle">${esc(relName(p.id))}</text><text class="rel-node-sub" x="${nodeW/2}" y="36" dominant-baseline="middle" text-anchor="middle">${REL_SHORT[p.type]||''}</text></g>`).join('');
  const center=`<g class="rel-node rel-node-center" data-sid="${relSelected}" transform="translate(${cx-103},${cy-41})"><rect class="selected" width="206" height="82"></rect><text class="selected" x="103" y="33" dominant-baseline="middle" text-anchor="middle">${esc(selected.name)}</text><text class="rel-node-sub" x="103" y="57" dominant-baseline="middle" text-anchor="middle">${selected.cat} · SELECTED</text></g>`;

  // An axis with nothing under it used to draw its rail anyway, promising a
  // column of ancestors or descendants that was not there.
  const axisLabels=`
    ${before.length?`<text class="rel-axis-lab" x="150" y="${axisY-24}" text-anchor="middle">이 스타일에 영향을 준</text>
      <path class="rel-axis-line before" d="M60 ${axisY} H${cx-118}" marker-end="url(#arrowhead-axis)"/>
      <path class="rel-axis-cap" d="M60 ${axisY-7} V${axisY+7}"/>`:''}
    ${after.length?`<text class="rel-axis-lab" x="${W-150}" y="${axisY-24}" text-anchor="middle">이 스타일이 영향을 준</text>
      <path class="rel-axis-line after" d="M${cx+118} ${axisY} H${W-60}" marker-end="url(#arrowhead-axis)"/>
      <path class="rel-axis-cap" d="M${W-60} ${axisY-7} V${axisY+7}"/>`:''}
    ${side.length?`<text class="rel-axis-hint" x="24" y="${RAIL-18}" text-anchor="start">방향이 없는 관계</text><path class="rel-axis-line side" d="M24 ${RAIL} H${W-24}"/>`:''}`;
  const empty=visible.length?'':`<text class="rel-empty-svg" x="${cx}" y="${cy+90}" text-anchor="middle">이 필터에 직접 연결된 스타일이 없습니다. 다른 필터를 눌러보세요.</text>`;
  $('#relMap').innerHTML=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs>
      <marker id="arrowhead-flow" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--acc-500)"/></marker>
      <marker id="arrowhead-axis" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="var(--ink-2)"/></marker>
    </defs>${axisLabels}${lines}${nodes}${center}${empty}</svg>`;
  $('#relLegend').innerHTML=Object.entries(REL_TYPES).map(([k,v])=>`<span><i class="${k}"></i>${v}</span>`).join('');
  $('#relInspector').innerHTML=relInspectorActive?relInspectorHtml(relSelected):`<div class="rel-empty">스타일 노드를 선택하면 관계 Inspector가 열립니다.</div>`;$('#relInspector').classList.toggle('hidden',!relInspectorActive);
  renderRelMobile(visible);
}
/* 데스크톱 SVG와 같은 정보를 담는다 — 영향의 방향(축), 관계 종류, 범례.
   방사형 배치는 390px에서 라벨이 겹치므로 축별 목록으로 편다. */
const REL_AXIS_LABEL={before:'이 스타일에 영향을 준',after:'이 스타일이 영향을 준',side:'방향이 없는 관계'};
function renderRelMobile(visible){
  const s=STYLES.find(x=>x.id===relSelected);
  const groups=['before','after','side'].map(ax=>{
    const list=visible.filter(p=>p.axis===ax);
    if(!list.length)return '';
    return `<div class="rel-m-group" data-axis="${ax}">
      <h4>${REL_AXIS_LABEL[ax]} <em>${list.length}</em></h4>
      ${list.map(p=>`<button class="rel-m-item" data-relgo="${p.id}"><i class="${p.type}"></i><span class="nm">${relName(p.id)}</span><span class="ty">${REL_TYPES[p.type]||''}</span></button>`).join('')}
    </div>`;
  }).join('');
  $('#relMobileCenter').innerHTML=`<h2>${s.name}</h2><div class="cat">${s.cat} · ${s.kr}</div>`+
    (groups||`<div class="rel-empty">이 필터에 직접 연결된 스타일이 없습니다. 다른 필터를 눌러보세요.</div>`);
  $('#relLegendMobile').innerHTML=$('#relLegend').innerHTML;
  $('#relMobileInspector').innerHTML=relInspectorHtml(relSelected,true);$('#relMobileInspector').classList.remove('hidden');
}
$('#relFilter').addEventListener('click',e=>{const b=e.target.closest('[data-relfilter]');if(!b)return;relFilter=b.dataset.relfilter;relGraph()});
$('#relFilter').addEventListener('change',e=>{if(e.target.id!=='relCenterSelect')return;relSelected=e.target.value;relInspectorActive=true;relGraph()});
$('#relMap').addEventListener('click',e=>{const n=e.target.closest('.rel-node');if(!n)return;relSelected=n.dataset.sid;relInspectorActive=true;relGraph()});
$('#relMap').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const n=e.target.closest('.rel-node');if(!n)return;e.preventDefault();relSelected=n.dataset.sid;relInspectorActive=true;relGraph();$('#relMap').querySelector('.rel-node-center')?.focus?.()});
$('#relInspector').addEventListener('click',e=>{const b=e.target.closest('[data-relgo]');if(!b)return;relSelected=b.dataset.relgo;relInspectorActive=true;relGraph()});
$('.rel-mobile').addEventListener('click',e=>{const b=e.target.closest('[data-relgo]');if(b){relSelected=b.dataset.relgo;relGraph();return}const d=e.target.closest('[data-reldetail]');if(d)openStyleModal(d.dataset.reldetail)});
relGraph();

/* ============================================================
   TYPOGRAPHY PLAYGROUND
   ============================================================ */
/* Measure (line length) is the one variable the Editorial entry calls decisive —
   "행간과 단 폭(measure)이 읽기 속도를 결정한다" — and it was the one variable the
   playground could not change. The orange bar under the sample used to fake it
   from the alignment value; it now reports the real width. */
const PG_STATE={font:'Pretendard',weight:400,size:28,line:1.6,track:0,align:'left',measure:52};

/* Recommended ranges, stated as guidance rather than pass/fail — the chapter is
   explicit that these are conventions, not correct answers. */
const PG_GUIDE={
  weight:{band:[400,700],
    lo:'한글 본문에는 얇다 — 크기가 작아지면 획이 뭉개진다.',
    ok:'한글 본문에 무난한 굵기.',
    hi:'헤드라인용 굵기. 본문에 쓰면 답답해진다.'},
  size:{band:[14,17],
    lo:'본문으로는 작다 — 캡션·라벨 영역.',
    ok:'본문에 적당한 크기.',
    hi:'본문보다 크다 — 헤드라인·리드 영역.'},
  line:{band:[1.5,1.8],
    lo:'한글에는 좁다 — 받침이 윗줄과 부딪힌다.',
    ok:'한글 본문이 편하게 읽히는 행간.',
    hi:'넓어서 줄과 줄이 따로 논다. 짧은 문단에만.'},
  track:{band:[-0.03,0.02],
    lo:'너무 좁혀 글자가 서로 붙는다.',
    ok:'자연스러운 자간.',
    hi:'대문자 라벨에는 좋지만 본문에서는 흩어진다.'},
  measure:{band:[45,75],
    lo:'한 줄이 짧아 시선이 자주 되돌아간다.',
    ok:'읽기 좋은 줄 길이.',
    hi:'한 줄이 길어 다음 줄 첫머리를 놓치기 쉽다.'},
};
const pgFmt=(k,v)=>k==='size'?v+'px':k==='track'?v+'em':k==='measure'?v+'ch':v;
function pgVerdict(k){
  const g=PG_GUIDE[k];if(!g)return{cls:'',msg:''};
  const v=PG_STATE[k],[lo,hi]=g.band;
  if(v<lo)return{cls:'lo',msg:g.lo};
  if(v>hi)return{cls:'hi',msg:g.hi};
  return{cls:'ok',msg:g.ok};
}
function initPgControls(){
  const mk=(key,label,min,max,step)=>{
    const g=PG_GUIDE[key],pct=x=>((x-min)/(max-min))*100;
    return `
    <div class="pg-group">
      <label>${label} <b data-pgb="${key}">${pgFmt(key,PG_STATE[key])}</b></label>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${PG_STATE[key]}" data-pgk="${key}"
             aria-label="${label}" aria-describedby="pgv-${key}">
      <div class="pg-band" aria-hidden="true">
        <i style="left:${pct(g.band[0])}%;width:${pct(g.band[1])-pct(g.band[0])}%"></i>
        <s data-pgm="${key}" style="left:${pct(PG_STATE[key])}%"></s>
      </div>
      <div class="pg-verdict" id="pgv-${key}" data-pgv="${key}" role="status"></div>
    </div>`;
  };
  $('#pgControls').innerHTML=`
    <div class="pg-group"><label>FONT <b data-pgb="font">${PG_STATE.font}</b></label>
      <select id="pgFont">${['Pretendard','Space Grotesk','Georgia','JetBrains Mono'].map(f=>`<option ${f===PG_STATE.font?'selected':''}>${f}</option>`).join('')}</select>
    </div>
    ${mk('size','SIZE',12,60,1)}
    ${mk('weight','WEIGHT',300,900,100)}
    ${mk('line','LINE HEIGHT',1,2.2,0.05)}
    ${mk('track','TRACKING',-0.05,0.3,0.005)}
    ${mk('measure','MEASURE — 한 줄 길이',20,90,1)}
    <div class="pg-group"><label>ALIGN</label>
      <div class="pg-radio" data-pgk="align">
        ${['left','center','right'].map(a=>`<button data-al="${a}" aria-pressed="${PG_STATE.align===a}" data-al-btn class="${PG_STATE.align===a?'on':''}">${a.toUpperCase()}</button>`).join('')}
      </div>
    </div>`;

  const ranges={};
  $$('#pgControls input[type=range]').forEach(el=>{ranges[el.dataset.pgk]=el});
  function sync(){
    $$('#pgControls [data-pgb]').forEach(b=>{
      const k=b.dataset.pgb;
      b.textContent=k==='font'?PG_STATE.font:pgFmt(k,PG_STATE[k]);
    });
    Object.keys(PG_GUIDE).forEach(k=>{
      const el=ranges[k];if(!el)return;
      const min=+el.min,max=+el.max,v=pgVerdict(k);
      const marker=$(`[data-pgm="${k}"]`);
      if(marker)marker.style.left=((PG_STATE[k]-min)/(max-min))*100+'%';
      const out=$(`[data-pgv="${k}"]`);
      if(out){out.textContent=v.msg;out.className='pg-verdict '+v.cls}
    });
  }
  $$('#pgControls [data-pgk]').forEach(el=>{
    if(el.dataset.pgk==='align'){
      $$('button',el).forEach(b=>b.addEventListener('click',()=>{
        PG_STATE.align=b.dataset.al;
        $$('button',el).forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});
        renderPg();
      }));
      return;
    }
    el.addEventListener('input',()=>{PG_STATE[el.dataset.pgk]=+el.value;sync();renderPg()});
  });
  $('#pgFont').addEventListener('change',e=>{PG_STATE.font=e.target.value;sync();renderPg()});
  sync();renderPg();
}
function renderPg(){
  const fontMap={'Pretendard':'var(--sans)','Space Grotesk':'var(--disp)','Georgia':"Georgia,'Noto Serif KR',serif",'JetBrains Mono':'var(--mono)'};
  const f=fontMap[PG_STATE.font]||'var(--sans)';
  const style=`font-family:${f};font-weight:${PG_STATE.weight};line-height:${PG_STATE.line};letter-spacing:${PG_STATE.track}em;text-align:${PG_STATE.align}`;
  const m=pgVerdict('measure');
  const align=PG_STATE.align==='center'?'0 auto':PG_STATE.align==='right'?'0 0 0 auto':'0 auto 0 0';
  $('#pgSample').innerHTML=`
    <span class="pg-tag">${PG_STATE.font} · ${PG_STATE.weight} · ${PG_STATE.size}px · ${PG_STATE.measure}ch</span>
    <div class="pg-measure ${m.cls}" style="max-width:${PG_STATE.measure}ch;margin:${align}">
      <span class="pg-mbar"></span>
      <div class="pg-kr" style="${style};font-size:${PG_STATE.size}px;color:var(--ink)">여백이 구조를 만든다. 크기와 간격이 위계를 만들고, 한 줄의 길이가 읽는 속도를 정한다.</div>
      <div class="pg-en" style="${style};font-size:${Math.round(PG_STATE.size*0.62)}px;color:var(--ink-3);margin-top:18px">Whitespace builds structure. Scale and spacing create hierarchy, and the length of a line sets the pace of reading.</div>
    </div>`;
}
initPgControls();

/* ============================================================
   ROUTING — 챕터마다 진짜 페이지
   한 문서에 전부 넣고 해시로 감추던 방식을 걷어냈다. 이제 챕터 하나가
   파일 하나다. 링크는 그냥 링크이고, 이동은 브라우저가 한다.
   ============================================================ */
const STUDY_IDS=['principles','styles','compare','relation','layouts','ui','type','color','a11y','system','analyzer'];
const CHAPTER_NAME={principles:'디자인 원칙',styles:'스타일 백과사전',compare:'스타일 비교 랩',relation:'스타일 관계 지도',layouts:'레이아웃 백과사전',ui:'UI 패턴 라이브러리',type:'타이포그래피 랩',color:'컬러 시스템',a11y:'접근성',system:'디자인 시스템',analyzer:'디자인 분석기'};

/* 이 페이지가 어느 챕터인가 — 문서에 실제로 들어 있는 섹션이 답이다. */
const PAGE_ID=(document.querySelector('.study-section')||{}).id||'';
const IN_PAGES=/\/pages\//.test(location.pathname);
const BASE=IN_PAGES?'':'pages/';
const HOME=IN_PAGES?'../index.html':'index.html';
const chapterHref=id=>IN_PAGES?`${id}.html`:`pages/${id}.html`;
function goChapter(id){location.href=chapterHref(id)}

if(PAGE_ID)addVisited(PAGE_ID);

/* 예전 링크 호환 — index.html#styles, index.html?view=styles 로 저장해 둔 주소를
   각자의 페이지로 넘긴다. */
(function legacy(){
  if(PAGE_ID)return;
  const v=new URLSearchParams(location.search).get('view')||decodeURIComponent(location.hash).slice(1);
  if(v&&STUDY_IDS.includes(v))location.replace(chapterHref(v));
})();

document.addEventListener('click',e=>{if(e.target.closest('[data-scrolltop]')){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})}});
$('.skip-link')?.addEventListener('click',e=>{
  e.preventDefault();const m=$('#main');m.focus();m.scrollIntoView({block:'start'});
});
requestAnimationFrame(()=>$('.nav a.active')?.scrollIntoView({behavior:'instant',inline:'center',block:'nearest'}));

/* 검색 결과로 이동 — 같은 페이지면 그 자리에서 처리하고,
   다른 챕터면 의도를 주소에 실어 그 페이지로 넘긴다. */
function gotoChapter(id,params,here){
  if(id===PAGE_ID){here&&here();return}
  const q=params?'?'+new URLSearchParams(params):'';
  location.href=chapterHref(id)+q;
}

/* 로드맵·검색에서 "이걸 열어줘"를 주소로 받아 처리한다. */
window.addEventListener('load',()=>{
  const q=new URLSearchParams(location.search);
  const st=q.get('open'),ly=q.get('ly'),cat=q.get('cat'),term=q.get('q');
  if(st&&typeof openStyleModal==='function')setTimeout(()=>openStyleModal(st),80);
  if(ly&&typeof openLayoutModal==='function')setTimeout(()=>openLayoutModal(ly),80);
  if(cat&&$('#uiTabs')){uiCat=cat;$$('#uiTabs .ui-tab').forEach(x=>x.classList.toggle('on',x.dataset.cat===cat));renderUi()}
  if(term&&$('#layoutSearch')){$('#layoutSearch').value=term;renderLayouts(term)}
});

/* 같은 페이지 안이면 스크롤, 다른 챕터면 그 페이지로 이동한다. */
function scrollToId(sel){
  const id=String(sel).replace('#','');
  if(STUDY_IDS.includes(id)&&id!==PAGE_ID){goChapter(id);return}
  if(id==='roadmap'){location.href=HOME;return}
  document.querySelector('#'+id)?.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ============================================================
   GLOBAL SEARCH
   ============================================================ */
const globalSearch=$('#globalSearch'),mobileSearch=$('#mobileSearch'),searchResults=$('#searchResults'),searchResultsM=$('#searchResultsM'),srCount=$('#srCount');
const srBoxes=[searchResults,searchResultsM].filter(Boolean);
function doGlobalSearch(q){
  q=q.trim().toLowerCase();
  if(!q){srBoxes.forEach(b=>b.classList.remove('open'));globalSearch.setAttribute('aria-expanded','false');srCount.textContent='';return}
  const results=[];
  const seen=new Set();
  const pushStyle=s=>{
    if(seen.has('S'+s.id))return;seen.add('S'+s.id);
    results.push({cat:'Style',name:s.name,sub:s.tagline,go:()=>gotoChapter('styles',{open:s.id},()=>{styleState.cat='all';styleState.term='';$$('.f-btn[data-f]').forEach(x=>x.classList.remove('on'));$('.f-btn[data-f="all"]').classList.add('on');renderStyles();openStyleModal(s.id)})});
  };
  const pushLayout=l=>{
    if(seen.has('L'+l.id))return;seen.add('L'+l.id);
    results.push({cat:'Layout',name:l.name,sub:l.use,go:()=>gotoChapter('layouts',{q:l.name},()=>{$('#layoutSearch').value=l.name;renderLayouts(l.name)})});
  };
  STYLES.forEach(s=>{if((s.name+' '+s.kr+' '+s.tagline+' '+s.feats.join(' ')).toLowerCase().includes(q))pushStyle(s)});
  const aliasIds=SEARCH_ALIASES[q]||Object.keys(SEARCH_ALIASES).find(k=>q.includes(k))&&SEARCH_ALIASES[Object.keys(SEARCH_ALIASES).find(k=>q.includes(k))];
  if(aliasIds)aliasIds.forEach(id=>{
    const s=STYLES.find(x=>x.id===id);if(s)pushStyle(s);
    const l=LAYOUTS.find(x=>x.id===id);if(l)pushLayout(l);
  });
  STYLES.forEach(s=>{if((STYLE_KW[s.id]||[]).some(k=>k.toLowerCase().includes(q)||q.includes(k.toLowerCase())))pushStyle(s)});
  LAYOUTS.forEach(l=>{if((l.name+' '+l.kr+' '+l.use+' '+l.desc).toLowerCase().includes(q))pushLayout(l)});
  Object.keys(UI_PATTERNS).forEach(cat=>UI_PATTERNS[cat].forEach(p=>{
    if((p.name+' '+p.why+' '+p.desc).toLowerCase().includes(q))results.push({cat:'UI',name:p.name,sub:p.why,go:()=>gotoChapter('ui',{cat},()=>{uiCat=cat;$$('#uiTabs .ui-tab').forEach(x=>x.classList.toggle('on',x.dataset.cat===cat));renderUi()})})
  }));
  TERMS.forEach(t=>{if((t.name+' '+t.kr).toLowerCase().includes(q))results.push({cat:'Type',name:t.name,sub:t.kr,go:()=>gotoChapter('type')})});
  FONTS.forEach(f=>{if(f.name.toLowerCase().includes(q))results.push({cat:'Font',name:f.name,sub:f.en,go:()=>gotoChapter('type')})});
  COLORS.forEach(c=>{if(c.name.toLowerCase().includes(q))results.push({cat:'Color',name:c.name,sub:c.kr,go:()=>gotoChapter('color')})});
  ROADMAP.forEach(r=>{if((r.name+' '+r.en).toLowerCase().includes(q))results.push({cat:'Roadmap',name:r.name,sub:r.en,go:()=>{location.href=HOME}})});
  const shown=results.slice(0,12);
  const html=shown.map((r,i)=>`
    <button type="button" class="sr-item" role="option" aria-selected="false" id="sr-${i}"><span class="sr-cat">${r.cat}</span><span style="min-width:0"><span class="sr-name">${esc(r.name)}</span><span class="sr-sub">${esc(r.sub)}</span></span></button>`).join('')
    ||`<div class="sr-empty">'${esc(q)}'에 대한 결과가 없습니다</div>`;
  srBoxes.forEach(box=>{box.innerHTML=html;box.classList.add('open')});
  globalSearch.setAttribute('aria-expanded','true');
  srCount.textContent=shown.length?`검색 결과 ${shown.length}건`:'검색 결과 없음';
  srIndex=-1;
  srBoxes.forEach(box=>$$('.sr-item',box).forEach((el,i)=>el.addEventListener('click',()=>runResult(shown,i))));
  srResults=shown;
}
/* 결과를 클릭으로만 고를 수 있었다 — 검색어는 칠 수 있는데 선택은 마우스가
   있어야 했다. 접근성 챕터를 쓴 사이트에서 그대로 둘 수 없다. */
let srResults=[],srIndex=-1;
function runResult(list,i){
  const r=list[i];if(!r)return;
  srBoxes.forEach(b=>b.classList.remove('open'));
  searchWrap?.classList.remove('open');searchToggle?.setAttribute('aria-expanded','false');
  if(globalSearch)globalSearch.value='';if(mobileSearch)mobileSearch.value='';
  r.go();
}
function moveSr(d){
  const items=$$('.sr-item',searchResults);if(!items.length)return;
  srIndex=(srIndex+d+items.length)%items.length;
  items.forEach((el,i)=>{
    const on=i===srIndex;
    el.classList.toggle('sel',on);el.setAttribute('aria-selected',String(on));
    if(on)el.scrollIntoView({block:'nearest'});
  });
  globalSearch.setAttribute('aria-activedescendant',items[srIndex].id);
}
/* 760px 이하에서는 헤더에 입력창 자리가 없어 아이콘으로 연다. */
const searchToggle=$('#searchToggle'),searchWrap=$('#searchWrap');
if(searchToggle&&searchWrap)searchToggle.addEventListener('click',e=>{
  e.stopPropagation();
  const open=searchWrap.classList.toggle('open');
  searchToggle.setAttribute('aria-expanded',String(open));
  searchToggle.setAttribute('aria-label',open?'검색 닫기':'검색 열기');
  if(open)globalSearch.focus();else searchResults.classList.remove('open');
});
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!searchWrap)return;
  searchWrap.classList.remove('open');searchResults.classList.remove('open');
  searchToggle?.setAttribute('aria-expanded','false');
});
[globalSearch,mobileSearch].filter(Boolean).forEach(inp=>inp.addEventListener('keydown',e=>{
  if(!searchResults.classList.contains('open'))return;
  if(e.key==='ArrowDown'){e.preventDefault();moveSr(1)}
  else if(e.key==='ArrowUp'){e.preventDefault();moveSr(-1)}
  else if(e.key==='Enter'&&srIndex>-1){e.preventDefault();runResult(srResults,srIndex)}
}));
[globalSearch,mobileSearch].filter(Boolean).forEach(inp=>inp.addEventListener('input',e=>doGlobalSearch(e.target.value)));
[globalSearch,mobileSearch].filter(Boolean).forEach(inp=>inp.addEventListener('focus',e=>{if(e.target.value)doGlobalSearch(e.target.value)}));
document.addEventListener('click',e=>{
  if(e.target.closest('.search'))return;
  srBoxes.forEach(b=>b.classList.remove('open'));
  searchWrap?.classList.remove('open');searchToggle?.setAttribute('aria-expanded','false');
});

/* 토글 버튼이 상태를 색으로만 말하고 있었다 — 접근성 트리에는 아무 정보가 없어
   "탭, 버튼" 세 개가 똑같이 읽혔다. .on 클래스를 상태의 단일 출처로 두고
   aria-pressed가 따라가게 한다. 렌더러마다 손으로 넣으면 반드시 하나를 빠뜨린다. */
const TOGGLE_SEL='.switcher button,.ly-toggle button,.ui-tab,.an-mode,.f-btn,.cmp-chip,.pdemo-toggle button,.mini-tabs button,.qz-mode';
const syncPressed=root=>$$(TOGGLE_SEL,root).forEach(b=>b.setAttribute('aria-pressed',String(b.classList.contains('on'))));
new MutationObserver(ms=>{
  for(const m of ms){
    if(m.type==='attributes'){
      const t=m.target;
      if(t.matches&&t.matches(TOGGLE_SEL))t.setAttribute('aria-pressed',String(t.classList.contains('on')));
    }else{
      m.addedNodes.forEach(n=>{if(n.nodeType===1)syncPressed(n)});
    }
  }
}).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
syncPressed();

/* init */
renderStyles();renderFavBadge();renderLearnChips();
function observeAll(){$$('.reveal').forEach(el=>{if(!el.classList.contains('in'))io.observe(el)})}
observeAll();
window.addEventListener('load',observeAll);
