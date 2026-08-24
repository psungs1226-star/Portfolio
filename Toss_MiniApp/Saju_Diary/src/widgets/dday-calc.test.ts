// dday-calc 단위 테스트 — 로컬 날짜 경계 기준 정수일 계산(시/분 무시, 타임존 안전) 검증.
//
// 경계: 오늘=D-DAY, 어제=D+1, 미래=D-N, 윤년/월말/연말 경계.
// UI(DdayWidget)는 빌드 통과로 검증한다. 여기서는 순수 계산만 본다.

import { describe, it, expect } from 'vitest';
import { daysUntil, ddayLabel } from './dday-calc';

describe('daysUntil — 정수 일수 차', () => {
  it('오늘 == 목표일 → 0', () => {
    expect(daysUntil('2026-06-14', '2026-06-14')).toBe(0);
  });

  it('목표일이 내일 → +1 (미래)', () => {
    expect(daysUntil('2026-06-15', '2026-06-14')).toBe(1);
  });

  it('목표일이 어제 → -1 (과거)', () => {
    expect(daysUntil('2026-06-13', '2026-06-14')).toBe(-1);
  });

  it('일주일 뒤 → +7', () => {
    expect(daysUntil('2026-06-21', '2026-06-14')).toBe(7);
  });

  it('월말 경계: 1/31 → 2/1 = +1', () => {
    expect(daysUntil('2026-02-01', '2026-01-31')).toBe(1);
  });

  it('30일 월말 경계: 4/30 → 5/1 = +1', () => {
    expect(daysUntil('2026-05-01', '2026-04-30')).toBe(1);
  });

  it('연말 경계: 12/31 → 1/1 = +1', () => {
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('윤년 2/28 → 2/29 = +1 (2024는 윤년)', () => {
    expect(daysUntil('2024-02-29', '2024-02-28')).toBe(1);
  });

  it('윤년 2월 통째 경계: 2/29 → 3/1 = +1 (2024)', () => {
    expect(daysUntil('2024-03-01', '2024-02-29')).toBe(1);
  });

  it('평년 2월: 2/28 → 3/1 = +1 (2026 평년)', () => {
    expect(daysUntil('2026-03-01', '2026-02-28')).toBe(1);
  });

  it('윤년 한 해 차: 2024-02-29 → 2025-02-28 = +365', () => {
    // 2024-02-29 다음 366일째가 2025-03-01, 2025-02-28은 365일째.
    expect(daysUntil('2025-02-28', '2024-02-29')).toBe(365);
  });

  it('잘못된 형식 → NaN', () => {
    expect(daysUntil('2026/06/14', '2026-06-14')).toBeNaN();
    expect(daysUntil('2026-06-14', 'oops')).toBeNaN();
  });
});

describe('ddayLabel — 표기', () => {
  it('오늘 → D-DAY', () => {
    expect(ddayLabel('2026-06-14', '2026-06-14')).toEqual({
      text: 'D-DAY',
      count: 0,
      kind: 'today',
    });
  });

  it('미래 7일 → D-7', () => {
    expect(ddayLabel('2026-06-21', '2026-06-14')).toEqual({
      text: 'D-7',
      count: 7,
      kind: 'future',
    });
  });

  it('내일 → D-1 (경계)', () => {
    expect(ddayLabel('2026-06-15', '2026-06-14')).toEqual({
      text: 'D-1',
      count: 1,
      kind: 'future',
    });
  });

  it('어제 → D+1 (과거 경계)', () => {
    expect(ddayLabel('2026-06-13', '2026-06-14')).toEqual({
      text: 'D+1',
      count: 1,
      kind: 'past',
    });
  });

  it('과거 100일 → D+100', () => {
    expect(ddayLabel('2026-03-06', '2026-06-14')).toEqual({
      text: 'D+100',
      count: 100,
      kind: 'past',
    });
  });

  it('잘못된 형식 → 대시 표기', () => {
    const out = ddayLabel('bad', '2026-06-14');
    expect(out.text).toBe('—');
    expect(out.count).toBeNaN();
  });
});
