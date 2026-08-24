import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../src/data/marketFixtures.generated.ts');
const dayMs = 24 * 60 * 60 * 1000;

const tickers = [
  {
    symbol: 'QQQM',
    label: 'QQQM Yahoo Finance 검증 데이터',
    period1: Date.UTC(2020, 0, 1) / 1000,
    limitNote:
      'QQQM은 상장 이후 기간이 짧아 10년 참고 범위는 충분한 표본이 없으면 표시하지 않습니다.',
  },
  {
    symbol: 'VOO',
    label: 'VOO Yahoo Finance 검증 데이터',
    period1: Date.UTC(2010, 0, 1) / 1000,
    limitNote:
      'Yahoo Finance chart API의 조정종가를 사용한 검증 데이터이며 실제 서비스용 시세 공급 계약을 대신하지 않습니다.',
  },
];

function todayPlusBuffer() {
  return Math.ceil((Date.now() + dayMs) / 1000);
}

function toDate(timestampSeconds) {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
}

async function fetchChart(symbol, period1, period2) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
  url.searchParams.set('period1', String(period1));
  url.searchParams.set('period2', String(period2));
  url.searchParams.set('interval', '1d');
  url.searchParams.set('events', 'history');
  url.searchParams.set('includeAdjustedClose', 'true');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${symbol} fetch failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  const error = payload.chart?.error;
  if (!result || error) {
    throw new Error(`${symbol} chart payload missing result: ${JSON.stringify(error)}`);
  }

  return {
    url: url.toString(),
    result,
  };
}

function buildAdjustedCloseAnchors(result) {
  const timestamps = result.timestamp ?? [];
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose ?? [];
  const close = result.indicators?.quote?.[0]?.close ?? [];

  return timestamps.flatMap((timestamp, index) => {
    const value = adjclose[index] ?? close[index];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return [];
    return [{ date: toDate(timestamp), value: Number(value.toFixed(6)) }];
  });
}

function buildCloseAnchors(result) {
  const timestamps = result.timestamp ?? [];
  const close = result.indicators?.quote?.[0]?.close ?? [];

  return timestamps.flatMap((timestamp, index) => {
    const value = close[index];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return [];
    return [{ date: toDate(timestamp), value: Number(value.toFixed(6)) }];
  });
}

function serializeAnchors(anchors) {
  return JSON.stringify(anchors, null, 2).replaceAll('\n', '\n  ');
}

function serializeFixtureWithoutFx(fixture) {
  const { fxAnchorsKrw, ...rest } = fixture;
  const serialized = JSON.stringify(rest, null, 2).replaceAll('\n', '\n  ');
  return `${serialized.slice(0, -1)},\n    "fxAnchorsKrw": generatedFxAnchorsKrw\n  }`;
}

async function main() {
  const period2 = todayPlusBuffer();
  const fx = await fetchChart('KRW=X', Date.UTC(2010, 0, 1) / 1000, period2);
  const fxAnchorsKrw = buildCloseAnchors(fx.result);

  const fixtures = [];
  const sourceUrls = {
    fx: fx.url,
  };

  for (const ticker of tickers) {
    const chart = await fetchChart(ticker.symbol, ticker.period1, period2);
    const priceAnchorsUsd = buildAdjustedCloseAnchors(chart.result);
    if (priceAnchorsUsd.length === 0) {
      throw new Error(`${ticker.symbol} has no usable adjusted-close anchors`);
    }

    sourceUrls[ticker.symbol] = chart.url;
    fixtures.push({
      symbol: ticker.symbol,
      label: ticker.label,
      periodStart: priceAnchorsUsd[0].date,
      periodEnd: priceAnchorsUsd[priceAnchorsUsd.length - 1].date,
      sourceNote:
        'Yahoo Finance chart API에서 검증 시점에 받은 일별 조정종가와 USD/KRW 환율을 로컬 fixture로 저장했습니다.',
      limitNote: ticker.limitNote,
      defaultDividendYield: 0,
      priceKind: 'adjusted-close',
      priceAnchorsUsd,
      fxAnchorsKrw,
    });
  }

  const file = `import type { EtfFixture } from './marketFixtureTypes';

export const generatedMarketFixtureMetadata = {
  generatedAt: ${JSON.stringify(new Date().toISOString())},
  sourceUrls: ${JSON.stringify(sourceUrls, null, 2).replaceAll('\n', '\n  ')},
} as const;

const generatedFxAnchorsKrw = ${serializeAnchors(fxAnchorsKrw)};

export const generatedMarketFixtures = [
  ${fixtures.map(serializeFixtureWithoutFx).join(',\n  ')},
] satisfies EtfFixture[];
`;

  await writeFile(outputPath, file);
  console.log(`Wrote ${outputPath}`);
  for (const fixture of fixtures) {
    console.log(`${fixture.symbol}: ${fixture.periodStart}..${fixture.periodEnd}, ${fixture.priceAnchorsUsd.length} price rows`);
  }
  console.log(`KRW=X: ${fxAnchorsKrw[0].date}..${fxAnchorsKrw[fxAnchorsKrw.length - 1].date}, ${fxAnchorsKrw.length} fx rows`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
