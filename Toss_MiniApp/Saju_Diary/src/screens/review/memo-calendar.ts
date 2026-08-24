/**
 * memo-calendar — 완료 메모 캘린더 집계(순수 함수).
 *
 * 돌아보기(회고) 탭의 "완료한 일" 캘린더(#4·#5) 데이터 계층:
 *   - 완료(checked=true·isTodo)한 메모를 completedDate 기준으로 "어떤 달"로 필터링하고,
 *     날짜(1~말일) → 그날 완료 메모로 매핑한다.
 *   - 날짜 칸에 점/개수를 찍기 위한 "완료가 있는 일(day)" 집합과,
 *     일기가 있는 일 집합(다른 색 점)을 만든다.
 *
 * 규칙(review-stats와 동일):
 *   - 결정론·불변: 입력 배열을 변경하지 않고, 같은 입력이면 항상 같은 출력.
 *   - 비결정 입력(현재 월)은 호출부가 *주입*해 테스트를 결정론적으로 한다.
 *   - 날짜는 전부 `YYYY-MM-DD` 문자열(Date 객체 산술 금지 — 타임존 버그 방지).
 *   - storage·UI·share SDK를 import하지 않는다(런타임 0 의존, 순수 계층).
 *
 * 재사용: 월 키/일수 유틸(yearMonthOf·isInMonth·daysInMonth)은 review-stats,
 *   "그날 완료 메모" 판정은 memo-ops `completedTodosForDate`를 그대로 쓴다
 *   (여기서 완료 판정·달력 산술을 재구현하지 않는다 — CLAUDE.md 모듈 경계).
 */
import type { Diary, Memo, DateString } from '../../types';
import { completedTodosForDate } from '../../widgets/memo-ops';
import { daysInMonth, isInMonth, yearMonthOf, type YearMonth } from './review-stats';

// ─────────────────────────────────────────────────────────────
// 월 필터 (완료 메모)
// ─────────────────────────────────────────────────────────────

/**
 * completedDate가 주어진 달(`YYYY-MM`)에 속하는 완료 메모만 골라낸다(순서 보존, 불변).
 * 완료(isTodo && checked && completedDate)만 대상 — 미완료/일반 메모/타 달은 제외.
 */
export function completedMemosInMonth(memos: Memo[], yearMonth: YearMonth): Memo[] {
  return memos.filter(
    (m) =>
      m.isTodo === true &&
      m.checked === true &&
      typeof m.completedDate === 'string' &&
      isInMonth(m.completedDate, yearMonth),
  );
}

/**
 * 그달의 날짜(`YYYY-MM-DD`) → 그날 완료한 메모 배열 매핑.
 * 완료가 하나라도 있는 날짜만 키로 들어간다(빈 날 키 없음). completedTodosForDate 재사용.
 * 결정론·불변(입력 미변경).
 */
export function completedMemosByDate(
  memos: Memo[],
  yearMonth: YearMonth,
): Map<DateString, Memo[]> {
  const byDate = new Map<DateString, Memo[]>();
  const total = daysInMonth(yearMonth);
  if (total === 0) {
    return byDate;
  }
  for (let day = 1; day <= total; day += 1) {
    const date = `${yearMonth}-${String(day).padStart(2, '0')}`;
    const list = completedTodosForDate(memos, date);
    if (list.length > 0) {
      byDate.set(date, list);
    }
  }
  return byDate;
}

/**
 * 그달에 완료 메모가 하나라도 있는 "일(day, 1~말일)" 집합.
 * 캘린더 칸에 완료 점/개수를 찍는 데 쓴다. 결정론·불변.
 */
export function daysWithCompleted(memos: Memo[], yearMonth: YearMonth): Set<number> {
  const days = new Set<number>();
  for (const m of completedMemosInMonth(memos, yearMonth)) {
    // completedDate는 위 필터에서 이미 string·해당 달임을 보장.
    const day = Number((m.completedDate as string).slice(8, 10));
    if (Number.isFinite(day)) {
      days.add(day);
    }
  }
  return days;
}

/**
 * 완료 메모가 하나라도 있는 달 목록을 최신순(`YYYY-MM` 내림차순)으로 중복 없이 반환한다.
 * completedDate 기준. 회고 탭이 (일기와 별개로) 완료만 있는 달도 보여줄 수 있게 한다.
 * monthsWithDiaries(review-stats)와 같은 형식·규칙. 결정론·불변.
 */
export function monthsWithCompleted(memos: Memo[]): YearMonth[] {
  const set = new Set<YearMonth>();
  for (const m of memos) {
    if (
      m.isTodo === true &&
      m.checked === true &&
      typeof m.completedDate === 'string' &&
      m.completedDate.length >= 7
    ) {
      set.add(yearMonthOf(m.completedDate));
    }
  }
  return Array.from(set).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

// ─────────────────────────────────────────────────────────────
// 일기 점(다른 색) — review-stats 톤 재사용
// ─────────────────────────────────────────────────────────────

/**
 * 그달에 일기가 있는 "일(day)" 집합(다른 색 점 표시용). 결정론·불변.
 */
export function daysWithDiary(diaries: Diary[], yearMonth: YearMonth): Set<number> {
  const days = new Set<number>();
  for (const d of diaries) {
    if (isInMonth(d.date, yearMonth)) {
      const day = Number(d.date.slice(8, 10));
      if (Number.isFinite(day)) {
        days.add(day);
      }
    }
  }
  return days;
}

// ─────────────────────────────────────────────────────────────
// 월 그리드 셀 (네이티브 달력 — 라이브러리 0, CRITICAL #5)
// ─────────────────────────────────────────────────────────────

/** 달력 한 칸. day=null은 그달에 속하지 않는 선행 빈칸(앞 요일 패딩). */
export interface CalendarCell {
  /** 1~말일. 빈 패딩 칸은 null. */
  day: number | null;
  /** 그 날짜 `YYYY-MM-DD`(day가 있을 때만). */
  date: DateString | null;
}

/**
 * 그달(`YYYY-MM`)의 월 그리드 셀을 만든다 — 일요일 시작 7열.
 *  - 1일의 요일만큼 앞에 빈칸(day=null)을 채우고, 1~말일을 채운다.
 *  - 라이브러리 없이 Date.UTC로 1일 요일만 구한다(산술 아님 — 타임존 안전).
 *  - 잘못된 달이면 빈 배열. 결정론(같은 yearMonth면 항상 같은 결과)·순수.
 *
 * UTC로 1일 요일을 구하는 이유: `new Date('2026-06-01')`은 로컬 타임존에 따라
 *   하루가 밀릴 수 있으나, Date.UTC(y, m-1, 1).getUTCDay()는 항상 같은 값을 준다.
 */
export function monthGridCells(yearMonth: YearMonth): CalendarCell[] {
  const total = daysInMonth(yearMonth);
  if (total === 0) {
    return [];
  }
  const [y, m] = yearMonth.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0=일 … 6=토
  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ day: null, date: null });
  }
  for (let day = 1; day <= total; day += 1) {
    cells.push({ day, date: `${yearMonth}-${String(day).padStart(2, '0')}` });
  }
  return cells;
}
