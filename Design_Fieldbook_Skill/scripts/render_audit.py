#!/usr/bin/env python3
"""design-fieldbook 완료 전 **렌더링** 검증 스크립트.

용법: python3 render_audit.py <생성한 HTML 경로> [--widths 1440,1100,768,500]

gate.py를 거치지 않고 직접 호출해도 SKILL.md "완료 전 — 게이트 루프" 1단계(미적 독립
검토)가 먼저 통과했는지 스스로 확인한다 — `<html>.feel-review.json`이 없거나, 검토 이후
**구도가 바뀌었거나**(색값만 바뀐 경우는 면제 — `feel_review.py`), findings가 비어있지
않으면 실행을 거부한다(예외 없음. 렌더 검증은 정의상 1단계 다음 단계다).

`verify.py`는 소스 코드만 읽는다. 그래서 "렌더링해야만 보이는 결함"은 원리적으로 못 잡는다 —
데드스페이스, 컬럼 높이 불균형, 고아줄, 가로 오버플로, 액센트 실제 면적, 상속된 배경 위의
텍스트 대비 같은 것들이다. e라운드에서 이 구멍이 그대로 드러났다: verify.py는 통과했고,
게이트 2단계("실제 렌더링 + 스크린샷")는 사람 눈에 맡긴 자문자답이라 아무것도 강제하지
못했다. 이 스크립트가 그 2단계를 기계화한다.

동작: 대상 HTML이 있는 디렉터리를 임시 HTTP 서버로 띄우고(로컬 `file://`은 브라우저가
거부하거나 경로의 콜론 때문에 깨진다), 측정 JS를 주입한 사본을 headless Chrome으로 폭별로
렌더링해 `--dump-dom`으로 결과를 회수한다. 외부 의존성 없음.

측정 항목 — 전부 `getBoundingClientRect`/`getComputedStyle` 기반 실측이다:
  1. 가로 오버플로 (scrollWidth > clientWidth)
  2. 그리드/플렉스 한 행의 자식 높이 불균형 (align-items가 stretch가 아닐 때만 발생)
  3. 카드 내부 가로 여백 낭비 (폭 600px+ 카드에서 콘텐츠가 오른쪽 50% 이상을 비움)
  4. 헤드라인 고아줄 (마지막 줄 폭이 최장 줄의 30% 미만) + 폭별 줄 수
  5. 텍스트 대비 (계산된 색 + 조상에서 실제로 상속된 배경)
  6. 섹션 배경 밴드가 페이지 배경과 델타 10 미만
  7. 터치 타겟 24px/44px
  8. overflow:hidden 안에서 잘린 콘텐츠
  9. 채도 있는 배경의 실제 면적 비율 (SKILL.md 액센트 5–12% 원칙 — 정적으로는 측정 불가)
 10. 표 — 행 경계마다 보이는 구분 장치가 있는가 · 행 틴트가 인접 행까지 번졌는가 · 첫 열 정렬

폭별 측정은 **동시에** 돌린다. 한 폭당 시간의 대부분이 Chrome 콜드 스타트(실측 2.3초)라
순차로 돌면 폭 수만큼 그 값을 다시 낸다 — 5폭 기준 12.6초 → 4.5초(측정 내용은 동일).

**좁은 폭**: CLI headless Chrome은 레이아웃 뷰포트를 500px 아래로 못 내린다(`--window-size=390`을
줘도 500으로 고정 — 실측 확인). 그래서 그 아래 폭은 대상을 **폭 W짜리 iframe에 가둬서** 잰다 —
iframe 안에서는 미디어 쿼리가 iframe 폭을 기준으로 동작한다. 실제로 g라운드의 390px nav 오버플로와
h라운드의 `min-width:auto` 오버플로가 둘 다 이 구간에서만 나왔다.
"""

import base64
import concurrent.futures
import functools
import http.server
import json
import re
import shutil
import socket
import socketserver
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

import feel_review

DEFAULT_WIDTHS = [1440, 1100, 768, 500, 390]
VIEWPORT_FLOOR = 500      # CLI headless의 레이아웃 뷰포트 하한. 이 아래는 iframe으로 잰다

# 하한 아래 폭을 재는 래퍼 — 대상을 폭 W짜리 iframe에 가두면 그 안에서는 미디어 쿼리가
# iframe 폭을 기준으로 동작한다. iframe 문서에서 측정이 끝나면 결과를 부모로 끌어올려
# --dump-dom이 볼 수 있게 한다.
NARROW_WRAPPER = """<!DOCTYPE html><html><head><meta charset="utf-8">
<style>html,body{{margin:0;background:#fff}} iframe{{width:{w}px;height:900px;border:0;display:block}}</style>
</head><body>
<iframe id="f" src="{src}"></iframe>
<script>
var f=document.getElementById('f'), tries=0;
function poll(){{
  tries++;
  try{{
    var d=f.contentDocument, el=d && d.getElementById('__audit__');
    if(el && el.textContent){{
      var o=document.createElement('div'); o.id='__audit__';
      o.textContent=el.textContent; document.body.appendChild(o); return;
    }}
  }}catch(e){{}}
  if(tries<60) setTimeout(poll,200);
}}
poll();
</script></body></html>"""

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]

