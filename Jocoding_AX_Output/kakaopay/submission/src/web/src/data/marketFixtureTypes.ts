export type NumericAnchor = {
  date: string;
  value: number;
};

export type StressEvent = {
  center: string;
  radiusDays: number;
  depth: number;
};

export type EtfSymbol = 'SCHD' | 'QQQM' | 'VOO';

export type EtfFixture = {
  symbol: EtfSymbol;
  label: string;
  periodStart: string;
  periodEnd: string;
  sourceNote: string;
  limitNote: string;
  defaultDividendYield: number;
  priceKind: 'synthetic-close' | 'adjusted-close';
  priceAnchorsUsd: NumericAnchor[];
  fxAnchorsKrw: NumericAnchor[];
  stressEvents?: StressEvent[];
};
