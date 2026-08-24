/**
 * diary-image — 일기를 한 장의 이미지(PNG)로 그려 기기에 저장한다.
 *
 * 외부 라이브러리(html2canvas 등) 없이 **네이티브 Canvas2D**로 직접 그린다(CRITICAL #5).
 * 저장은 앱인토스 `saveBase64Data`(기기 저장) — 토스 웹뷰가 아니면(브라우저 미리보기) `<a download>`로 폴백.
 * 외부 전송 0(CRITICAL #1): 캔버스 렌더 → 기기 저장만. 네트워크/서버 없음.
 *
 * jsdom처럼 canvas 미지원 환경에서는 getContext가 null → 'unsupported'로 안전 종료(크래시 0).
 */
import { GAEGU_HANGUL } from './gaegu-coverage';

/** 이미지에 그릴 일기 데이터(저장 타입과 분리 — 화면이 조립해 넘긴다). */
export interface DiaryImageInput {
  /** `YYYY-MM-DD`. */
  date: string;
  /** 제목(선택). */
  title?: string;
  /** 기분 1~5. */
  mood: number;
  /** 본문. */
  text: string;
  /** 그날 날씨 — 이모지(구름/해/비) + "지역 상태 온도". 없으면 생략. */
  weather?: { emoji: string; text: string };
  /** 그날 운세 — 총운(1~5) + 분류별 점수(연애/금전/직장, 각 1~5) + 행운색. 없으면 생략. */
  fortune?: {
    overall: number;
    scores?: { love: number; wealth: number; health: number };
    luckyColor: string;
    luckyColorHex: string;
  };
  /** 그날 타로 — 카드 이미지 경로 + 라벨(예: '오늘의 타로 · 바보 · 역방향'). 없으면 생략. */
  tarot?: { imageSrc: string; label: string };
  /** 그날 "한 일"(완료한 메모) 텍스트 목록. 비었으면 섹션 생략. */
  doneItems?: string[];
  /** 그날 "남은 할 일"(미완료) 텍스트 목록. 비었으면 섹션 생략. */
  todoItems?: string[];
  /** "다가오는 날"(디데이) 텍스트 목록(예: 'D-3  여행'). 비었으면 섹션 생략. */
  ddayItems?: string[];
  /** 손글씨 글씨체 CSS family(예: "'PoorStory'"). 미설정 시 기본 PoorStory. 화면 선택과 동일하게. */
  fontFamily?: string;
  /** 첨부 사진(다운스케일 JPEG dataURL). 있으면 본문 위에 한 장 넣는다. */
  photo?: string;
}

/** 그리기에 쓸, 이미 로드된 이미지 묶음(비동기 로드는 saveDiaryImage가 담당). */
interface DiaryImageAssets {
  /** 첨부 사진(로드 완료). */
  photo?: HTMLImageElement | null;
  /** 앱 로고(로드 완료). */
  logo?: HTMLImageElement | null;
  /** 타로 카드 이미지(로드 완료). */
  tarot?: HTMLImageElement | null;
}

const W = 720;
const PAD = 48;
// 공유 이미지 색 — 화면 일기(라벤더 저널)와 동일 컬러셋 정합.
const COL = {
  bg: '#FBFAFE', // 연라벤더 메모지(화면 일기와 동일)
  card: '#FFFFFF',
  line: '#E1D7F2',
  ink: '#3D3550', // 진한 플럼(따뜻하고 부드럽게 — 차콜 고딕 느낌 완화)
  body: '#403852',
  sub: '#8B8593', // 보조 텍스트(뉴트럴 그레이)
  rule: '#DCD0F0', // 일기 괘선(연한 라벤더 — 일기장 느낌 식별되게)
  star: '#9A77D6', // 별점/강조 보라(강조에만 제한적으로)
  green: '#22A75A', // 완료 체크(초록, 사용자 요청)
  terracotta: '#9A77D6', // 브랜드 워드마크 보라
};

