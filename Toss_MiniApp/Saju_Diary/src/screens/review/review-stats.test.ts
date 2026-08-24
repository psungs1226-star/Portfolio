/**
 * review-stats 단위 테스트.
 *
 * 검증 축:
 *   1. 월 키/일수 유틸: yearMonthOf, isInMonth, daysInMonth(28~31, 윤년, 잘못된 입력).
 *   2. 월 필터/정렬: diariesInMonth(다른 달 제외, 오름차순, 불변).
 *   3. 일별 mood 시계열: dailyMoodSeries(말일까지 채움, 빈 날 null, mood 클램프, 빈 달 빈 배열).
 *   4. 집계: averageMood(빈 날 제외·반올림·빈 달 0), diaryCount, topFortuneKeyword(빈도/동률/없음).
 *   5. MonthlySummary 빌더: 채움·빈 달·키워드 생략, 결정론.
 *   6. monthsWithDiaries: 중복 제거·최신순.
 *   7. 불변성: 입력 배열 미변경.
 */
import { describe, it, expect } from 'vitest';
import type { Diary } from '../../types';
import {
  yearMonthOf,
  isInMonth,
  daysInMonth,
  diariesInMonth,
  dailyMoodSeries,
  averageMood,
  diaryCount,
  topFortuneKeyword,
  buildMonthlySummary,
  monthsWithDiaries,
} from './review-stats';

// ── 픽스처 ──────────────────────────────────────────────────

function diary(date: string, mood: number, over: Partial<Diary> = {}): Diary {
  return { date, mood, text: '', ...over };
}

/** 운세 스냅샷(행운색만 있으면 키워드 집계에 충분). */
function withFortune(date: string, mood: number, luckyColor: string): Diary {
  return diary(date, mood, {
    fortuneSnapshot: {
      overall: mood,
      luckyColor,
      luckyDirection: '남',
      iljin: '',
      advice: '',
    },
  });
}

// ── 1. 월 키 / 일수 유틸 ─────────────────────────────────────

describe('yearMonthOf / isInMonth', () => {
  it('YYYY-MM-DD에서 월 키를 잘라낸다', () => {
    expect(yearMonthOf('2026-06-14')).toBe('2026-06');
  });
  it('같은 달이면 true, 다른 달이면 false', () => {
    expect(isInMonth('2026-06-01', '2026-06')).toBe(true);
    expect(isInMonth('2026-07-01', '2026-06')).toBe(false);
    expect(isInMonth('2025-06-30', '2026-06')).toBe(false);
  });
});

describe('daysInMonth', () => {
  it('30일 달', () => expect(daysInMonth('2026-06')).toBe(30));
  it('31일 달', () => expect(daysInMonth('2026-07')).toBe(31));
  it('평년 2월', () => expect(daysInMonth('2026-02')).toBe(28));
  it('윤년 2월', () => expect(daysInMonth('2024-02')).toBe(29));
  it('잘못된 입력은 0', () => {
    expect(daysInMonth('2026-13')).toBe(0);
    expect(daysInMonth('bad')).toBe(0);
  });
});

// ── 2. 월 필터 / 정렬 ────────────────────────────────────────

describe('diariesInMonth', () => {
  const list = [
    diary('2026-06-20', 4),
    diary('2026-07-01', 5),
    diary('2026-06-02', 2),
    diary('2026-05-31', 3),
  ];
  it('해당 달만 골라 날짜 오름차순으로 정렬한다', () => {
    const r = diariesInMonth(list, '2026-06');
    expect(r.map((d) => d.date)).toEqual(['2026-06-02', '2026-06-20']);
  });
  it('입력 배열을 변경하지 않는다(불변)', () => {
    const snapshot = list.map((d) => d.date);
    diariesInMonth(list, '2026-06');
    expect(list.map((d) => d.date)).toEqual(snapshot);
  });
  it('기록 없는 달이면 빈 배열', () => {
    expect(diariesInMonth(list, '2026-01')).toEqual([]);
  });
});

// ── 3. 일별 mood 시계열 ──────────────────────────────────────

describe('dailyMoodSeries', () => {
  it('1일~말일을 모두 채우고, 기록 없는 날은 null', () => {
    const r = dailyMoodSeries([diary('2026-06-02', 4)], '2026-06');
    expect(r).toHaveLength(30);
    expect(r[0]).toEqual({ date: '2026-06-01', day: 1, mood: null });
    expect(r[1]).toEqual({ date: '2026-06-02', day: 2, mood: 4 });
    expect(r[29]).toEqual({ date: '2026-06-30', day: 30, mood: null });
  });
  it('다른 달 일기는 무시한다', () => {
    const r = dailyMoodSeries([diary('2026-07-01', 5), diary('2026-06-15', 3)], '2026-06');
    expect(r.find((d) => d.day === 15)?.mood).toBe(3);
    expect(r.every((d) => d.date.startsWith('2026-06'))).toBe(true);
  });
  it('범위를 벗어난 mood를 1~5로 클램프하고 반올림한다', () => {
    const r = dailyMoodSeries(
      [diary('2026-06-01', 0), diary('2026-06-02', 9), diary('2026-06-03', 3.6)],
      '2026-06',
    );
    expect(r[0].mood).toBe(1);
    expect(r[1].mood).toBe(5);
    expect(r[2].mood).toBe(4);
  });
  it('잘못된 달은 빈 배열', () => {
    expect(dailyMoodSeries([diary('2026-06-01', 3)], 'nope')).toEqual([]);
  });
  it('결정론: 같은 입력이면 같은 출력', () => {
    const list = [diary('2026-06-10', 2)];
    expect(dailyMoodSeries(list, '2026-06')).toEqual(dailyMoodSeries(list, '2026-06'));
  });
});

