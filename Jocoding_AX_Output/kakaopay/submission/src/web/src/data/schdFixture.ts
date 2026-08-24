import type { EtfFixture } from './marketFixtureTypes';

export const schdFixture: EtfFixture = {
  symbol: 'SCHD',
  label: 'SCHD 고정 예시 데이터',
  periodStart: '2014-01-02',
  periodEnd: '2024-12-31',
  sourceNote:
    '제출 MVP에서 계산 흐름을 검증하기 위한 로컬 고정 fixture입니다. 실제 주문, 실시간 시세, 전체 원자료 조회를 포함하지 않습니다.',
  limitNote:
    '연도별 anchor를 보간한 축약 데이터라 실제 SCHD 일별 가격, 배당, 환율 결과와 다를 수 있습니다.',
  defaultDividendYield: 0.032,
  priceKind: 'synthetic-close',
  stressEvents: [
    { center: '2015-08-24', radiusDays: 90, depth: 0.08 },
    { center: '2018-12-24', radiusDays: 110, depth: 0.11 },
    { center: '2020-03-23', radiusDays: 70, depth: 0.24 },
    { center: '2022-10-14', radiusDays: 150, depth: 0.18 },
  ],
  priceAnchorsUsd: [
    { date: '2014-01-02', value: 31.4 },
    { date: '2015-01-02', value: 34.1 },
    { date: '2016-01-04', value: 33.2 },
    { date: '2017-01-03', value: 39.8 },
    { date: '2018-01-02', value: 45.7 },
    { date: '2019-01-02', value: 42.4 },
    { date: '2020-01-02', value: 52.1 },
    { date: '2021-01-04', value: 58.2 },
    { date: '2022-01-03', value: 73.4 },
    { date: '2023-01-03', value: 69.5 },
    { date: '2024-01-02', value: 76.8 },
    { date: '2024-12-31', value: 82.4 },
  ],
  fxAnchorsKrw: [
    { date: '2014-01-02', value: 1055 },
    { date: '2015-01-02', value: 1103 },
    { date: '2016-01-04', value: 1187 },
    { date: '2017-01-03', value: 1204 },
    { date: '2018-01-02', value: 1064 },
    { date: '2019-01-02', value: 1119 },
    { date: '2020-01-02', value: 1158 },
    { date: '2021-01-04', value: 1086 },
    { date: '2022-01-03', value: 1191 },
    { date: '2023-01-03', value: 1272 },
    { date: '2024-01-02', value: 1309 },
    { date: '2024-12-31', value: 1450 },
  ],
};