AUDIT_JS = r"""
<script id="__audit_script__">
// load 직후에 재면 안 된다 — 진입 애니메이션(opacity:0 → 1)이 아직 안 끝나서
// 히어로 전체가 "보이지 않는 요소"로 잡히고 측정에서 통째로 빠진다. 실제로 e라운드
// 페이지에서 h1/lead/cta가 전부 누락됐다. 애니메이션이 끝난 뒤에 잰다.
addEventListener('load', function () { setTimeout(function () {
  function rgb(s){var t=String(s), m=t.match(/[\d.]+/g); if(!m) return null;
    // `color(srgb 0.98 0.97 0.96 / 0.88)`(CSS Color 4)는 채널이 0–1이다. 0–255로 읽으면
    // 거의 흰 배경이 거의 검정으로 뒤집혀 대비가 1.1:1로 나온다 — taste-skill 산출물을
    // 재다가 실제로 그 오탐이 났다. lab()/oklch() 등 우리가 못 푸는 표기는 null을 돌려
    // 조상 탐색을 계속하게 한다(틀린 값을 쓰는 것보다 낫다).
    if(/^color\(/.test(t)){
      if(!/^color\(\s*srgb\b/.test(t)) return null;
      return [+m[0]*255,+m[1]*255,+m[2]*255, m.length>3?parseFloat(m[3]):1];
    }
    if(/^(lab|lch|oklab|oklch)\(/.test(t)) return null;
    return [+m[0],+m[1],+m[2], m.length>3?parseFloat(m[3]):1];}
  function lin(c){c/=255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
  function lum(c){return 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);}
  function cr(a,b){var l1=lum(a),l2=lum(b);
    return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);}
  function over(f,b){var a=f[3]; return [0,1,2].map(function(i){
    return Math.round(f[i]*a+b[i]*(1-a));});}
  function hsl(r,g,b){r/=255;g/=255;b/=255;
    var mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;
    if(mx===mn) return [0,0,l];
    var d=mx-mn, s=l>0.5?d/(2-mx-mn):d/(mx+mn), h;
    if(mx===r) h=((g-b)/d)%6; else if(mx===g) h=(b-r)/d+2; else h=(r-g)/d+4;
    return [h*60,s,l];}
  function delta(a,b){return (Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2]))/3;}

  function effBg(el){
    var stack=[], n=el;
    while(n && n.nodeType===1){
      var c=rgb(getComputedStyle(n).backgroundColor);
      if(c && c[3]>0){ stack.push(c); if(c[3]>0.99) break; }
      n=n.parentElement;
    }
    var base=[255,255,255];
    for(var i=stack.length-1;i>=0;i--){
      base = stack[i][3]>0.99 ? stack[i].slice(0,3) : over(stack[i], base);
    }
    return base;
  }
  function path(el){
    var id = el.id ? '#'+el.id : '';
    var cls = (el.getAttribute('class')||'').trim().split(/\s+/)
                .filter(Boolean).slice(0,2).map(function(c){return '.'+c;}).join('');
    return el.tagName.toLowerCase()+id+cls;
  }
  function visible(el){
    var cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.1) return false;
    var r=el.getBoundingClientRect();
    return r.width>1 && r.height>1;
  }
  function lineWidths(el){
    var rng=document.createRange(); rng.selectNodeContents(el);
    var rects=[].slice.call(rng.getClientRects()).filter(function(x){
      return x.width>0.5 && x.height>0.5;});
    var lines=[];
    rects.forEach(function(x){
      for(var i=0;i<lines.length;i++){
        if(Math.abs(lines[i].t-x.top)<=3){
          lines[i].l=Math.min(lines[i].l,x.left);
          lines[i].r=Math.max(lines[i].r,x.right); return;
        }
      }
      lines.push({t:x.top,l:x.left,r:x.right});
    });
    lines.sort(function(a,b){return a.t-b.t;});
    return lines.map(function(v){return v.r-v.l;});
  }

  var de=document.documentElement;
  var all=[].slice.call(document.querySelectorAll('body *'));
  var out={width:de.clientWidth, height:de.scrollHeight};

  // 1. 가로 오버플로
  out.overflow={px: Math.round(de.scrollWidth-de.clientWidth), items:[]};
  if(de.scrollWidth-de.clientWidth>1){
    all.forEach(function(n){
      var r=n.getBoundingClientRect();
      if(r.width>0 && r.right>de.clientWidth+1)
        out.overflow.items.push({sel:path(n), right:Math.round(r.right)});
    });
    out.overflow.items=out.overflow.items.slice(0,8);
  }

  // 2. 한 행 자식 높이 불균형
  out.imbalance=[];
  all.forEach(function(el){
    var cs=getComputedStyle(el);
    if(!/grid|flex/.test(cs.display)) return;
    if(/flex/.test(cs.display) && /column/.test(cs.flexDirection)) return;
    // 10px짜리 점·아이콘은 컬럼이 아니다 — 옆의 텍스트 블록과 높이비를 재면 항상 걸린다.
    var kids=[].slice.call(el.children).filter(function(k){
      if(!visible(k)) return false;
      var r=k.getBoundingClientRect();
      return r.height>=24 && r.width>=40;
    });
    if(kids.length<2) return;
    var rects=kids.map(function(k){return k.getBoundingClientRect();});
    // align-items:center면 자식들의 top이 서로 다르다 — top 일치로 같은 행을 판정하면
    // 정확히 그 경우(짧은 카드가 세로 가운데에 떠 있는 상태)를 놓친다. 세로 구간이
    // 겹치는지로 판정한다.
    var anchor=rects.reduce(function(a,b){return b.height>a.height?b:a;});
    var row=rects.filter(function(r){
      var ov=Math.min(r.bottom,anchor.bottom)-Math.max(r.top,anchor.top);
      return ov > 0.5*Math.min(r.height,anchor.height);
    });
    if(row.length<2) return;
    // 같은 클래스가 3번 이상 나오면 페이지 레이아웃이 아니라 반복 카드 컴포넌트다
    // (라벨 레일 `160px 1fr` 같은 구조는 짧은 쪽이 짧은 게 정상).
    var first=(el.getAttribute('class')||'').trim().split(/\s+/)[0];
    if(first && document.querySelectorAll('.'+CSS.escape(first)).length>=3) return;
    // sticky를 건 컬럼은 짧아도 따라다니므로 빈 공간이 아니다(정적 검사엔 이미 있던 예외).
    for(var ki=0; ki<kids.length; ki++){
      if(getComputedStyle(kids[ki]).position === 'sticky') return;
    }
    var hs=row.map(function(r){return r.height;});
    // 작은 컴포넌트 안의 높이비는 결함이 아니다 — 진짜 컬럼(200px 이상)일 때만 본다.
    if(Math.max.apply(null,hs)<200) return;
    var ratio=Math.max.apply(null,hs)/Math.max(Math.min.apply(null,hs),1);
    if(ratio>=1.8)
      out.imbalance.push({sel:path(el), heights:hs.map(Math.round),
                          ratio:+ratio.toFixed(2), align:cs.alignItems});
  });

  // 3. 카드 내부 가로 여백 낭비 (자기 배경을 가진 넓은 표면만)
  out.wasted=[];
  all.forEach(function(el){
    if(/^(SECTION|NAV|HEADER|FOOTER|ASIDE)$/.test(el.tagName)) return;
    var cs=getComputedStyle(el);
    var own=rgb(cs.backgroundColor);
    if(!own || own[3]<0.05) return;
    var parentBg = el.parentElement ? effBg(el.parentElement) : [255,255,255];
    if(delta(over(own,parentBg), parentBg) < 6) return;
    var r=el.getBoundingClientRect();
    // 좁은 카드·한 줄짜리 리스트 행에서 오른쪽이 비는 건 정상이다(짧은 텍스트 + 왼쪽 정렬).
    // 결함으로 읽히는 건 "넓고 높은 카드인데 절반이 빈" 경우다.
    if(r.width<600 || r.height<60) return;
    // 콘텐츠의 실제 오른쪽 끝은 '리프 요소'가 아니라 '텍스트 노드'로 재야 한다 —
    // <br>을 품은 <span>은 children.length가 1이라 리프 판정에서 빠지고, 그러면 그 안의
    // 글자가 전혀 측정되지 않아 "82% 비었다" 같은 엉터리 값이 나온다.
    var right=-Infinity, count=0;
    var walker=document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var tn;
    while((tn=walker.nextNode())){
      if(!tn.textContent.trim()) continue;
      var trg=document.createRange(); trg.selectNodeContents(tn);
      var trs=trg.getClientRects();
      for(var ti=0; ti<trs.length; ti++){
        if(trs[ti].width>0.5){ right=Math.max(right,trs[ti].right); count++; }
      }
    }
    [].slice.call(el.querySelectorAll('img,svg,video,canvas,input,button')).forEach(function(m){
      var q=m.getBoundingClientRect();
      if(q.width>1&&q.height>1){ right=Math.max(right,q.right); count++; }
    });
    if(!count || right===-Infinity) return;
    var usable=r.right-(parseFloat(cs.paddingRight)||0);
    var waste=(usable-right)/r.width;
    if(waste>0.5)
      out.wasted.push({sel:path(el), width:Math.round(r.width),
                       contentRight:Math.round(right), wastePct:Math.round(waste*100)});
  });

  // 4. 헤드라인 줄 수 / 고아줄
  out.headlines=[]; out.orphans=[];
  all.forEach(function(el){
    var cs=getComputedStyle(el);
    if(parseFloat(cs.fontSize)<28) return;
    if(!visible(el)) return;
    var hasText=[].slice.call(el.childNodes).some(function(n){
      return n.nodeType===3 && n.textContent.trim().length>1;});
    if(!hasText && !el.querySelector('span,br,em,strong')) return;
    var w=lineWidths(el);
    if(!w.length) return;
    var mx=Math.max.apply(null,w), last=w[w.length-1];
    out.headlines.push({sel:path(el), size:Math.round(parseFloat(cs.fontSize)),
                        lines:w.length, text:el.textContent.trim().replace(/\s+/g,' ').slice(0,24)});
    if(w.length>=2 && last/mx<0.3)
      out.orphans.push({sel:path(el), lines:w.length,
                        lastPct:Math.round(100*last/mx),
                        text:el.textContent.trim().replace(/\s+/g,' ').slice(0,24)});
  });

  // 5. 텍스트 대비 (계산된 색 + 실제 상속 배경)
  out.contrast=[]; out.unmeasurable=[]; var seen={};
  all.forEach(function(el){
    var direct=[].slice.call(el.childNodes).some(function(n){
      return n.nodeType===3 && n.textContent.trim().length>1;});
    if(!direct || !visible(el)) return;
    var cs=getComputedStyle(el);
    // 그라데이션 텍스트(background-clip:text + color:transparent)는 계산된 color가
    // 투명이라 대비가 1:1로 나온다 — 실제 색은 배경 그라데이션이 그린다. 기계 측정 불가.
    var clip=(cs.backgroundClip||'')+' '+(cs.webkitBackgroundClip||'');
    var fg=rgb(cs.color);
    if(!fg) return;
    // 그라데이션 '배경' 위의 텍스트도 마찬가지다 — backgroundColor는 투명이라
    // 조상까지 거슬러 올라가 엉뚱한 면과 비교하게 된다.
    var gradAnc=false;
    for(var g=el; g && g.nodeType===1; g=g.parentElement){
      var gi=getComputedStyle(g).backgroundImage||'';
      if(gi.indexOf('gradient')>=0){ gradAnc=true; break; }
      var gc=rgb(getComputedStyle(g).backgroundColor);
      if(gc && gc[3]>0.99) break;
    }
    if(fg[3]<0.05 || clip.indexOf('text')>=0 || gradAnc){
      out.unmeasurable.push({sel:path(el), text:el.textContent.trim().replace(/\s+/g,' ').slice(0,26)});
      return;
    }
    var bg=effBg(el);
    var f=fg[3]>0.99?fg.slice(0,3):over(fg,bg);
    var size=parseFloat(cs.fontSize), wt=parseInt(cs.fontWeight,10)||400;
    var need=(size>=24||(size>=18.66&&wt>=700))?3:4.5;
    var ratio=cr(f,bg);
    if(ratio>=need) return;
    var key=path(el)+'|'+ratio.toFixed(2);
    if(seen[key]) return; seen[key]=1;
    out.contrast.push({sel:path(el), ratio:+ratio.toFixed(2), need:need,
                       size:+size.toFixed(1),
                       text:el.textContent.trim().replace(/\s+/g,' ').slice(0,26)});
  });
  out.contrast=out.contrast.slice(0,12);

  // 6. 섹션 배경 밴드
  out.bands=[];
  var pageBg=effBg(document.body);
  [].slice.call(document.querySelectorAll('section')).forEach(function(s){
    var own=rgb(getComputedStyle(s).backgroundColor);
    if(!own || own[3]<0.05) return;
    var d=delta(over(own,pageBg), pageBg);
    if(d<10) out.bands.push({sel:path(s), delta:+d.toFixed(1)});
  });

  // 7. 터치 타겟
  out.tap24=[]; out.tap44=[];
  [].slice.call(document.querySelectorAll('a,button,input,select,textarea,[role=button]'))
    .forEach(function(el){
      if(!visible(el)) return;
      var cs=getComputedStyle(el);
      if(cs.display==='inline') return;
      var r=el.getBoundingClientRect();
      var m=Math.min(r.width,r.height);
      var rec={sel:path(el), size:Math.round(r.width)+'x'+Math.round(r.height)};
      if(m<24) out.tap24.push(rec); else if(m<44) out.tap44.push(rec);
    });
  out.tap24=out.tap24.slice(0,8); out.tap44=out.tap44.slice(0,8);

  // 8. overflow:hidden 클리핑
  out.clipped=[];
  all.forEach(function(el){
    var cs=getComputedStyle(el);
    var hx=/hidden|clip/.test(cs.overflowX), hy=/hidden|clip/.test(cs.overflowY);
    if(!hx && !hy) return;
    // .sr-only 류(1px 박스 + clip)는 일부러 잘라놓은 것이다
    var rr=el.getBoundingClientRect();
    if(rr.width<=2 || rr.height<=2) return;
    if(cs.clipPath && cs.clipPath!=='none') return;
    // 숨긴 축에서 넘쳤을 때만 잘린 것이다 — overflow-x:auto + overflow-y:hidden인
    // 가로 스크롤 표 래퍼가 "잘렸다"로 잡히던 오탐을 막는다.
    var ox = hx ? el.scrollWidth-el.clientWidth : 0;
    var oy = hy ? el.scrollHeight-el.clientHeight : 0;
    if(Math.max(ox,oy) > 2)
      out.clipped.push({sel:path(el), over:Math.round(Math.max(ox,oy))});
  });
  out.clipped=out.clipped.slice(0,6);

  // 9. 채도 있는 배경 면적 비율
  var chroma=0, counted=[];
  all.forEach(function(el){
    var c=rgb(getComputedStyle(el).backgroundColor);
    if(!c || c[3]<0.2) return;
    var h=hsl(c[0],c[1],c[2]);
    if(h[1]<0.25 || h[2]>0.95 || h[2]<0.04) return;
    for(var p=el.parentElement;p;p=p.parentElement)
      if(counted.indexOf(p)>=0) return;
    var r=el.getBoundingClientRect();
    if(r.width<1||r.height<1) return;
    counted.push(el); chroma += r.width*r.height;
  });
  out.accentPct = +(100*chroma/(de.clientWidth*de.scrollHeight)).toFixed(1);

  // 10. 표 — 행 구분선 · 행 틴트 번짐 · 첫 열 정렬
  // 세 항목 다 정적으로도 잡지만(verify.py check_table_rules), 캐스케이드·상속·인라인
  // 스타일을 거친 뒤 화면에 실제로 그려진 결과는 렌더링해야만 알 수 있다.
  out.tableLine=[]; out.tableBleed=[]; out.tableAlign=[]; out.tableCount=0;
  [].slice.call(document.querySelectorAll('table')).forEach(function(t){
    var rows=[].slice.call(t.querySelectorAll('tr')).filter(visible);
    if(rows.length<3) return;
    out.tableCount++;
    var info=rows.map(function(r){
      var cells=[].slice.call(r.children).filter(function(c){
        return /^(TD|TH)$/.test(c.tagName);});
      var first=cells[0];
      var bw=0, bc=null;
      [r].concat(cells).forEach(function(el){
        var cs=getComputedStyle(el);
        var w=parseFloat(cs.borderBottomWidth)||0;
        if(w>bw && cs.borderBottomStyle!=='none' && cs.borderBottomStyle!=='hidden'){
          bw=w; bc=rgb(cs.borderBottomColor);
        }
      });
      return {bg: first?effBg(first):effBg(r), bw:bw, bc:bc,
              head: !!(first && first.tagName==='TH'),
              align: first?getComputedStyle(first).textAlign:null,
              label: first?first.textContent.trim().replace(/\s+/g,' ').slice(0,14):''};
    });

    // (a) 행 경계마다 실제로 보이는 구분 장치가 있는가 (선 또는 면 전환)
    var naked=[];
    for(var i=0;i<info.length-1;i++){
      var a=info[i], b=info[i+1];
      var lineOk=false;
      if(a.bw>0 && a.bc && a.bc[3]>0.05){
        var lc=over(a.bc, a.bg);
        lineOk = delta(lc,a.bg)>=18 || cr(lc,a.bg)>=3;
      }
      if(!lineOk && delta(a.bg,b.bg)>=10) lineOk=true;   // 면 전환이 경계를 만든다
      if(!lineOk) naked.push(i+1);
    }
    if(naked.length)
      out.tableLine.push({sel:path(t), rows:info.length, naked:naked.length,
                          at:naked.slice(0,6).join(',')});

    // (b) 구분/강조 행 틴트가 인접 행까지 번졌는가
    var counts={};
    info.forEach(function(r){var k=r.bg.join(','); counts[k]=(counts[k]||0)+1;});
    for(var j=0;j<info.length-1;j++){
      var k1=info[j].bg.join(','), k2=info[j+1].bg.join(',');
      if(k1!==k2 || counts[k1]>info.length/2) continue;
      out.tableBleed.push({sel:path(t), rgb:k1,
                           at:(info[j].head?'헤더':(j+1)+'행')+'+'+(j+2)+'행',
                           text:info[j].label});
    }

    // (c) 첫 열 정렬
    var off=info.filter(function(r){
      return r.align && r.align!=='center';});
    if(off.length)
      out.tableAlign.push({sel:path(t), align:off[0].align, n:off.length,
                           text:off[0].label});
  });
  out.tableBleed=out.tableBleed.slice(0,4);

  var box=document.createElement('div');
  box.id='__audit__';
  box.textContent=btoa(unescape(encodeURIComponent(JSON.stringify(out))));
  document.body.appendChild(box);
}, 1600); });
</script>
"""

