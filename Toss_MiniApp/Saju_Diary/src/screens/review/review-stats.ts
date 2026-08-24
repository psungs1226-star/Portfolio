/**
 * review-stats — 월간 회고 집계(순수 함수).
 *
 * 돌아보기(회고) 탭(PRD §6.6)의 데이터 계층:
 *   - 저장된 일기(Diary[])를 "어떤 달"로 필터링하고 일별 기분(mood)을 그래프용 시계열로 만든다.
 *   - 평균 기분·일기 수·대표 키워드를 뽑아 공유 입력(MonthlySummary)을 만든다.
 *
 * 규칙:
 *   - 결정론·불변: 입력 배열을 변경하지 않고, 같은 입력이면 항상 같은 출력.
 *   - 비결정 입력(현재 월/연도)은 호출부가 *주입*해 테스트를 결정론적으로 한다.
 *   - 날짜는 전부 `YYYY-MM-DD` 문자열(Date 객체 금지, 타임존 버그 방지).
 *   - storage·UI·share SDK를 import하지 않는다(런타임 0 의존, 순수 계층).
 *
 * 재사용: 공유 텍스트가 받는 MonthlySummary 타입은 share 모듈의 계약을 그대로 쓴다
 *   (여기서 표시/공유 로직을 재구현하지 않는다 — CLAUDE.md 모듈 경계).
 */
import type { Diary } from '../../types';
import type { MonthlySummary } from '../../features/share';
import type { FortuneSnapshot } from '../diary/diary-ops';

// ─────────────────────────────────────────────────────────────
// 월 키 / 일자 유틸 (순수)
// ─────────────────────────────────────────────────────────────

/** `YYYY-MM` 형식의 월 키. (예: '2026-06') */
export type YearMonth = string;

/** `YYYY-MM-DD`에서 `YYYY-MM`(월 키)을 잘라낸다. */
export function yearMonthOf(date: string): YearMonth {
  return date.slice(0, 7);
}

/** 어떤 날짜가 주어진 월(`YYYY-MM`)에 속하는지. */
export function isInMonth(date: string, yearMonth: YearMonth): boolean {
  return yearMonthOf(date) === yearMonth;
}

/**
 * `YYYY-MM` 월의 일수(28~31)를 구한다.
 * Date.UTC로 "다음 달 0일" = 이번 달 말일을 얻어 타임존에 안전하게 계산한다.
 * 잘못된 입력은 안전하게 0을 반환한다(빈 그래프).
 */
export function daysInMonth(yearMonth: YearMonth): number {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return 0;
  }
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// ─────────────────────────────────────────────────────────────
// 월 필터 + 일별 mood 시계열 (그래프 입력)
// ─────────────────────────────────────────────────────────────

/** 그래프 한 칸(하루): 날짜·일(day)·기분(없으면 null). */
export interface DailyMood {
  /** 날짜 `YYYY-MM-DD`. */
  date: string;
  /** 1~말일. */
  day: number;
  /** 그날 일기의 기분 1~5. 기록이 없으면 null(빈 막대). */
  mood: number | null;
}