/** 라운드 사각형 path(라운드 카드·사진 코너용). r은 폭/높이 절반으로 클램프. */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 일기장 물결무늬 밑줄(앱 DiaryScreen의 wave 타일과 동일 규격: 반파장 20px·진폭 2.5). */
function drawWave(ctx: CanvasRenderingContext2D, x0: number, x1: number, yy: number, color: string) {
  const seg = 20;
  const amp = 2.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, yy);
  let x = x0;
  let up = true;
  while (x < x1) {
    const nx = Math.min(x + seg, x1);
    ctx.quadraticCurveTo((x + nx) / 2, yy + (up ? -amp : amp), nx, yy);
    x = nx;
    up = !up;
  }
  ctx.stroke();
}

/** 점수(0~100) → 3분위 색: 빨강/노랑/초록(사용자 요청). */
function scoreColor(s: number): string {
  if (s >= 70) return '#1FA055'; // 초록
  if (s >= 50) return '#D99400'; // 노랑(앰버 — 크림 종이에서 가독)
  return '#E0413F'; // 빨강
}

/** 기분 하트(채움 + 빈) — 별 대신 하트로 기분 표시(사용자 요청). */
function hearts(mood: number): string {
  const n = Math.max(0, Math.min(5, Math.round(mood)));
  return '♥♥♥♥♥'.slice(0, n) + '♡♡♡♡♡'.slice(0, 5 - n);
}

/** 종이 질감 — 미세한 결(스페클 노이즈 + 가로 섬유). 카드 안쪽에만. */
function drawPaperTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 34);
  ctx.clip();
  // 미세 스페클(아주 옅게 — 종이 알갱이).
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const dots = Math.round((w * h) / 900);
  for (let i = 0; i < dots; i++) {
    const px = x + rnd() * w;
    const py = y + rnd() * h;
    const a = 0.018 + rnd() * 0.022;
    ctx.fillStyle = rnd() > 0.5 ? `rgba(120,100,70,${a})` : `rgba(255,255,255,${a + 0.02})`;
    ctx.fillRect(px, py, 1.4, 1.4);
  }
  ctx.restore();
}