FAILS, WARNS, PASSES = [], [], []
PLAN_SRC = [None]   # 선언한 톤을 report()에서 읽기 위해 원본 HTML을 담아둔다


def fail(msg):
    FAILS.append(msg)


def warn(msg):
    WARNS.append(msg)


def ok(msg):
    PASSES.append(msg)


def find_chrome():
    for path in CHROME_CANDIDATES:
        if Path(path).exists():
            return path
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        found = shutil.which(name)
        if found:
            return found
    return None


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def serve(directory):
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    handler = functools.partial(QuietHandler, directory=str(directory))

    class Quiet(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True

        def handle_error(self, *args):
            pass

    port = free_port()
    httpd = Quiet(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, port


def _dump(chrome, url, win_w, win_h=900, budget=6000):
    proc = subprocess.run(
        [chrome, "--headless", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
         f"--window-size={win_w},{win_h}", f"--virtual-time-budget={budget}", "--dump-dom", url],
        capture_output=True, text=True, timeout=180,
    )
    m = re.search(r'id="__audit__">([A-Za-z0-9+/=]+)<', proc.stdout)
    return json.loads(base64.b64decode(m.group(1)).decode("utf-8")) if m else None


def render(chrome, url, width):
    return _dump(chrome, url, width)


def render_narrow(chrome, directory, base_url, target_name, width):
    """헤드리스 하한(500px) 아래 폭 — iframe에 가둬서 잰다.

    `--window-size=390`을 줘도 clientWidth가 500으로 고정되기 때문에, 예전에는 이 구간이
    통째로 육안 항목이었다. 실제로 g라운드의 390px nav 오버플로와 h라운드의 min-width:auto
    오버플로가 둘 다 이 구간에서만 나왔다 — 기계로 재는 편이 낫다.
    """
    wrapper = Path(directory) / f".narrow-{width}.html"
    wrapper.write_text(NARROW_WRAPPER.format(w=width, src=target_name), encoding="utf-8")
    try:
        return _dump(chrome, f"{base_url}/{wrapper.name}", width + 60, 1000, 9000)
    finally:
        wrapper.unlink(missing_ok=True)


def at(widths):
    return "@" + "/".join(str(w) for w in widths) + "px"


def collect(results, key):
    """항목별로 '어느 폭에서 나왔는지'를 묶는다. 같은 결함이 여러 폭에서 반복되면 한 줄로 합친다.

    시그니처는 sel만으로 만들면 안 된다 — 형제 요소(li 여러 개)가 한 항목으로 뭉쳐서
    폭 목록이 중복되고, 표시되는 수치가 서로 다른 요소에서 섞여 나온다.
    """
    grouped = {}
    for width, data in results.items():
        for idx, item in enumerate(data.get(key, [])):
            ident = "|".join(str(item.get(f, "")) for f in
                             ("sel", "text", "ratio", "delta", "size", "align"))
            sig = f"{ident}#{idx}" if not item.get("text") and not item.get("ratio") else ident
            entry = grouped.setdefault(sig, (item, []))
            if width not in entry[1]:
                entry[1].append(width)
    return sorted(grouped.values(), key=lambda kv: -len(kv[1]))


def report(results, widths):
    measured = sorted(results.keys(), reverse=True)

    over = [(w, results[w]["overflow"]) for w in measured if results[w]["overflow"]["px"] > 1]
    if over:
        for w, o in over[:2]:
            items = ", ".join(f"{i['sel']}(right={i['right']})" for i in o["items"][:4])
            fail(f"가로 오버플로 {o['px']}px @{w}px — 화면 밖으로 밀린 요소: {items}. 컨테이너에 `min-width:0`을 주거나 고정폭/고정 font-size를 줄인다")
    else:
        ok(f"가로 오버플로 없음 ({at(measured)})")

    imb = collect(results, "imbalance")
    if imb:
        for item, ws in imb[:4]:
            fail(f"{item['sel']} 한 행의 자식 높이가 {item['heights']}px로 {item['ratio']}배 차 (align-items:{item['align']}) {at(ws)} — 짧은 쪽이 허공에 뜬다. 짧은 컬럼에 콘텐츠를 더하거나 sticky를 걸거나 align-items를 stretch로 바꾼다(layout.md '2컬럼 분량 균형')")
    else:
        ok(f"그리드/플렉스 한 행 자식 높이 균형 양호 ({at(measured)})")

    waste = collect(results, "wasted")
    if waste:
        for item, ws in waste[:4]:
            fail(f"{item['sel']} 폭 {item['width']}px인데 콘텐츠가 {item['contentRight']}px에서 끝나 오른쪽 {item['wastePct']}%가 빔 {at(ws)} — 카드가 깨진 것처럼 보인다. 콘텐츠를 채우거나 카드 폭을 줄인다")
    else:
        ok(f"카드 내부 가로 여백 낭비 없음 ({at(measured)})")

    orphans = collect(results, "orphans")
    if orphans:
        for item, ws in orphans[:4]:
            fail(f"헤드라인 {item['sel']}(\"{item['text']}\")의 마지막 줄이 최장 줄의 {item['lastPct']}%뿐 — 고아줄 {at(ws)}. `<br>`을 빼고 `text-wrap:balance`에 맡기거나, 그 폭에서 font-size를 낮춘다(typography.md)")
    else:
        ok(f"헤드라인 고아줄 없음 ({at(measured)})")

    # 같은 sel이 여러 개일 수 있으므로 (선택자, 텍스트)로 짝을 맞춘다. 기준 폭 자신은 건너뛴다.
    widest = max(measured)
    base_map = {(x["sel"], x["text"]): x["lines"] for x in results[widest].get("headlines", [])}
    grown = {}
    for w in measured:
        if w == widest:
            continue
        for h in results[w].get("headlines", []):
            if h["size"] < 40:
                continue
            base = base_map.get((h["sel"], h["text"]))
            if base is not None and h["lines"] > base:
                grown.setdefault((h["sel"], h["text"], base, h["lines"]), []).append(w)
    for (sel, text, base, lines), ws in list(grown.items())[:4]:
        warn(f"헤드라인 {sel}(\"{text}\")이 {widest}px에서 {base}줄인데 {at(ws)}에서 {lines}줄로 늘어난다 — 의도한 줄 나눔인지 확인한다")

    contrast = collect(results, "contrast")
    if contrast:
        for item, ws in contrast[:8]:
            fail(f"텍스트 대비 {item['ratio']}:1 (기준 {item['need']}:1, {item['size']:g}px) — {item['sel']} \"{item['text']}\" {at(ws)}")
    else:
        ok(f"렌더링된 텍스트 대비 전부 기준 통과 ({at(measured)})")

    unmeas = collect(results, "unmeasurable")
    if unmeas:
        items = ", ".join(f"{i['sel']}(\"{i['text']}\")" for i, _w in unmeas[:5])
        warn(f"그라데이션 텍스트·그라데이션 배경 위 텍스트라 대비를 기계로 못 잰다: {items} — 그라데이션의 **가장 밝은 지점**과 텍스트 색으로 직접 계산해 4.5:1을 확인한다(color.md 'Painting vs Reading Color')")

    bands = collect(results, "bands")
    if bands:
        for item, ws in bands[:4]:
            fail(f"섹션 {item['sel']}의 배경이 페이지 배경과 델타 {item['delta']}뿐 — 섹션 전환이 화면에 안 보인다(color.md)")
    else:
        ok("섹션 배경 밴드 전부 페이지 배경과 구별됨")

    tap24 = collect(results, "tap24")
    if tap24:
        items = ", ".join(f"{i['sel']}({i['size']})" for i, _w in tap24[:5])
        fail(f"터치 타겟이 24×24px 미만 (WCAG 2.2 최소치 미달): {items}")
    tap44 = collect(results, "tap44")
    if tap44:
        items = ", ".join(f"{i['sel']}({i['size']})" for i, _w in tap44[:5])
        warn(f"터치 타겟이 44×44px 미만 (권장치 미달): {items}")
    if not tap24 and not tap44:
        ok("터치 타겟 전부 44×44px 이상")

    clipped = collect(results, "clipped")
    if clipped:
        items = ", ".join(f"{i['sel']}(+{i['over']}px)" for i, _w in clipped[:5])
        warn(f"overflow:hidden 안에서 콘텐츠가 잘림: {items} — 캐러셀처럼 의도한 것이면 무시, 아니면 잘린 글자가 있다")

    tline = collect(results, "tableLine")
    if tline:
        for item, ws in tline[:3]:
            fail(f"{item['sel']}의 행 경계 {item['naked']}곳에 구분 장치가 없다(행 {item['at']} 아래) {at(ws)} — "
                 f"`tbody td {{ border-bottom: 1px solid var(--line) }}`로 **모든 행 경계**에 선을 긋는다. "
                 f"선이 코드엔 있는데 여기 걸렸다면 색이 배경과 붙은 것이다(대비 3:1 또는 RGB 델타 18 필요 — `references/ui-patterns.md` 표 강제 규칙)")
    tbleed = collect(results, "tableBleed")
    if tbleed:
        for item, ws in tbleed[:3]:
            fail(f"{item['sel']}에서 행 틴트가 두 행에 걸쳐 있다({item['at']}, rgb({item['rgb']})) {at(ws)} — "
                 f"구분/강조 행 배경은 그 한 행의 `th`/`td`에만 건다. 두 행이 같은 색이면 한 덩어리로 읽혀 "
                 f"'구분 행'이라는 신호 자체가 사라진다(`references/ui-patterns.md` 표 강제 규칙)")
    talign = collect(results, "tableAlign")
    if talign:
        for item, ws in talign[:3]:
            fail(f"{item['sel']} 첫 열 셀 {item['n']}개가 `text-align:{item['align']}`로 그려진다"
                 f"(예: \"{item['text']}\") {at(ws)} — 첫 열은 `th`·`td` 모두 center 강제다"
                 f"(`references/ui-patterns.md` 표 강제 규칙)")
    if not (tline or tbleed or talign) and any(results[w].get("tableCount") for w in measured):
        ok(f"표 행 구분선·행 틴트 스코프·첫 열 정렬 전부 통과 ({at(measured)})")

    pcts = {w: results[w]["accentPct"] for w in measured}
    top = pcts[max(measured)]

    # 산출물이 선언한 톤(SKILL.md TPO 판정)이 있으면 그 면적 밴드로 판정한다.
    # 채도는 verify.py가 정적으로 재고, 면적은 렌더링해야만 알 수 있다.
    # 면적은 톤만으로 못 정한다 — 세 장르 프로브에서 전부 밴드를 벗어났고 셋 다 정상이었다:
    # 문서 4.7%(링크·콜아웃에만 씀) · 앱 0.8%(거의 중립) · 캠페인 46.7%(전면 컬러 밴드가
    # 임팩트 톤의 정의). 같은 톤이라도 장르가 바뀌면 적정 면적이 한 자릿수 배로 달라진다.
    bands = {
        ("마케팅", "절제"): (5, 15), ("마케팅", "중립"): (8, 25), ("마케팅", "임팩트"): (15, 55),
        ("앱", "절제"): (0.5, 8),   ("앱", "중립"): (2, 12),    ("앱", "임팩트"): (5, 18),
        ("문서", "절제"): (0.5, 8), ("문서", "중립"): (2, 12),  ("문서", "임팩트"): (5, 18),
    }
    tone = genre = None
    pm = re.search(r'/\*\s*plan\b(.*?)\*/', PLAN_SRC[0] or "", re.S | re.I)
    if pm and re.search(r'액센트\s*:\s*없음', pm.group(1)):
        # 무채색 체계(`tokens.py --no-accent`)는 채도 면적이 0에 가까운 게 정상이다 —
        # 수상작 절제 팔레트(Ceragres·Measured 등)가 실제로 그렇다. 밴드를 적용하지 않는다.
        ok(f"`액센트: 없음(중립 4단)` 선언 — 채도 면적 밴드 미적용(실측 {top}%). "
           f"위계가 중립 명도 단계로 서는지는 1단계 미적 검토가 본다")
        return
    if pm:
        tm = re.search(r'톤\s*:\s*(\S+)', pm.group(1))
        if tm:
            tone = tm.group(1).strip()
        gm = re.search(r'장르\s*:\s*(\S+)', pm.group(1))
        if gm:
            genre = gm.group(1).strip()
    if (genre, tone) in bands:
        lo, hi = bands[(genre, tone)]
        if lo <= top <= hi:
            over_w = [w for w, v in pcts.items() if v > hi]
            ok(f"액센트 실제 면적 {top}% — '{genre}·{tone}' 밴드({lo}–{hi}%) 안 (기준: 최대 폭 {widest}px, 폭별 {pcts})")
            if over_w:
                warn(f"좁은 폭 {', '.join(str(w) for w in sorted(over_w))}px에서는 액센트 면적이 {max(pcts[w] for w in over_w)}%로 밴드 상한 {hi}%를 넘는다 — 콘텐츠가 세로로 쌓이면서 액센트 면의 비중이 커진 것이다. 그 폭에서 액센트 블록이 화면을 지배하는지 스크린샷으로 확인한다")
        else:
            fail(f"액센트 실제 면적 {top}%가 '{genre}·{tone}' 밴드({lo}–{hi}%)를 벗어난다 (폭별 {pcts}) — 톤 판정을 바꾸든 면적을 조정하든 둘을 일치시킨다(SKILL.md 'TPO 판정')")
        return

    if top < 3:
        warn(f"채도 있는 배경 면적이 {top}%뿐 (폭별 {pcts}) — 액센트 5–12% 원칙의 하한 아래다. 색이 텍스트·보더로만 쓰이고 면으로는 거의 안 쓰였다는 뜻이다(color.md)")
    elif top > 25:
        warn(f"채도 있는 배경 면적이 {top}% (폭별 {pcts}) — 액센트 5–12% 원칙을 크게 넘었다. 액센트가 배경이 되면 강조 기능을 잃는다(color.md)")
    else:
        ok(f"채도 있는 배경 면적 {top}% (폭별 {pcts})")


def main():
    args = sys.argv[1:]
    widths = DEFAULT_WIDTHS
    if "--widths" in args:
        i = args.index("--widths")
        widths = [int(x) for x in args[i + 1].split(",")]
        del args[i:i + 2]
    if len(args) != 1:
        print("용법: python3 render_audit.py <html 파일 경로> [--widths 1440,1100,768,500]")
        sys.exit(2)

    path = Path(args[0]).resolve()
    if not path.exists():
        print(f"파일 없음: {path}")
        sys.exit(2)

    feel_ok, feel_msg, feel_note = feel_review.check(path)
    if feel_ok and feel_note:
        print(f"\n1단계 기록 재사용 — {feel_note}\n")
    if not feel_ok:
        print("\n=== render_audit.py: 1단계(미적 독립 검토) 미통과로 실행 차단 ===\n")
        print(f"    {feel_msg}\n")
        print("render_audit.py를 직접 불러서 1단계를 우회할 수 없다 — gate.py로 전체 순서를 돈다.\n")
        sys.exit(2)

    chrome = find_chrome()
    if not chrome:
        print("Chrome/Chromium 실행 파일을 못 찾았다. CHROME_CANDIDATES에 경로를 추가하거나 PATH에 chromium을 올린다.")
        sys.exit(2)

    narrow = sorted([w for w in widths if w < VIEWPORT_FLOOR], reverse=True)
    widths = [w for w in widths if w >= VIEWPORT_FLOOR]
    if not widths and not narrow:
        print("측정할 폭이 없다.")
        sys.exit(2)

    src = path.read_text(encoding="utf-8")
    PLAN_SRC[0] = src
    injected = src.replace("</body>", AUDIT_JS + "</body>") if "</body>" in src else src + AUDIT_JS

    httpd, port = serve(path.parent)
    results = {}
    try:
        with tempfile.NamedTemporaryFile("w", dir=path.parent, suffix=".audit.html",
                                         encoding="utf-8", delete=True) as tmp:
            tmp.write(injected)
            tmp.flush()
            base_url = f"http://127.0.0.1:{port}"
            url = f"{base_url}/{Path(tmp.name).name}"
            # 폭별 측정은 서로 독립이고, 한 번당 시간의 대부분이 Chrome 콜드 스타트(실측
            # 2.3초)다 — 순차로 돌리면 폭 수만큼 그 값을 다시 낸다. 동시에 띄우면 게이트
            # 한 회차가 12.6초에서 4초 아래로 떨어진다(측정 내용은 그대로다).
            jobs = [(w, False) for w in widths] + [(w, True) for w in narrow]
            with concurrent.futures.ThreadPoolExecutor(max_workers=min(6, len(jobs) or 1)) as pool:
                futures = {
                    pool.submit(render_narrow, chrome, path.parent, base_url,
                                Path(tmp.name).name, w) if is_narrow
                    else pool.submit(render, chrome, url, w): (w, is_narrow)
                    for w, is_narrow in jobs
                }
                for fut in concurrent.futures.as_completed(futures):
                    w, is_narrow = futures[fut]
                    try:
                        data = fut.result()
                    except Exception as exc:            # 한 폭이 죽어도 나머지는 살린다
                        warn(f"{w}px 측정이 예외로 끝났다({exc.__class__.__name__}) — 이 폭 결과는 없다")
                        continue
                    if data is None:
                        warn(f"{w}px 렌더링 결과를 회수하지 못했다 — 페이지에 스크립트 오류가 있는지 확인한다"
                             if not is_narrow else f"{w}px(iframe 측정) 결과를 회수하지 못했다")
                        continue
                    if is_narrow and data.get("width") != w:
                        warn(f"{w}px를 요청했는데 iframe 안 뷰포트가 {data.get('width')}px로 잡혔다 — 이 폭의 결과는 신뢰하지 않는다")
                        continue
                    results[w] = data
    finally:
        httpd.shutdown()

    if not results:
        print("모든 폭에서 측정에 실패했다. HTML에 </body>가 있는지, 콘솔 오류가 없는지 확인한다.")
        sys.exit(2)

    report(results, widths)

    print(f"\n=== {path.name} 렌더링 검증 결과 ({', '.join(f'{w}px' for w in sorted(results, reverse=True))}) ===\n")
    for m in PASSES:
        print(f"  PASS  {m}")
    for m in WARNS:
        print(f"  WARN  {m}")
    for m in FAILS:
        print(f"  FAIL  {m}")

    print(f"\n{len(PASSES)} pass · {len(WARNS)} warn · {len(FAILS)} fail\n")
    if narrow:
        print(f"참고: {', '.join(str(w) for w in narrow)}px는 iframe에 가둬서 측정했다 — CLI headless의 뷰포트 하한이 {VIEWPORT_FLOOR}px라 직접은 못 내려간다.\n")
    if FAILS:
        print("FAIL이 있는 상태로는 완료 보고하지 않는다. 위 항목을 고치고 재실행한다.")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
