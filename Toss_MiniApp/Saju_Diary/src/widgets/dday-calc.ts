/**
 * dday-calc — D-day 일수 계산(순수 함수).
 *
 * 핵심 규칙(step0): 일수는 *로컬 날짜 경계* 기준 정수일이다.
 * - `YYYY-MM-DD` 문자열을 분해해 UTC 자정으로 고정 → 두 자정의 차를 일(day)로 나눈다.
 *   같은 기준(UTC 자정)끼리만 빼므로 DST/타임존 오프셋이 상쇄되어 하루 오차가 없다.
 * - `Date` 차이를 그대로 ms 나눗셈하지 않는다(시/분 포함 → 경계 오차). 금지 규칙 준수.
 *
 * 표기: targetDate 기준 today와의 일수 차.
 * - 오늘 == 목표일 → D-DAY
 * - 목표일이 미래(N일 남음) → D-N
 * - 목표일이 과거(N일 지남) → D+N
 *
 * 런타임 0 의존(순수). UI(DdayWidget)에서 import해 표시만 한다.
 */
import type { DateString } from '../types';

/** `YYYY-MM-DD` → UTC 자정 epoch(ms). 형식이 아니면 NaN. 시/분은 항상 0. */
function utcMidnight(date: DateString): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m == null) {
    return Number.NaN;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // Date.UTC는 월이 0-based. 범위(월 1~12, 일 1~말일)는 호출부 입력을 신뢰하되
  // 잘못된 값이면 NaN 비교로 안전 처리한다.
  return Date.UTC(y, mo - 1, d);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 목표일 - 오늘 = 남은 일수(정수). 양수면 미래(N일 남음), 0이면 오늘, 음수면 과거(N일 지남).
 * 잘못된 형식이면 NaN.
 *
 * @param targetDate 목표일 `YYYY-MM-DD`.
 * @param today 기준일 `YYYY-MM-DD`(테스트 주입; 기본은 호출부가 오늘을 넘긴다).
 */
export function daysUntil(targetDate: DateString, today: DateString): number {
  const t = utcMidnight(targetDate);
  const n = utcMidnight(today);
  if (Number.isNaN(t) || Number.isNaN(n)) {
    return Number.NaN;
  }
  // 같은 UTC 자정 기준끼리의 차 → DST/오프셋 상쇄. 부동소수 안전 위해 반올림.
  return Math.round((t - n) / MS_PER_DAY);
}

/** D-day 표기 결과. */
export interface DdayLabel {
  /** 화면 표기 텍스트. 예: 'D-7' / 'D-DAY' / 'D+3'. */
  text: string;
  /** 절댓값 일수(미래/과거 공통). 오늘이면 0. */
  count: number;
  /** 시점 분류. */
  kind: 'future' | 'today' | 'past';
}

/**
 * 목표일과 기준일로 D-day 표기를 만든다.
 * 형식 오류면 text='—', count=NaN, kind는 안전하게 'today'로 둔다.
 */
export function ddayLabel(targetDate: DateString, today: DateString): DdayLabel {
  const diff = daysUntil(targetDate, today);
  if (Number.isNaN(diff)) {
    return { text: '—', count: Number.NaN, kind: 'today' };
  }
  if (diff === 0) {
    return { text: 'D-DAY', count: 0, kind: 'today' };
  }
  if (diff > 0) {
    return { text: `D-${diff}`, count: diff, kind: 'future' };
  }
  return { text: `D+${-diff}`, count: -diff, kind: 'past' };
}