/** 사실적인 스프링 노트 바인딩 — 종이 상단의 펀치 구멍 + 그 위를 도는 금속 코일 링. */
function drawSpiralBinding(ctx: CanvasRenderingContext2D, cardX: number, cardY: number, cardW: number) {
  const n = 9;
  const topY = cardY; // 종이 상단(코일이 가장자리를 감는다)
  const mgn = 48; // 라운드 모서리 피하려고 좌우 여백
  for (let i = 0; i < n; i++) {
    const cx = cardX + mgn + (cardW - mgn * 2) * (i / (n - 1));
    // 1) 펀치 구멍(종이에 뚫린 듯 — 어두운 타원 + 아래쪽 하이라이트로 깊이).
    ctx.beginPath();
    ctx.ellipse(cx, topY + 26, 8, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#E9E3F1';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, topY + 26, 8, 10, 0, Math.PI * 0.05, Math.PI * 0.95);
    ctx.strokeStyle = 'rgba(60,45,90,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 2) 금속 코일 링 — 살짝 기운 타원 루프(상단 가장자리를 감는 은색 와이어).
    ctx.save();
    ctx.translate(cx, topY + 8);
    ctx.rotate(-0.32);
    const grad = ctx.createLinearGradient(-10, -20, 12, 16);
    grad.addColorStop(0, '#D8D3E0');
    grad.addColorStop(0.45, '#928AA6');
    grad.addColorStop(0.55, '#7E7593');
    grad.addColorStop(1, '#C9C3D6');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 21, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 와이어 하이라이트(금속 광택).
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(-1.5, -1.5, 9, 21, 0, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();
    ctx.restore();
  }
}

/** 요일 포함(앱 일기 헤더와 정합): '2026년 6월 27일 토요일'. */
function monthDayWeek(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}년 ${m}월 ${d}일 ${wd}요일`;
}

/**
 * 일기를 PNG dataURL로 그린다. canvas 미지원이면 null.
 * 높이는 본문 줄 수에 맞춰 동적으로 정한다.
 */
export function buildDiaryPng(input: DiaryImageInput, assets: DiaryImageAssets = {}): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const probe = document.createElement('canvas');
  const pctx = probe.getContext('2d');
  if (pctx == null) {
    return null;
  }

  // 사용자가 고른 손글씨 글씨체(화면과 동일). 미설정 시 PoorStory. canvas 폰트 shorthand의 family 부분.
  // ⚠️ 'Pretendard'를 손글씨와 sans-serif 사이에 끼운다: 손글씨 폰트가 (a)서브셋이라 일부 한글이 없거나
  //    (b)토스 웹뷰 캔버스에서 로드 실패해도, 한글 전체를 커버하고 항상 로드된 Pretendard로 폴백돼
  //    본문이 .notdef 동그라미(두부)로 깨지는 것을 막는다. (실측: Gaegu=2350자만 커버 → 두부 발생)
  // 토스 웹뷰의 캔버스는 글리프별 폰트 폴백을 안 한다(브라우저와 달리). 그래서 한글 서브셋 폰트
  // (개구=2350자)로 본문을 그리면 미수록 글자가 .notdef 동그라미(두부)로 찍힌다.
  // → **글자별로** 그린다: 선택 폰트가 가진 글자는 선택 폰트로(폰트 반영), 못 가진 글자만
  //   풀커버 손글씨(PoorStory)로 폴백. 선택 폰트가 풀커버면 그대로 한 폰트로 그린다.
  const selectedCss = input.fontFamily ?? "'PoorStory'";
  const selectedName = selectedCss.replace(/['"]/g, '').split(',')[0].trim();
  const subsetCoverage = selectedName === 'Gaegu' ? GAEGU_HANGUL : null;
  const FF = `${selectedCss}, 'Pretendard', sans-serif`;
  const FF_FALLBACK = `'PoorStory', 'Pretendard', sans-serif`;
  // 이 글자를 선택 폰트로 그려도 되는지(서브셋이면 한글 음절 커버 여부 확인).
  const charFamily = (ch: string): string => {
    if (subsetCoverage == null) return FF;
    const c = ch.codePointAt(0) ?? 0;
    if (c >= 0xac00 && c <= 0xd7a3 && !subsetCoverage.has(ch)) return FF_FALLBACK;
    return FF;
  };
  // 글자별 폰트로 한 줄의 폭을 측정(주어진 컨텍스트·크기 spec 사용).
  const measureMixed = (c: CanvasRenderingContext2D, text: string, spec: string): number => {
    let w = 0;
    for (const ch of text) {
      c.font = `${spec} ${charFamily(ch)}`;
      w += c.measureText(ch).width;
    }
    return w;
  };
  // 제목·라벨·헤딩은 둥근 디스플레이 폰트(Jua)로 — 손글씨를 UI에까지 쓰면 고딕/옛날 느낌이라 분리.
  // (Jua는 한글 서브셋이라 흔한 라벨만 쓰고, 빠진 글자는 Pretendard로 폴백.)
  const JUA = `'Jua', 'Pretendard', sans-serif`;
  const contentW = W - PAD * 2;

  // 본문 줄 계산 — 글자별 폰트(선택/폴백)로 폭을 측정해 줄바꿈(혼합 렌더와 정합). 본문 36px.
  const BODY_SPEC = '36px';
  const bodyLines: string[] = (() => {
    const out: string[] = [];
    for (const para of input.text.trim().split('\n')) {
      if (para === '') {
        out.push('');
        continue;
      }
      let line = '';
      let lineW = 0;
      for (const ch of para) {
        pctx.font = `${BODY_SPEC} ${charFamily(ch)}`;
        const cw = pctx.measureText(ch).width;
        if (lineW + cw > contentW && line !== '') {
          out.push(line);
          line = ch;
          lineW = cw;
        } else {
          line += ch;
          lineW += cw;
        }
      }
      out.push(line);
    }
    return out;
  })();

  // 목록 항목 — 빈 항목 제거(높이는 아래 2열 레이아웃에서 계산).
  const clean = (arr?: string[]) => (arr ?? []).map((t) => t.trim()).filter((t) => t !== '');
  const doneItems = clean(input.doneItems);
  const todoItems = clean(input.todoItems);
  const ddayItems = clean(input.ddayItems);

  // 첨부 사진 — 콘텐츠 폭 풀폭. 세로로 긴 사진만 높이 상한에서 위아래 가운데 크롭(좌우 잘림 0).
  const photo = assets.photo ?? null;
  const PHOTO_MAX_H = 380;
  let photoBoxH = 0;
  if (photo != null && photo.naturalWidth > 0) {
    const ar = photo.naturalHeight / photo.naturalWidth;
    photoBoxH = Math.min(Math.round(contentW * ar), PHOTO_MAX_H);
  }

  const hasTitle = (input.title?.trim() ?? '') !== '';
  const SYM = `'Pretendard', sans-serif`; // 별/하트 기호는 커버리지 확실한 폰트로.

  // ── 레이아웃 상수(블록 높이) — H 계산과 그리기에서 동일하게 재사용(어긋남 방지) ──
  const BIND_H = 54; // 상단 일기장 바인딩 장식 밴드
  // 클래식 공책 폼 헤더: (제목) + '날짜' 행 + '날씨' 행 + '운세' 행.
  const TITLE_H = hasTitle ? 56 : 0;
  const ROW_H = 50;
  const DATESUB_H = ROW_H; // '날짜' 행(항상)
  const WEATHER_H = input.weather ? ROW_H : 0; // '날씨' 행
  const FORTUNE_ROW_H = input.fortune != null ? ROW_H : 0; // '운세' 행(점수)
  const REC_HEAD_H = 52;
  const REC_LINE_H = 48;
  const bodyH = Math.max(bodyLines.length, 1) * REC_LINE_H;

  // 하단 2열(왼: 오늘 한 일 + 남은 할 일 / 오: 다가오는 날) — 열 높이.
  const LIST_HEAD_H = 44;
  const LIST_LINE_H = 44;
  const colSectionH = (items: string[]) => (items.length > 0 ? LIST_HEAD_H + items.length * LIST_LINE_H : 0);
  const leftColH = colSectionH(doneItems) + (todoItems.length > 0 ? (doneItems.length > 0 ? 16 : 0) + colSectionH(todoItems) : 0);
  const rightColH = colSectionH(ddayItems);
  const listsRowH = Math.max(leftColH, rightColH);

  const FOOTER_H = 74; // 로고·워드마크 크게(사용자 요청)

  const titleStartY = 22 + BIND_H + 24;
  const blocks =
    TITLE_H + DATESUB_H + WEATHER_H + FORTUNE_ROW_H +
    22 + REC_HEAD_H + bodyH +
    (photoBoxH > 0 ? 18 + photoBoxH : 0) +
    (listsRowH > 0 ? 22 + listsRowH : 0);
  const H = titleStartY + blocks + 30 + FOOTER_H + 24;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx == null) {
    return null;
  }

  // 글자별 폰트로 한 줄을 그린다(선택 폰트가 가진 글자=선택 폰트 / 없는 글자=풀커버 손글씨).
  // spec = 크기/굵기 prefix(예: '36px'). fillStyle은 호출부에서 지정. 끝 x 반환.
  const drawMixed = (text: string, x: number, yy: number, spec: string): number => {
    let cx = x;
    for (const ch of text) {
      ctx.font = `${spec} ${charFamily(ch)}`;
      ctx.fillText(ch, cx, yy);
      cx += ctx.measureText(ch).width;
    }
    return cx;
  };

  // 배경 — 부드러운 라벤더 세로 그라데이션.
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#F3EEFC');
  bgGrad.addColorStop(1, '#EDE7FB');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 카드 = 실제 노트 종이 — 따뜻한 크림색 + 라운드 + 은은한 그림자.
  const cardX = 22;
  const cardY = 22;
  const cardW = W - cardX * 2;
  const cardH = H - cardY * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(86, 60, 140, 0.18)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 16;
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 36);
  const paperGrad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
  paperGrad.addColorStop(0, '#FDFCF8');
  paperGrad.addColorStop(1, '#F7F4EC');
  ctx.fillStyle = paperGrad; // 크림 종이
  ctx.fill();
  ctx.restore();
  // 종이 질감(미세 결).
  drawPaperTexture(ctx, cardX, cardY, cardW, cardH);
  // 종이 테두리(얇게).
  roundRectPath(ctx, cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1, 36);
  ctx.strokeStyle = '#E6E0D2';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 왼쪽 마진선(실제 노트의 빨간/분홍 세로선).
  const marginX = PAD - 14;
  ctx.strokeStyle = 'rgba(225,120,150,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, cardY + 70);
  ctx.lineTo(marginX, cardY + cardH - 30);
  ctx.stroke();

  // ── 상단 사실적 스프링 바인딩(금속 코일 + 펀치 구멍) ──
  drawSpiralBinding(ctx, cardX, cardY, cardW);

  // 얇은 가로 구분선 헬퍼.
  const hr = (yy: number) => {
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD, yy);
    ctx.lineTo(W - PAD, yy);
    ctx.stroke();
  };

  let y = titleStartY;
  ctx.textBaseline = 'top';

  // ── (선택) 제목 — 둥근 Jua ──
  if (hasTitle) {
    ctx.fillStyle = COL.ink;
    ctx.font = `42px ${JUA}`;
    ctx.fillText(input.title!.trim(), PAD, y);
    y += TITLE_H;
  }

  // ── 클래식 공책 폼: '날짜' / '날씨' 라벨 행(우리가 기본으로 채워주는 칸) ──
  // 작은 라벤더 라벨 칩 + 값. 학교 일기장 같은 흔한 폼.
  const drawLabelChip = (label: string, yy: number): number => {
    ctx.font = `22px ${JUA}`;
    const lw = ctx.measureText(label).width;
    const chipW = lw + 26;
    roundRectPath(ctx, PAD, yy, chipW, 36, 12);
    ctx.fillStyle = '#ECE4FA';
    ctx.fill();
    ctx.fillStyle = '#8E6BD4';
    ctx.fillText(label, PAD + 13, yy + 7);
    return PAD + chipW + 16; // 값 시작 x
  };
  // 폼 값 글씨 크기 통일(날짜·날씨·운세 동일). 라벨 칩과 값의 세로 중심도 맞춘다.
  const VAL = '27px';
  const valY = (yy: number) => yy + 5; // 칩(36)과 값 baseline 정렬
  // 날짜 행
  {
    const vx = drawLabelChip('날짜', y);
    ctx.fillStyle = COL.ink;
    ctx.font = `${VAL} ${JUA}`;
    ctx.fillText(monthDayWeek(input.date), vx, valY(y));
    y += ROW_H;
  }
  // 날씨 행 — 날짜와 같은 폰트(Jua)·같은 크기. 이모지 없이 상태 + 최저/최고.
  if (input.weather != null) {
    const vx = drawLabelChip('날씨', y);
    ctx.fillStyle = COL.ink;
    ctx.font = `${VAL} ${JUA}`;
    ctx.fillText(input.weather.text, vx, valY(y));
    y += WEATHER_H;
  }

  // 운세 행 — 점수(3분위 빨강/노랑/초록) + '/100점'(검정) + 괄호 안 분류별 점수(각 3분위 색).
  if (input.fortune != null) {
    const vx = drawLabelChip('운세', y);
    const to100 = (v: number) => Math.round(Math.max(0, Math.min(5, v)) * 20);
    const score = to100(input.fortune.overall);
    const vy = valY(y);
    ctx.font = `${VAL} ${JUA}`;
    ctx.fillStyle = scoreColor(score);
    ctx.fillText(`${score}점`, vx, vy);
    const sx = vx + ctx.measureText(`${score}점`).width;
    ctx.fillStyle = '#1A1A1A'; // '/100점'은 검정
    ctx.fillText('/100점', sx, vy);
    let px = sx + ctx.measureText('/100점').width + 14;
    const sc = input.fortune.scores;
    if (sc != null) {
      const sub: [string, number][] = [
        ['연애', to100(sc.love)],
        ['금전', to100(sc.wealth)],
        ['직장', to100(sc.health)],
      ];
      ctx.font = `21px ${JUA}`;
      const NEU = '#6E6678'; // 라벨·괄호 중립색
      const draw = (t: string, color: string) => {
        ctx.fillStyle = color;
        ctx.fillText(t, px, vy + 3);
        px += ctx.measureText(t).width;
      };
      draw('(', NEU);
      sub.forEach(([label, v], i) => {
        draw(`${label} `, NEU);
        draw(`${v}점`, scoreColor(v)); // 점수는 3분위 색
        if (i < 2) draw(' · ', NEU);
      });
      draw(')', NEU);
    }
    y += FORTUNE_ROW_H;
  }

  // ── 오늘의 기록 헤더 + 바로 옆 (평가: 하트) ──
  y += 8;
  hr(y);
  y += 14;
  ctx.fillStyle = COL.ink;
  ctx.font = `30px ${JUA}`;
  const recLabel = '📖 오늘의 기록';
  ctx.fillText(recLabel, PAD, y);
  let ex = PAD + ctx.measureText(recLabel).width + 16;
  // (평가: ♥♥♥♡♡) — 기록 오른쪽에 딱 붙여서.
  ctx.fillStyle = COL.sub;
  ctx.font = `24px ${JUA}`;
  ctx.fillText('(평가:', ex, y + 4);
  ex += ctx.measureText('(평가:').width + 8;
  const hStr = hearts(input.mood);
  ctx.font = `26px ${SYM}`;
  ctx.fillStyle = '#F2789F';
  ctx.fillText(hStr, ex, y + 3);
  ex += ctx.measureText(hStr).width + 4;
  ctx.fillStyle = COL.sub;
  ctx.font = `24px ${JUA}`;
  ctx.fillText(')', ex, y + 4);
  y += REC_HEAD_H;

  // ── 본문(물결무늬 밑줄 위 손글씨) — 글자별 폰트로 그려 선택 폰트 반영 + 두부 방지 ──
  for (const line of bodyLines) {
    drawWave(ctx, PAD, W - PAD, y + REC_LINE_H - 8, COL.rule);
    ctx.fillStyle = COL.body;
    drawMixed(line, PAD, y, '36px');
    y += REC_LINE_H;
  }

  // ── 사진(오늘의 기록 아래) — 풀폭·라운드, 세로 과한 것만 가운데 크롭 ──
  if (photo != null && photoBoxH > 0) {
    y += 18;
    const pr = 28;
    const fullH = contentW * (photo.naturalHeight / photo.naturalWidth);
    let sy = 0;
    let sH = photo.naturalHeight;
    if (fullH > photoBoxH) {
      sH = Math.round(photo.naturalWidth * (photoBoxH / contentW));
      sy = Math.round((photo.naturalHeight - sH) / 2);
    }
    ctx.save();
    roundRectPath(ctx, PAD, y, contentW, photoBoxH, pr);
    ctx.clip();
    ctx.drawImage(photo, 0, sy, photo.naturalWidth, sH, PAD, y, contentW, photoBoxH);
    ctx.restore();
    roundRectPath(ctx, PAD + 0.5, y + 0.5, contentW - 1, photoBoxH - 1, pr);
    ctx.strokeStyle = 'rgba(86, 60, 140, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    y += photoBoxH;
  }

  // ── 하단 2열(오늘 한 일·남은 할 일 | 다가오는 날) + 중앙 세로선(내용 높이만큼) ──
  if (listsRowH > 0) {
    y += 22;
    hr(y - 11);
    const colGap = 28;
    const colW = Math.round((contentW - colGap) / 2);
    const leftX = PAD;
    const rightX = PAD + colW + colGap;
    const rowTop = y;

    const drawCol = (
      x: number,
      sections: { title: string; items: string[]; bullet: string; color: string }[],
    ) => {
      let cy = rowTop;
      let first = true;
      for (const s of sections) {
        if (s.items.length === 0) continue;
        if (!first) cy += 16;
        first = false;
        ctx.fillStyle = COL.ink;
        ctx.font = `26px ${JUA}`;
        ctx.fillText(s.title, x, cy);
        cy += LIST_HEAD_H;
        ctx.font = `28px ${FF}`;
        const bw = ctx.measureText(`${s.bullet}  `).width;
        for (const item of s.items) {
          ctx.fillStyle = s.color;
          ctx.fillText(s.bullet, x, cy);
          ctx.fillStyle = COL.body;
          let txt = item;
          if (measureMixed(ctx, txt, '28px') > colW - bw) {
            while (txt.length > 1 && measureMixed(ctx, txt + '…', '28px') > colW - bw) txt = txt.slice(0, -1);
            txt += '…';
          }
          drawMixed(txt, x + bw, cy, '28px');
          cy += LIST_LINE_H;
        }
      }
    };

    drawCol(leftX, [
      { title: '✅ 오늘 한 일', items: doneItems, bullet: '✓', color: COL.green },
      { title: '📝 남은 할 일', items: todoItems, bullet: '▢', color: COL.sub },
    ]);
    drawCol(rightX, [{ title: '📅 다가오는 날', items: ddayItems, bullet: '·', color: COL.star }]);

    // 중앙 세로선 — 두 열 사이, 내용 높이만큼(본문과 같이 움직임).
    const midX = PAD + colW + colGap / 2;
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(midX, rowTop + 2);
    ctx.lineTo(midX, rowTop + listsRowH - 6);
    ctx.stroke();
    y += listsRowH;
  }

  // ── 푸터(로고 + 워드마크) — 크게(사용자 요청) ──
  const logo = assets.logo ?? null;
  const LOGO = 56;
  const footY = H - PAD - LOGO;
  let textX = PAD;
  if (logo != null && logo.naturalWidth > 0) {
    ctx.save();
    roundRectPath(ctx, PAD, footY, LOGO, LOGO, 14);
    ctx.clip();
    ctx.drawImage(logo, PAD, footY, LOGO, LOGO);
    ctx.restore();
    textX = PAD + LOGO + 16;
  }
  ctx.textBaseline = 'middle';
  const brand = '사주 다이어리';
  ctx.font = `36px ${JUA}`;
  const brandW = ctx.measureText(brand).width;
  ctx.fillStyle = COL.terracotta;
  ctx.fillText(brand, textX, footY + LOGO / 2 - 2);
  ctx.font = `26px ${JUA}`;
  ctx.fillStyle = COL.sub;
  ctx.fillText('in Toss', textX + brandW + 10, footY + LOGO / 2 - 1);
  ctx.textBaseline = 'top';

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** 이미지 dataURL/경로를 로드한다(실패·미지원 시 null). 캔버스 drawImage 전에 await. */
function loadImage(src: string | undefined | null): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (src == null || src === '' || typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 토스 웹뷰(앱인토스) 안인지 — 네이티브 브릿지 global 존재로 판정. */
function inTossApp(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window as { ReactNativeWebView?: unknown }).ReactNativeWebView != null
  );
}

export type SaveDiaryImageResult = 'saved' | 'downloaded' | 'unsupported';

/**
 * 선택한 손글씨 글씨체가 캔버스에 적용되려면 그리기 전에 폰트가 로드돼 있어야 한다.
 * (@font-face는 화면에서 쓰이면 이미 로드돼 있지만, 미사용 글씨체를 고른 직후엔 미로드일 수 있어
 *  명시적으로 로드 완료를 기다린다. 실패해도 sans-serif 폴백으로 안전.)
 */
async function ensureFontLoaded(family: string): Promise<void> {
  const families = [family, "'PoorStory'", "'Jua'", "'Pretendard'"];
  // (1) DOM 강제 페인트 — 일부 웹뷰는 document.fonts.load만으로는 캔버스에 폰트를 안 올린다.
  //     숨김 노드로 실제 한글을 한 번 그려 폰트를 확실히 래스터화시킨 뒤 제거한다(두부 방지).
  let probe: HTMLDivElement | null = null;
  try {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:nowrap;';
    probe.innerHTML = families
      .map((f) => `<span style="font-family:${f};font-size:40px">가나다라마ABC123</span>`)
      .join('');
    document.body.appendChild(probe);
    void probe.offsetWidth; // 강제 reflow
  } catch {
    /* DOM 사용 불가 환경(테스트 등) — 무시. */
  }
  // (2) FontFaceSet.load 대기.
  const fonts = (document as { fonts?: { load: (f: string) => Promise<unknown> } }).fonts;
  if (fonts != null) {
    try {
      await Promise.all([
        fonts.load(`28px ${family}`),
        fonts.load(`bold 52px ${family}`),
        fonts.load(`36px 'PoorStory'`),
        fonts.load(`46px 'Jua'`),
        fonts.load(`30px 'Jua'`),
        fonts.load(`38px 'Pretendard'`),
        fonts.load(`bold 38px 'Pretendard'`),
      ]);
    } catch {
      /* 로드 실패해도 그리기는 진행(폴백). */
    }
  }
  // 한 프레임 뒤 정리(페인트가 반영될 시간 확보).
  if (probe != null) {
    await new Promise((r) => setTimeout(r, 0));
    probe.remove();
  }
}

/**
 * 일기를 이미지로 저장한다. 토스 앱이면 기기 저장(saveBase64Data),
 * 브라우저면 다운로드(<a download>). canvas 미지원이면 'unsupported'.
 */
export async function saveDiaryImage(input: DiaryImageInput): Promise<SaveDiaryImageResult> {
  if (typeof document !== 'undefined') {
    await ensureFontLoaded(input.fontFamily ?? "'PoorStory'");
  }
  // 사진·로고·타로 카드를 먼저 로드(실패해도 그리기는 진행 — 안전).
  const [photo, logo, tarot] = await Promise.all([
    loadImage(input.photo),
    loadImage('/logo-192.png'),
    loadImage(input.tarot?.imageSrc),
  ]);
  const url = buildDiaryPng(input, { photo, logo, tarot });
  if (url == null) {
    return 'unsupported';
  }
  const fileName = `evrytimes-diary-${input.date}.png`;

  if (inTossApp()) {
    try {
      const mod = await import('@apps-in-toss/web-framework');
      const base64 = url.split(',')[1] ?? '';
      await mod.saveBase64Data({ data: base64, fileName, mimeType: 'image/png' });
      return 'saved';
    } catch {
      /* 기기 저장 실패 → 다운로드 폴백 시도. */
    }
  }

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return 'downloaded';
  } catch {
    return 'unsupported';
  }
}
