// streak 단위 테스트 — 연속 출석 상태 전이(순수·불변·결정론) 검증.
//
// 규칙: 최초=1, 같은 날 재방문=무변(멱등), 어제 방문=+1, 하루+건너뜀=리셋(1).
// 날짜는 UTC 자정 기준 정수 일수 차로만 비교(시/분·타임존 안전).
// 외부 전송·리워드 없음(CRITICAL #1·#4) — 순수 상태 계산만 본다.

import { describe, it, expect } from 'vitest';
import { applyVisit, EMPTY_STREAK, type StreakState } from './streak';

describe('applyVisit — 연속 출석 전이', () => {
  it('최초 방문(빈 상태) → streak 1, lastOpenDate=today', () => {
    expect(applyVisit(EMPTY_STREAK, '2026-06-14')).toEqual({
      lastOpenDate: '2026-06-14',
      streakCount: 1,
    });
  });

  it('같은 날 재방문 → 변화 없음(멱등)', () => {
    const prev: StreakState = { lastOpenDate: '2026-06-14', streakCount: 3 };
    expect(applyVisit(prev, '2026-06-14')).toEqual(prev);
  });

  it('어제 방문 → streak + 1', () => {
    const prev: StreakState = { lastOpenDate: '2026-06-13', streakCount: 3 };
    expect(applyVisit(prev, '2026-06-14')).toEqual({
      lastOpenDate: '2026-06-14',
      streakCount: 4,
    });
  });

  it('하루 건너뜀(이틀 전 방문) → 1로 리셋', () => {
    const prev: StreakState = { lastOpenDate: '2026-06-12', streakCount: 7 };
    expect(applyVisit(prev, '2026-06-14')).toEqual({
      lastOpenDate: '2026-06-14',
      streakCount: 1,
    });
  });

  it('여러 날 건너뜀 → 1로 리셋', () => {
    const prev: StreakState = { lastOpenDate: '2026-06-01', streakCount: 30 };
    expect(applyVisit(prev, '2026-06-14')).toEqual({
      lastOpenDate: '2026-06-14',
      streakCount: 1,
    });
  });

  it('연속 3일 누적: 빈 상태 → 3일 연속이면 streak 3', () => {
    let s = applyVisit(EMPTY_STREAK, '2026-06-12');
    s = applyVisit(s, '2026-06-13');
    s = applyVisit(s, '2026-06-14');
    expect(s).toEqual({ lastOpenDate: '2026-06-14', streakCount: 3 });
  });
});

describe('applyVisit — 날짜 경계', () => {
  it('월 경계: 1/31 방문 후 2/1 = +1', () => {
    const prev: StreakState = { lastOpenDate: '2026-01-31', streakCount: 5 };
    expect(applyVisit(prev, '2026-02-01')).toEqual({
      lastOpenDate: '2026-02-01',
      streakCount: 6,
    });
  });

  it('연 경계: 12/31 방문 후 1/1 = +1', () => {
    const prev: StreakState = { lastOpenDate: '2026-12-31', streakCount: 9 };
    expect(applyVisit(prev, '2027-01-01')).toEqual({
      lastOpenDate: '2027-01-01',
      streakCount: 10,
    });
  });

  it('윤년 경계: 2/28 방문 후 2/29(2024 윤년) = +1', () => {
    const prev: StreakState = { lastOpenDate: '2024-02-28', streakCount: 2 };
    expect(applyVisit(prev, '2024-02-29')).toEqual({
      lastOpenDate: '2024-02-29',
      streakCount: 3,
    });
  });

  it('비윤년 경계: 2/28 방문 후 3/1(2026 비윤년) = +1', () => {
    const prev: StreakState = { lastOpenDate: '2026-02-28', streakCount: 1 };
    expect(applyVisit(prev, '2026-03-01')).toEqual({
      lastOpenDate: '2026-03-01',
      streakCount: 2,
    });
  });
});

describe('applyVisit — 견고성', () => {
  it('today 형식 오류 → 직전 상태 보존(크래시 없음)', () => {
    const prev: StreakState = { lastOpenDate: '2026-06-13', streakCount: 4 };
    expect(applyVisit(prev, 'bad-date')).toEqual(prev);
  });

  it('lastOpenDate 형식 오류 → 최초 취급(1로 시작)', () => {
    const prev: StreakState = { lastOpenDate: 'garbage', streakCount: 99 };
    expect(applyVisit(prev, '2026-06-14')).toEqual({
      lastOpenDate: '2026-06-14',
      streakCount: 1,
    });
  });

  it('미래 기록(시계 역행: 마지막이 오늘보다 미래) → 1로 리셋', () => {
    const prev: StreakState = { lastOpenDate: '2026-06-20', streakCount: 8 };
    expect(applyVisit(prev, '2026-06-14')).toEqual({
      lastOpenDate: '2026-06-14',
      streakCount: 1,
    });
  });

  it('입력 객체를 변형하지 않는다(불변)', () => {
    const prev: StreakState = { lastOpenDate: '2026-06-13', streakCount: 3 };
    const snapshot = { ...prev };
    applyVisit(prev, '2026-06-14');
    expect(prev).toEqual(snapshot);
  });

  it('결정론: 같은 입력 → 같은 출력', () => {
    const prev: StreakState = { lastOpenDate: '2026-06-13', streakCount: 3 };
    expect(applyVisit(prev, '2026-06-14')).toEqual(applyVisit(prev, '2026-06-14'));
  });
});
