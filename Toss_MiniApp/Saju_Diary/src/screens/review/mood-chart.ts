/**
 * mood-chart — 월간 기분 꺾은선(영역) 그래프의 순수 좌표/패스 계산.
 *
 * TDS에는 라인차트가 없어(BarChart·DoughnutChart만) 인라인 SVG로 그린다.
 * 여기서는 표현(SVG 렌더)과 분리해 **좌표 매핑·스무딩 패스·축 눈금**만 순수 함수로 둔다.
 * 비즈니스 로직/저장/네트워크 없음 — 입력(시계열)→출력(좌표·문자열). 단위 테스트 동반(레포 규칙).
 *
 * 좌표계: SVG 기준(y는 아래로 증가). 기분 5점=위(padTop), 1점=아래(baseline).
 */

/** 그래프 영역 치수(px, SVG viewBox 기준). */
export interface ChartDims {
  width: number;
  height: number;
  /** y축 라벨(별점) 공간. */
  padLeft: number;
  /** 오른쪽 여백. */
  padRight: number;
  /** 위 여백(최고점이 잘리지 않게). */
  padTop: number;
  /** x축 라벨 공간. */
  padBottom: number;
}

/** 한 점(데이터가 있는 날의 화면 좌표 + 원본 값). */
export interface ChartPoint {
  x: number;
  y: number;
  day: number;
  mood: number;
}

/** 기분 도메인(1~5 고정). */
const MOOD_MIN = 1;
const MOOD_MAX = 5;

/** 좌표 스케일(일→x, 기분→y) + baseline(영역 채우기 바닥). */
export function makeScales(daysInMonth: number, dims: ChartDims) {
  const innerW = dims.width - dims.padLeft - dims.padRight;
  const innerH = dims.height - dims.padTop - dims.padBottom;
  const daySpan = Math.max(1, daysInMonth - 1);
  const moodSpan = MOOD_MAX - MOOD_MIN; // 4
  return {
    /** 일(1~말일) → x. */
    x: (day: number) => dims.padLeft + ((day - 1) / daySpan) * innerW,
    /** 기분(1~5) → y(5=위). */
    y: (mood: number) => dims.padTop + (1 - (mood - MOOD_MIN) / moodSpan) * innerH,
    /** 영역 채우기 바닥(기분 1점 라인). */
    baselineY: dims.padTop + innerH,
  };
}

/** 시계열(빈 날 포함) → 데이터가 있는 날만 화면 좌표로. 소수 둘째 자리 반올림. */
export function moodChartPoints(
  series: { day: number; mood: number | null }[],
  daysInMonth: number,
  dims: ChartDims,
): ChartPoint[] {
  const s = makeScales(daysInMonth, dims);
  return series
    .filter((d): d is { day: number; mood: number } => d.mood != null)
    .map((d) => ({
      x: round2(s.x(d.day)),
      y: round2(s.y(d.mood)),
      day: d.day,
      mood: d.mood,
    }));
}

/**
 * Catmull-Rom → 베지어 스무딩 라인 패스(`M … C …`).
 * 점 0개=빈 문자열, 1개=단일 M. 부드러운 곡선(레퍼런스의 매끄러운 꺾은선).
 */
export function smoothLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = round2(p1.x + (p2.x - p0.x) / 6);
    const cp1y = round2(p1.y + (p2.y - p0.y) / 6);
    const cp2x = round2(p2.x - (p3.x - p1.x) / 6);
    const cp2y = round2(p2.y - (p3.y - p1.y) / 6);
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/** 스무딩 라인 + 바닥까지 닫은 영역 패스(그라데이션 채우기용). 점<2면 빈 문자열. */
export function areaUnderPath(pts: { x: number; y: number }[], baselineY: number): string {
  if (pts.length < 2) return '';
  const line = smoothLinePath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${line} L${last.x},${round2(baselineY)} L${first.x},${round2(baselineY)} Z`;
}

/** x축 눈금: 1 + 5의 배수(말일 이하). 예: 30일 → [1,5,10,15,20,25,30]. */
export function xAxisTicks(daysInMonth: number): number[] {
  const ticks = [1];
  for (let d = 5; d <= daysInMonth; d += 5) {
    ticks.push(d);
  }
  return ticks;
}

/** y축 눈금(기분 5→1, 위에서 아래). */
export function yAxisTicks(): number[] {
  return [5, 4, 3, 2, 1];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
