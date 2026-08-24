// fortune-trend 단위 테스트 — 표본 개수·현위치·값 범위·결정론.
// 만세력은 엔진(computeTodayFortune) 실제 계산을 쓰되, 형태만 검증한다(점수 값 자체는 엔진 테스트가 담당).

import { describe, it, expect } from 'vitest';
import { fortuneTrend, trendInsight } from './fortune-trend';
import type { SajuInput } from '../types';

const SAJU: SajuInput = { birthDate: '1990-05-15', isLunar: false };
const TODAY = '2026-06-16';

describe('fortuneTrend', () => {
  it('week=7점 / month=6점 / year=12점, 첫 점이 현위치(오늘)', () => {
    const week = fortuneTrend(SAJU, TODAY, 'week');
    const month = fortuneTrend(SAJU, TODAY, 'month');
    const year = fortuneTrend(SAJU, TODAY, 'year');
    expect(week).toHaveLength(7);
    expect(month).toHaveLength(6);
    expect(year).toHaveLength(12);
    for (const arr of [week, month, year]) {
      expect(arr[0].current).toBe(true);
      expect(arr[0].label).toBe('오늘');
      expect(arr[0].dateKey).toBe(TODAY);
      expect(arr.slice(1).every((p) => !p.current)).toBe(true);
    }
  });

  it('모든 값은 1~5 사이의 총운이다', () => {
    for (const range of ['week', 'month', 'year'] as const) {
      for (const p of fortuneTrend(SAJU, TODAY, range)) {
        expect(p.value).toBeGreaterThanOrEqual(1);
        expect(p.value).toBeLessThanOrEqual(5);
      }
    }
  });

  it('week 라벨은 오늘 다음부터 요일, year는 N월', () => {
    const week = fortuneTrend(SAJU, TODAY, 'week');
    expect(['일', '월', '화', '수', '목', '금', '토']).toContain(week[1].label);
    const year = fortuneTrend(SAJU, TODAY, 'year');
    expect(year[1].label.endsWith('월')).toBe(true);
  });

  it('같은 입력은 같은 결과(결정론)', () => {
    expect(fortuneTrend(SAJU, TODAY, 'week')).toEqual(fortuneTrend(SAJU, TODAY, 'week'));
  });
});

describe('trendInsight', () => {
  it('상승 흐름은 "올라가는" 추세로, 정점 시점을 짚는다', () => {
    const pts = [
      { value: 2, label: '오늘' },
      { value: 3, label: '화' },
      { value: 4, label: '수' },
      { value: 5, label: '목' },
    ];
    const s = trendInsight(pts, 'week');
    expect(s).toContain('올라가는');
    expect(s).toContain('목'); // 최고점 시점
    expect(s).toContain('이번 주');
  });

  it('하강 흐름은 "가라앉는" 추세, 오늘이 정점이면 "오늘이 가장"', () => {
    const pts = [
      { value: 5, label: '오늘' },
      { value: 4, label: '화' },
      { value: 2, label: '수' },
      { value: 1, label: '목' },
    ];
    const s = trendInsight(pts, 'week');
    expect(s).toContain('가라앉는');
    expect(s).toContain('오늘이 가장');
  });

  it('평탄하면 "잔잔하게", range별 단위 명사를 쓴다', () => {
    const pts = [
      { value: 3, label: '오늘' },
      { value: 3, label: '7월' },
      { value: 3, label: '8월' },
    ];
    expect(trendInsight(pts, 'year')).toContain('잔잔하게');
    expect(trendInsight(pts, 'year')).toContain('올해');
    expect(trendInsight(pts, 'month')).toContain('앞으로 한 달');
  });

  it('빈 배열은 안전 폴백', () => {
    expect(trendInsight([], 'week')).toBe('흐름을 그릴 수 없어요.');
  });
});
