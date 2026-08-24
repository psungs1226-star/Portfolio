/**
 * memo-calendar 단위 테스트(순수 집계).
 *
 * 검증 축:
 *   1. completedMemosInMonth: 완료(isTodo&&checked&&completedDate)만·해당 달만·타 달/미완료 제외·순서·불변.
 *   2. completedMemosByDate: 날짜→완료메모 매핑(빈 날 키 없음)·결정론.
 *   3. daysWithCompleted: 완료 있는 일(day) 집합.
 *   4. daysWithDiary: 일기 있는 일(day) 집합·타 달 제외.
 *   5. monthsWithCompleted: 중복 제거·최신순.
 *   6. monthGridCells: 1일 요일만큼 앞 패딩 + 1~말일·7열·결정론·잘못된 달 빈 배열.
 *   7. 불변성: 입력 배열 미변경.
 */
import { describe, it, expect } from 'vitest';
import type { Diary, Memo } from '../../types';
import {
  completedMemosInMonth,
  completedMemosByDate,
  daysWithCompleted,
  daysWithDiary,
  monthsWithCompleted,
  monthGridCells,
} from './memo-calendar';

// ── 픽스처 ──────────────────────────────────────────────────

function memo(over: Partial<Memo> = {}): Memo {
  return {
    id: 'm',
    date: '2026-06-01',
    text: '할 일',
    checked: false,
    isTodo: true,
    ...over,
  };
}

/** 완료 메모(completedDate 부여). */
function done(id: string, completedDate: string, text = id): Memo {
  return memo({ id, text, checked: true, completedDate });
}

function diary(date: string): Diary {
  return { date, mood: 3, text: '' };
}

// ─────────────────────────────────────────────────────────────

describe('completedMemosInMonth', () => {
  it('완료(isTodo&&checked&&completedDate)·해당 달만 골라낸다', () => {
    const memos: Memo[] = [
      done('a', '2026-06-03'),
      done('b', '2026-06-20'),
      done('c', '2026-07-01'), // 다른 달
      memo({ id: 'd', checked: false }), // 미완료
      memo({ id: 'e', checked: true, isTodo: false, completedDate: '2026-06-05' }), // 할 일 아님
    ];
    const got = completedMemosInMonth(memos, '2026-06');
    expect(got.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('completedDate가 없는 완료 메모는 제외한다', () => {
    const memos: Memo[] = [memo({ id: 'a', checked: true })]; // completedDate 없음
    expect(completedMemosInMonth(memos, '2026-06')).toEqual([]);
  });

  it('입력 배열을 변경하지 않는다(불변)', () => {
    const memos: Memo[] = [done('a', '2026-06-03'), done('b', '2026-06-10')];
    const snapshot = JSON.parse(JSON.stringify(memos));
    completedMemosInMonth(memos, '2026-06');
    expect(memos).toEqual(snapshot);
  });
});

describe('completedMemosByDate', () => {
  it('날짜별로 그날 완료 메모를 모은다(빈 날은 키 없음)', () => {
    const memos: Memo[] = [
      done('a', '2026-06-03'),
      done('b', '2026-06-03'),
      done('c', '2026-06-10'),
      done('d', '2026-07-01'), // 다른 달
    ];
    const map = completedMemosByDate(memos, '2026-06');
    expect(map.size).toBe(2);
    expect((map.get('2026-06-03') ?? []).map((m) => m.id)).toEqual(['a', 'b']);
    expect((map.get('2026-06-10') ?? []).map((m) => m.id)).toEqual(['c']);
    expect(map.has('2026-06-05')).toBe(false);
  });

  it('완료가 없으면 빈 맵, 잘못된 달도 빈 맵(결정론)', () => {
    expect(completedMemosByDate([], '2026-06').size).toBe(0);
    expect(completedMemosByDate([done('a', '2026-06-03')], 'bad').size).toBe(0);
  });
});

describe('daysWithCompleted', () => {
  it('완료가 있는 일(day) 집합을 반환한다', () => {
    const memos: Memo[] = [done('a', '2026-06-03'), done('b', '2026-06-03'), done('c', '2026-06-25')];
    const set = daysWithCompleted(memos, '2026-06');
    expect([...set].sort((x, y) => x - y)).toEqual([3, 25]);
  });

  it('완료가 없으면 빈 집합', () => {
    expect(daysWithCompleted([memo({ checked: false })], '2026-06').size).toBe(0);
  });
});

describe('daysWithDiary', () => {
  it('일기가 있는 일(day) 집합(타 달 제외)', () => {
    const diaries: Diary[] = [diary('2026-06-01'), diary('2026-06-15'), diary('2026-07-01')];
    const set = daysWithDiary(diaries, '2026-06');
    expect([...set].sort((x, y) => x - y)).toEqual([1, 15]);
  });
});

describe('monthsWithCompleted', () => {
  it('완료 메모가 있는 달을 중복 없이 최신순으로 반환한다', () => {
    const memos: Memo[] = [
      done('a', '2026-06-03'),
      done('b', '2026-06-20'), // 같은 달 중복
      done('c', '2026-04-10'),
      done('d', '2026-08-01'),
      memo({ id: 'x', checked: false }), // 미완료 → 무시
    ];
    expect(monthsWithCompleted(memos)).toEqual(['2026-08', '2026-06', '2026-04']);
  });

  it('완료 메모가 없으면 빈 배열', () => {
    expect(monthsWithCompleted([memo({ checked: false })])).toEqual([]);
  });
});

describe('monthGridCells', () => {
  it('1일 요일만큼 앞 패딩 + 1~말일을 채운다(2026-06: 1일=월요일)', () => {
    // 2026-06-01은 월요일 → getUTCDay()=1 → 앞 패딩 1칸.
    const cells = monthGridCells('2026-06');
    expect(cells.length).toBe(1 + 30); // 패딩 1 + 30일
    expect(cells[0]).toEqual({ day: null, date: null }); // 일요일 자리(빈칸)
    expect(cells[1]).toEqual({ day: 1, date: '2026-06-01' });
    expect(cells[cells.length - 1]).toEqual({ day: 30, date: '2026-06-30' });
  });

  it('말일이 달마다 다르다(2026-02 = 28일)', () => {
    const cells = monthGridCells('2026-02');
    const dayCells = cells.filter((c) => c.day != null);
    expect(dayCells.length).toBe(28);
  });

  it('같은 달이면 항상 같은 결과(결정론)', () => {
    expect(monthGridCells('2026-06')).toEqual(monthGridCells('2026-06'));
  });

  it('잘못된 달이면 빈 배열', () => {
    expect(monthGridCells('bad')).toEqual([]);
    expect(monthGridCells('2026-13')).toEqual([]);
  });
});