// ── 4. 집계 ─────────────────────────────────────────────────

describe('averageMood', () => {
  it('기록 있는 날만으로 평균(소수 둘째 자리 반올림)', () => {
    const r = averageMood([diary('2026-06-01', 4), diary('2026-06-02', 5), diary('2026-06-03', 4)], '2026-06');
    expect(r).toBe(4.33);
  });
  it('빈 달은 0', () => {
    expect(averageMood([], '2026-06')).toBe(0);
  });
  it('다른 달은 제외', () => {
    expect(averageMood([diary('2026-05-01', 1), diary('2026-06-01', 5)], '2026-06')).toBe(5);
  });
});

describe('diaryCount', () => {
  it('그달 일기 수만 센다', () => {
    expect(
      diaryCount([diary('2026-06-01', 3), diary('2026-06-02', 4), diary('2026-07-01', 5)], '2026-06'),
    ).toBe(2);
  });
  it('빈 달은 0', () => {
    expect(diaryCount([], '2026-06')).toBe(0);
  });
});

describe('topFortuneKeyword', () => {
  it('가장 자주 나온 행운색을 뽑는다', () => {
    const r = topFortuneKeyword(
      [withFortune('2026-06-01', 3, '초록'), withFortune('2026-06-02', 4, '빨강'), withFortune('2026-06-03', 5, '초록')],
      '2026-06',
    );
    expect(r).toBe('초록');
  });
  it('동률이면 날짜순으로 먼저 등장한 색', () => {
    const r = topFortuneKeyword(
      [withFortune('2026-06-02', 3, '빨강'), withFortune('2026-06-01', 4, '초록')],
      '2026-06',
    );
    // diariesInMonth가 날짜 오름차순으로 정렬 → 06-01 초록이 먼저 등장.
    expect(r).toBe('초록');
  });
  it('운세 스냅샷이 없으면 undefined', () => {
    expect(topFortuneKeyword([diary('2026-06-01', 3)], '2026-06')).toBeUndefined();
  });
  it('다른 달 운세는 무시', () => {
    expect(
      topFortuneKeyword([withFortune('2026-05-01', 3, '노랑'), withFortune('2026-06-01', 4, '초록')], '2026-06'),
    ).toBe('초록');
  });
});

// ── 5. MonthlySummary 빌더 ──────────────────────────────────

describe('buildMonthlySummary', () => {
  it('일기 수·평균·키워드를 채운다', () => {
    const list = [
      withFortune('2026-06-01', 4, '초록'),
      withFortune('2026-06-02', 5, '초록'),
      diary('2026-07-01', 1),
    ];
    expect(buildMonthlySummary(list, '2026-06')).toEqual({
      yearMonth: '2026-06',
      diaryCount: 2,
      moodAverage: 4.5,
      topKeyword: '초록',
    });
  });
  it('운세 스냅샷이 없으면 topKeyword 키를 생략한다', () => {
    const r = buildMonthlySummary([diary('2026-06-01', 3)], '2026-06');
    expect(r).toEqual({ yearMonth: '2026-06', diaryCount: 1, moodAverage: 3 });
    expect('topKeyword' in r).toBe(false);
  });
  it('빈 달이면 0/미정으로 만든다', () => {
    expect(buildMonthlySummary([], '2026-06')).toEqual({
      yearMonth: '2026-06',
      diaryCount: 0,
      moodAverage: 0,
    });
  });
  it('결정론: 같은 입력이면 같은 출력', () => {
    const list = [withFortune('2026-06-01', 4, '빨강')];
    expect(buildMonthlySummary(list, '2026-06')).toEqual(buildMonthlySummary(list, '2026-06'));
  });
  it('입력 배열을 변경하지 않는다(불변)', () => {
    const list = [diary('2026-06-01', 3), diary('2026-06-02', 4)];
    const before = JSON.stringify(list);
    buildMonthlySummary(list, '2026-06');
    expect(JSON.stringify(list)).toBe(before);
  });
});

// ── 6. monthsWithDiaries ────────────────────────────────────

describe('monthsWithDiaries', () => {
  it('기록 있는 달을 중복 없이 최신순으로', () => {
    const r = monthsWithDiaries([
      diary('2026-06-01', 3),
      diary('2026-06-20', 4),
      diary('2026-04-10', 2),
      diary('2026-07-01', 5),
    ]);
    expect(r).toEqual(['2026-07', '2026-06', '2026-04']);
  });
  it('기록이 없으면 빈 배열', () => {
    expect(monthsWithDiaries([])).toEqual([]);
  });
});
