import { schdFixture } from '../data/schdFixture';
import type { EtfFixture, NumericAnchor } from '../data/marketFixtureTypes';

export type SimulationAssumptions = {
  dailyContributionKrw: number;
  projectionYears: number;
  dividendYield: number;
  returnWindows: number[];
};

export type ChartTone = 'base' | 'primary' | 'caution' | 'risk';

export type HistoricalReturnWindow = {
  years: number;
  sampleCount: number;
  lowAnnualReturnPct: number;
  averageAnnualReturnPct: number;
  highAnnualReturnPct: number;
  lowTotalReturnPct: number;
  averageTotalReturnPct: number;
  highTotalReturnPct: number;
};

export type ProjectionPoint = {
  label: string;
  principalKrw: number;
  valueKrw: number;
};

export type ProjectionBoundary = {
  label: string;
  tone: ChartTone;
  annualReturnPct: number;
  finalValueKrw: number;
  points: ProjectionPoint[];
};

export type SimulationSummary = {
  fixture: EtfFixture;
  assumptions: SimulationAssumptions;
  principalKrw: number;
  selectedWindow: HistoricalReturnWindow;
  historicalWindows: HistoricalReturnWindow[];
  lower: ProjectionBoundary;
  average: ProjectionBoundary;
  upper: ProjectionBoundary;
};

export type SimulationLineSeries = {
  label: string;
  tone: ChartTone;
  points: Array<{
    label: string;
    value: number;
    detail: string;
  }>;
};

export type SimulationLineSection = {
  title: string;
  description: string;
  series: SimulationLineSeries[];
};

