import { describe, expect, it } from 'vitest';
import { getEtfFixture } from '../data/etfFixtures';
import {
  analyzeEtfFixture,
  analyzeSchdFixture,
  buildAssumptionsForFixture,
  buildSimulationLineSections,
  clampProjectionYears,
  defaultAssumptions,
  formatKrwMan,
  isWindowAvailable,
} from './simulation';

function last<T>(items: T[]) {
  return items[items.length - 1];
}

describe('analyzeSchdFixture', () => {
  it('3년, 5년, 10년 일별 시작점 수익률 분포를 계산한다', () => {
    const summary = analyzeSchdFixture();

    expect(summary.historicalWindows).toHaveLength(3);
    expect(summary.historicalWindows[0].years).toBe(3);
    expect(summary.historicalWindows[1].years).toBe(5);
    expect(summary.historicalWindows[2].years).toBe(10);
    expect(summary.historicalWindows[1].sampleCount).toBeGreaterThan(1000);
    expect(summary.historicalWindows[2].sampleCount).toBeGreaterThan(300);
    expect(summary.principalKrw).toBeGreaterThan(9_000_000);
    expect(summary.assumptions).toEqual(defaultAssumptions);
  });

  it('과거 수익률 분포에서 최저치, 평균, 최고치 값을 만든다', () => {
    const summary = analyzeSchdFixture();

    expect(summary.lower.annualReturnPct).toBeLessThanOrEqual(summary.average.annualReturnPct);
    expect(summary.average.annualReturnPct).toBeLessThanOrEqual(summary.upper.annualReturnPct);
    expect(summary.lower.finalValueKrw).toBeLessThanOrEqual(summary.average.finalValueKrw);
    expect(summary.average.finalValueKrw).toBeLessThanOrEqual(summary.upper.finalValueKrw);
  });

  it('참고 범위 그래프 수치를 계산 요약과 같은 값에서 만든다', () => {
    const summary = analyzeSchdFixture();
    const sections = buildSimulationLineSections(summary);
    const projectionChart = sections.find((section) => section.title === '5년 참고 범위');

    expect(sections).toHaveLength(1);
    expect(last(projectionChart?.series[0].points ?? [])?.detail).toBe(formatKrwMan(summary.principalKrw));
    expect(last(projectionChart?.series[1].points ?? [])?.detail).toBe(formatKrwMan(summary.lower.finalValueKrw));
    expect(last(projectionChart?.series[2].points ?? [])?.detail).toBe(formatKrwMan(summary.average.finalValueKrw));
    expect(last(projectionChart?.series[3].points ?? [])?.detail).toBe(formatKrwMan(summary.upper.finalValueKrw));
    sections.flatMap((section) => section.series).forEach((line) => {
      expect(line.points.length).toBeGreaterThan(10);
      expect(last(line.points)?.label).toBe('5년');
    });
  });

  it('선택한 기간과 하루 금액을 그래프에 반영한다', () => {
    const summary = analyzeSchdFixture(undefined, {
      ...defaultAssumptions,
      dailyContributionKrw: 50_000,
      projectionYears: 10,
    });
    const sections = buildSimulationLineSections(summary);

    expect(summary.selectedWindow.years).toBe(10);
    expect(summary.principalKrw).toBeGreaterThan(180_000_000);
    expect(sections[0].title).toBe('10년 참고 범위');
    expect(last(sections[0].series[0].points)?.label).toBe('10년');
  });

  it('QQQM 검증 데이터는 3년과 5년 범위를 계산하고 10년은 제외한다', () => {
    const fixture = getEtfFixture('QQQM');
    const summary = analyzeEtfFixture(fixture, buildAssumptionsForFixture(fixture, {
      dailyContributionKrw: 10_000,
      projectionYears: 5,
    }));

    expect(summary.fixture.symbol).toBe('QQQM');
    expect(summary.historicalWindows.map((window) => window.years)).toEqual([3, 5]);
    expect(isWindowAvailable(fixture, 10)).toBe(false);
    expect(summary.selectedWindow.years).toBe(5);
    expect(summary.lower.finalValueKrw).toBeGreaterThan(0);
    expect(summary.lower.finalValueKrw).toBeLessThanOrEqual(summary.average.finalValueKrw);
    expect(summary.average.finalValueKrw).toBeLessThanOrEqual(summary.upper.finalValueKrw);
  });

  it('요청 기간이 데이터 기간보다 길면 화면과 계산에 쓸 기간을 유효 기간으로 낮춘다', () => {
    const fixture = getEtfFixture('QQQM');
    const availableYears = defaultAssumptions.returnWindows.filter((years) => isWindowAvailable(fixture, years));
    const effectiveYears = clampProjectionYears(10, availableYears);
    const summary = analyzeEtfFixture(fixture, buildAssumptionsForFixture(fixture, {
      projectionYears: effectiveYears,
    }));

    expect(availableYears).toEqual([3, 5]);
    expect(effectiveYears).toBe(5);
    expect(summary.assumptions.projectionYears).toBe(5);
    expect(summary.selectedWindow.years).toBe(5);
  });

  it('VOO 검증 데이터는 10년 범위까지 같은 계산 경로로 처리한다', () => {
    const fixture = getEtfFixture('VOO');
    const summary = analyzeEtfFixture(fixture, buildAssumptionsForFixture(fixture, {
      dailyContributionKrw: 10_000,
      projectionYears: 10,
    }));
    const sections = buildSimulationLineSections(summary);

    expect(summary.fixture.symbol).toBe('VOO');
    expect(summary.historicalWindows.map((window) => window.years)).toEqual([3, 5, 10]);
    expect(isWindowAvailable(fixture, 10)).toBe(true);
    expect(summary.selectedWindow.years).toBe(10);
    expect(summary.selectedWindow.sampleCount).toBeGreaterThan(1000);
    expect(last(sections[0].series[0].points)?.label).toBe('10년');
    expect(summary.lower.finalValueKrw).toBeLessThanOrEqual(summary.average.finalValueKrw);
    expect(summary.average.finalValueKrw).toBeLessThanOrEqual(summary.upper.finalValueKrw);
  });
});