/** 주어진 달의 일기만 골라 날짜 오름차순으로 정렬한 새 배열을 반환한다(불변). */
export function diariesInMonth(diaries: Diary[], yearMonth: YearMonth): Diary[] {
  return diaries
    .filter((d) => isInMonth(d.date, yearMonth))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * 주어진 달의 일별 기분 시계열(1일~말일)을 만든다.
 * 일기가 있는 날은 그 mood(1~5로 클램프), 없는 날은 null(빈 막대) — 달력처럼 모든 날 채운다.
 * 같은 날짜가 둘 이상이면(이론상 없음) 마지막 값을 쓴다. 불변(입력 미변경).
 */
export function dailyMoodSeries(diaries: Diary[], yearMonth: YearMonth): DailyMood[] {
  const total = daysInMonth(yearMonth);
  if (total === 0) {
    return [];
  }
  // 날짜 → mood 매핑(해당 달만).
  const byDate = new Map<string, number>();
  for (const d of diaries) {
    if (isInMonth(d.date, yearMonth)) {
      byDate.set(d.date, clampMood(d.mood));
    }
  }
  const series: DailyMood[] = [];
  for (let day = 1; day <= total; day += 1) {
    const date = `${yearMonth}-${String(day).padStart(2, '0')}`;
    series.push({ date, day, mood: byDate.has(date) ? (byDate.get(date) as number) : null });
  }
  return series;
}

/** 기분 점수를 1~5 정수로 안전하게 만든다(범위 밖/비유한 → 클램프). */
function clampMood(mood: number): number {
  if (!Number.isFinite(mood)) {
    return 1;
  }
  return Math.min(5, Math.max(1, Math.round(mood)));
}

// ─────────────────────────────────────────────────────────────
// 집계값 (평균·일기 수·대표 키워드)
// ─────────────────────────────────────────────────────────────

/**
 * 기록이 있는 날만으로 평균 기분을 구한다(빈 날 제외).
 * 기록이 0건이면 0(미정). 소수 둘째 자리까지 반올림(결정론).
 */
export function averageMood(diaries: Diary[], yearMonth: YearMonth): number {
  const moods = diaries
    .filter((d) => isInMonth(d.date, yearMonth))
    .map((d) => clampMood(d.mood));
  if (moods.length === 0) {
    return 0;
  }
  const sum = moods.reduce((acc, m) => acc + m, 0);
  return Math.round((sum / moods.length) * 100) / 100;
}

/** 그달 일기 수. */
export function diaryCount(diaries: Diary[], yearMonth: YearMonth): number {
  return diaries.reduce((acc, d) => (isInMonth(d.date, yearMonth) ? acc + 1 : acc), 0);
}

/**
 * 그달 가장 자주 나온 운세 행운색(일기 박제 스냅샷 기준)을 대표 키워드로 뽑는다.
 * - 빈도 최다, 동률이면 날짜순으로 먼저 나타난 색을 택한다(결정론).
 * - 운세 스냅샷이 하나도 없으면 undefined(키워드 생략).
 */
export function topFortuneKeyword(diaries: Diary[], yearMonth: YearMonth): string | undefined {
  const order: string[] = []; // 처음 등장 순서(동률 tiebreak).
  const count = new Map<string, number>();
  for (const d of diariesInMonth(diaries, yearMonth)) {
    const snap = d.fortuneSnapshot as FortuneSnapshot | undefined;
    const color = snap?.luckyColor;
    if (color == null || color.length === 0) {
      continue;
    }
    if (!count.has(color)) {
      order.push(color);
    }
    count.set(color, (count.get(color) ?? 0) + 1);
  }
  if (order.length === 0) {
    return undefined;
  }
  let best = order[0];
  for (const color of order) {
    if ((count.get(color) ?? 0) > (count.get(best) ?? 0)) {
      best = color;
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────
// 공유 입력 빌더 (MonthlySummary)
// ─────────────────────────────────────────────────────────────

/**
 * 그달 일기에서 공유용 월간 요약(MonthlySummary)을 만든다.
 * 빈 달이면 diaryCount=0·moodAverage=0·키워드 생략(공유 텍스트가 0개로 표현).
 * 결정론·불변(입력 미변경). topKeyword는 운세 스냅샷이 있을 때만 채운다.
 */
export function buildMonthlySummary(diaries: Diary[], yearMonth: YearMonth): MonthlySummary {
  const summary: MonthlySummary = {
    yearMonth,
    diaryCount: diaryCount(diaries, yearMonth),
    moodAverage: averageMood(diaries, yearMonth),
  };
  const keyword = topFortuneKeyword(diaries, yearMonth);
  if (keyword != null) {
    summary.topKeyword = keyword;
  }
  return summary;
}

// ─────────────────────────────────────────────────────────────
// 월 선택 목록 (기록이 있는 달, 최신 먼저)
// ─────────────────────────────────────────────────────────────

/**
 * 일기가 하나라도 있는 달 목록을 최신순(`YYYY-MM` 내림차순)으로 중복 없이 반환한다.
 * 월 선택 드롭다운/탭의 데이터. 기록이 없으면 빈 배열(빈 상태).
 */
export function monthsWithDiaries(diaries: Diary[]): YearMonth[] {
  const set = new Set<YearMonth>();
  for (const d of diaries) {
    set.add(yearMonthOf(d.date));
  }
  return Array.from(set).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}