export const defaultAssumptions: SimulationAssumptions = {
  dailyContributionKrw: 5000,
  projectionYears: 5,
  dividendYield: 0.032,
  returnWindows: [3, 5, 10],
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dateToTime(date: string) {
  return new Date(`${date}T00:00:00Z`).getTime();
}

function timeToDate(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function addYears(date: string, years: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next.toISOString().slice(0, 10);
}

function eachDate(startDate: string, endDate: string) {
  const days: string[] = [];
  const start = dateToTime(startDate);
  const end = dateToTime(endDate);

  for (let time = start; time <= end; time += DAY_MS) {
    days.push(timeToDate(time));
  }

  return days;
}

function interpolate(anchors: NumericAnchor[], date: string) {
  const target = dateToTime(date);
  const first = anchors[0];
  const last = anchors[anchors.length - 1];

  if (target <= dateToTime(first.date)) return first.value;
  if (target >= dateToTime(last.date)) return last.value;

  let low = 1;
  let high = anchors.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (dateToTime(anchors[middle].date) < target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const right = anchors[low];
  const left = anchors[low - 1];
  const leftTime = dateToTime(left.date);
  const rightTime = dateToTime(right.date);
  const progress = (target - leftTime) / (rightTime - leftTime);
  return left.value + (right.value - left.value) * progress;
}

export function isWindowAvailable(fixture: EtfFixture, years: number) {
  return dateToTime(addYears(fixture.periodStart, years)) <= dateToTime(fixture.periodEnd);
}

export function clampProjectionYears(
  requestedYears: number,
  availableYears: readonly number[],
) {
  if (availableYears.includes(requestedYears)) return requestedYears;
  return availableYears[availableYears.length - 1] ?? requestedYears;
}

function triangularStress(date: string, center: string, radiusDays: number, depth: number) {
  const distance = Math.abs(dateToTime(date) - dateToTime(center)) / DAY_MS;
  if (distance >= radiusDays) return 0;
  return depth * (1 - distance / radiusDays);
}

function priceWithStress(fixture: EtfFixture, date: string) {
  const basePrice = interpolate(fixture.priceAnchorsUsd, date);
  const stress = fixture.stressEvents?.reduce(
    (sum, event) => sum + triangularStress(date, event.center, event.radiusDays, event.depth),
    0,
  ) ?? 0;

  return basePrice * (1 - Math.min(stress, 0.32));
}

function assetValueKrw(fixture: EtfFixture, date: string) {
  return priceWithStress(fixture, date) * interpolate(fixture.fxAnchorsKrw, date);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateWindowReturns(
  fixture: EtfFixture,
  assumptions: SimulationAssumptions,
  years: number,
): HistoricalReturnWindow {
  if (!isWindowAvailable(fixture, years)) {
    return {
      years,
      sampleCount: 0,
      lowAnnualReturnPct: 0,
      averageAnnualReturnPct: 0,
      highAnnualReturnPct: 0,
      lowTotalReturnPct: 0,
      averageTotalReturnPct: 0,
      highTotalReturnPct: 0,
    };
  }

  const latestStart = addYears(fixture.periodEnd, -years);
  const startDates = eachDate(fixture.periodStart, latestStart);
  const annualReturns = startDates.map((startDate) => {
    const endDate = addYears(startDate, years);
    const startValue = assetValueKrw(fixture, startDate);
    const endValue = assetValueKrw(fixture, endDate);
    const totalReturn = (endValue / startValue) * (1 + assumptions.dividendYield) ** years - 1;
    return (1 + totalReturn) ** (1 / years) - 1;
  });
  const sortedAnnualReturns = [...annualReturns].sort((left, right) => left - right);
  const lowAnnual = sortedAnnualReturns[0] ?? 0;
  const averageAnnual = average(annualReturns);
  const highAnnual = sortedAnnualReturns[sortedAnnualReturns.length - 1] ?? 0;

  return {
    years,
    sampleCount: annualReturns.length,
    lowAnnualReturnPct: lowAnnual * 100,
    averageAnnualReturnPct: averageAnnual * 100,
    highAnnualReturnPct: highAnnual * 100,
    lowTotalReturnPct: (((1 + lowAnnual) ** years) - 1) * 100,
    averageTotalReturnPct: (((1 + averageAnnual) ** years) - 1) * 100,
    highTotalReturnPct: (((1 + highAnnual) ** years) - 1) * 100,
  };
}

function elapsedLabel(month: number, totalMonths: number, years: number) {
  if (month === 0) return '시작';
  if (month >= totalMonths) return `${years}년`;
  const elapsedYears = Math.round((month / totalMonths) * years);
  return elapsedYears <= 0 ? '시작' : `${elapsedYears}년`;
}

function projectedValue(dailyContributionKrw: number, dailyReturn: number, days: number) {
  if (days <= 0) return 0;
  if (Math.abs(dailyReturn) < 0.0000001) return dailyContributionKrw * days;
  return dailyContributionKrw * (1 + dailyReturn) * (((1 + dailyReturn) ** days - 1) / dailyReturn);
}

function projectDailyContribution(
  label: string,
  tone: ChartTone,
  annualReturnPct: number,
  assumptions: SimulationAssumptions,
): ProjectionBoundary {
  const totalDays = Math.round(assumptions.projectionYears * 365);
  const totalMonths = assumptions.projectionYears * 12;
  const dailyReturn = (1 + annualReturnPct / 100) ** (1 / 365) - 1;
  const points: ProjectionPoint[] = [];

  for (let month = 0; month <= totalMonths; month += 1) {
    const day = Math.round((month / totalMonths) * totalDays);
    const principalKrw = assumptions.dailyContributionKrw * day;
    const valueKrw = projectedValue(assumptions.dailyContributionKrw, dailyReturn, day);
    points.push({
      label: elapsedLabel(month, totalMonths, assumptions.projectionYears),
      principalKrw,
      valueKrw,
    });
  }

  return {
    label,
    tone,
    annualReturnPct,
    finalValueKrw: points[points.length - 1]?.valueKrw ?? 0,
    points,
  };
}

export function buildAssumptionsForFixture(
  fixture: EtfFixture,
  overrides: Partial<SimulationAssumptions> = {},
): SimulationAssumptions {
  return {
    ...defaultAssumptions,
    dividendYield: fixture.defaultDividendYield,
    ...overrides,
  };
}

export function analyzeEtfFixture(
  fixture = schdFixture,
  assumptions = buildAssumptionsForFixture(fixture),
): SimulationSummary {
  const historicalWindows = assumptions.returnWindows
    .map((years) => calculateWindowReturns(fixture, assumptions, years))
    .filter((window) => window.sampleCount > 0);
  if (historicalWindows.length === 0) {
    throw new Error(`${fixture.symbol} fixture has no available historical return windows`);
  }

  const selectedWindow =
    historicalWindows.find((window) => window.years === assumptions.projectionYears) ?? historicalWindows[historicalWindows.length - 1];
  const lower = projectDailyContribution('과거 최저치', 'risk', selectedWindow.lowAnnualReturnPct, assumptions);
  const averageBoundary = projectDailyContribution('과거 평균', 'primary', selectedWindow.averageAnnualReturnPct, assumptions);
  const upper = projectDailyContribution('과거 최고치', 'caution', selectedWindow.highAnnualReturnPct, assumptions);

  return {
    fixture,
    assumptions,
    principalKrw: averageBoundary.points[averageBoundary.points.length - 1].principalKrw,
    selectedWindow,
    historicalWindows,
    lower,
    average: averageBoundary,
    upper,
  };
}

export const analyzeSchdFixture = analyzeEtfFixture;

export function formatKrwMan(value: number) {
  const roundedMan = Math.round(value / 10000);
  const eok = Math.floor(roundedMan / 10000);
  const man = roundedMan % 10000;

  if (eok > 0 && man > 0) {
    return `${eok.toLocaleString('ko-KR')}억 ${man.toLocaleString('ko-KR')}만 원`;
  }
  if (eok > 0) {
    return `${eok.toLocaleString('ko-KR')}억 원`;
  }
  return `${roundedMan.toLocaleString('ko-KR')}만 원`;
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function projectionSeries(boundary: ProjectionBoundary): SimulationLineSeries {
  return {
    label: `${boundary.label} · ${formatPercent(boundary.annualReturnPct)}/년`,
    tone: boundary.tone,
    points: boundary.points.map((point) => ({
      label: point.label,
      value: point.valueKrw,
      detail: formatKrwMan(point.valueKrw),
    })),
  };
}

function principalSeries(points: ProjectionPoint[]): SimulationLineSeries {
  return {
    label: '넣은 돈',
    tone: 'base',
    points: points.map((point) => ({
      label: point.label,
      value: point.principalKrw,
      detail: formatKrwMan(point.principalKrw),
    })),
  };
}

export function buildSimulationLineSections(summary: SimulationSummary): SimulationLineSection[] {
  const years = summary.assumptions.projectionYears;

  return [
    {
      title: `${years}년 참고 범위`,
      description: `과거 ${years}년 시작일별 결과의 최저치, 평균, 최고치를 앞으로 매일 적립에 대입했어요.`,
      series: [
        principalSeries(summary.average.points),
        projectionSeries(summary.lower),
        projectionSeries(summary.average),
        projectionSeries(summary.upper),
      ],
    },
  ];
}
