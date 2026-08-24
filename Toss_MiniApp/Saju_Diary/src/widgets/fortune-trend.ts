/**
 * fortune-trend — "오늘 기준 앞으로의 운세 흐름"을 표본 날짜의 총운으로 만든다(순수·결정론).
 *
 * 사용자 요청: 주/월/연 단위로 미래 운세가 어떻게 변하는지 + 현재 위치(오늘)를 그래프에 찍기.
 * 만세력/점수는 computeTodayFortune(엔진)을 그대로 재사용한다(재구현 금지, CRITICAL #1·#3).
 * 같은 (saju, today, range)는 항상 같은 결과(결정론). 저장/네트워크 0.
 *
 * 표본(오늘=index 0 = "지금" 강조):
 *  - week : 오늘 + 이후 6일(일 단위, 7점) — 요일 라벨, 오늘은 '오늘'.
 *  - month: 오늘부터 6일 간격 6점(약 한 달) — M/D 라벨.
 *  - year : 오늘 달부터 매월 1점, 12점 — 'M월' 라벨.
 */
import type { SajuInput, NatalChart } from '../types';
import { computeTodayFortune } from './fortune-today';

export type TrendRange = 'week' | 'month' | 'year';

export interface TrendPoint {
  /** 그래프 x축 라벨. */
  label: string;
  /** 총운 1~5(result.overall). */
  value: number;
  /** 표본 날짜 `YYYY-MM-DD`. */
  dateKey: string;
  /** 오늘(현위치)인지. */
  current: boolean;
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** `YYYY-MM-DD` + n일(UTC 자정 기준 — 타임존 안전). */
function addDays(dateKey: string, n: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** `YYYY-MM-DD` + n개월(말일 클램프). */
function addMonths(dateKey: string, n: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const total = m - 1 + n;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const daysInMonth = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const nd = Math.min(d, daysInMonth);
  return `${ny}-${pad2(nm + 1)}-${pad2(nd)}`;
}

function weekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function mdLabel(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${m}/${d}`;
}

function monthLabel(dateKey: string): string {
  const [, m] = dateKey.split('-').map(Number);
  return `${m}월`;
}

/** range별 표본 날짜 키들(오늘=첫 점). */
function sampleKeys(today: string, range: TrendRange): string[] {
  if (range === 'week') {
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }
  if (range === 'month') {
    return Array.from({ length: 6 }, (_, i) => addDays(today, i * 6));
  }
  // year — 매월 1점, 12점.
  return Array.from({ length: 12 }, (_, i) => addMonths(today, i));
}

function labelFor(dateKey: string, index: number, range: TrendRange): string {
  if (index === 0) {
    return '오늘';
  }
  if (range === 'week') {
    return weekdayLabel(dateKey);
  }
  if (range === 'month') {
    return mdLabel(dateKey);
  }
  return monthLabel(dateKey);
}

export interface FortuneTrendOptions {
  gender?: 'male' | 'female';
  natal?: NatalChart;
}

/**
 * 오늘 기준 앞으로의 총운 흐름 표본. 각 점은 그날 운세의 overall(1~5).
 * 산출 실패한 점은 건너뛴다(빈 화면 방지 — 부분 표시 허용).
 */
/** range별 단위 명사(해설 문구용). */
const RANGE_NOUN: Record<TrendRange, string> = {
  week: '이번 주',
  month: '앞으로 한 달',
  year: '올해',
};

/**
 * 한글 받침 유무로 주제 조사(은/는)를 고른다. 한글 음절은 (코드−0xAC00)%28!==0 이면 받침 있음.
 * 받침 있음→'은'(달은), 없음→'는'(주는·올해는). 한글이 아니면 '는' 기본.
 */
function topicJosa(word: string): '은' | '는' {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '는';
  return (code - 0xac00) % 28 !== 0 ? '은' : '는';
}

/**
 * 운세 흐름 한 줄 해설(주/월/연) — 점들의 최고점·추세를 결정론적으로 풀어 쓴다(순수·표시 전용).
 * "첫 점=오늘"은 단순 설명일 뿐이라, 여기선 실제 흐름(언제 오르고 내리는지)을 해설한다.
 *  - 정점: 최고값 시점(동점이면 가장 이른 시점). 오늘이면 "오늘이 가장 좋은 편".
 *  - 추세: 전반부 평균 vs 후반부 평균(상승/하강/잔잔).
 */
export function trendInsight(points: Pick<TrendPoint, 'value' | 'label'>[], range: TrendRange): string {
  if (points.length === 0) return '흐름을 그릴 수 없어요.';
  const noun = RANGE_NOUN[range];

  let best = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].value > points[best].value) best = i;
  }
  const bestLabel = best === 0 ? '오늘' : points[best].label;

  const mid = Math.floor(points.length / 2);
  const avg = (a: number, b: number) =>
    points.slice(a, b).reduce((s, p) => s + p.value, 0) / Math.max(1, b - a);
  const slope = avg(mid, points.length) - avg(0, Math.max(1, mid));
  const trend =
    slope > 0.4
      ? '전반적으로 차츰 기운이 올라가는 흐름이에요.'
      : slope < -0.4
        ? '차분히 가라앉는 흐름이라 무리하지 않는 게 좋아요.'
        : '큰 기복 없이 잔잔하게 이어져요.';

  const peak =
    best === 0
      ? `${noun} 중에선 오늘이 가장 기운이 좋은 편이에요.`
      : `${noun}${topicJosa(noun)} ${bestLabel}쯤 기운이 가장 좋아요.`;
  return `${peak} ${trend}`;
}

export function fortuneTrend(
  saju: SajuInput,
  today: string,
  range: TrendRange,
  opts: FortuneTrendOptions = {},
): TrendPoint[] {
  const keys = sampleKeys(today, range);
  const points: TrendPoint[] = [];
  keys.forEach((dateKey, index) => {
    try {
      const f = computeTodayFortune(saju, dateKey, opts);
      points.push({
        label: labelFor(dateKey, index, range),
        value: f.result.overall,
        dateKey,
        current: index === 0,
      });
    } catch {
      /* 이 표본은 건너뜀(다른 점으로 흐름은 보인다). */
    }
  });
  return points;
}
