import { useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Disclosure } from '../components/Disclosure';
import { Section } from '../components/Section';
import { LineChart } from '../components/LineChart';
import { etfFixtures, getEtfFixture } from '../data/etfFixtures';
import type { EtfSymbol } from '../data/marketFixtureTypes';
import {
  analyzeEtfFixture,
  buildAssumptionsForFixture,
  buildSimulationLineSections,
  clampProjectionYears,
  defaultAssumptions,
  formatKrwMan,
  formatPercent,
  isWindowAvailable,
} from '../lib/simulation';

const periodOptions = [3, 5, 10] as const;
const defaultSymbol: EtfSymbol = 'SCHD';
const amountOptions = [
  { label: '5,000원', value: '5000' },
  { label: '10,000원', value: '10000' },
  { label: '50,000원', value: '50000' },
  { label: '직접입력', value: 'custom' },
] as const;

type AmountOption = (typeof amountOptions)[number]['value'];

export function App() {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<EtfSymbol>(defaultSymbol);
  const [selectedYears, setSelectedYears] = useState<(typeof periodOptions)[number]>(5);
  const [selectedAmount, setSelectedAmount] = useState<AmountOption>('5000');
  const [customAmount, setCustomAmount] = useState('20000');
  const fixture = useMemo(() => getEtfFixture(selectedSymbol), [selectedSymbol]);
  const availablePeriods = useMemo(
    () => periodOptions.filter((years) => isWindowAvailable(fixture, years)),
    [fixture],
  );

  const effectiveYears = clampProjectionYears(selectedYears, availablePeriods);
  const dailyContributionKrw = selectedAmount === 'custom'
    ? Math.max(0, Number(customAmount) || 0)
    : Number(selectedAmount);
  const summary = useMemo(() => analyzeEtfFixture(
    fixture,
    buildAssumptionsForFixture(fixture, {
      dailyContributionKrw,
      projectionYears: effectiveYears,
    }),
  ), [dailyContributionKrw, effectiveYears, fixture]);

  const chartSections = useMemo(() => buildSimulationLineSections(summary), [summary]);
  const advancedAssumptions = [
    {
      label: '환율',
      value: '달러 가격을 원화로 봐요',
      description: '달러 가격이 같아도 환율에 따라 원화 금액은 달라질 수 있어요.',
    },
    {
      label: '배당',
      value: fixture.priceKind === 'adjusted-close' ? '조정종가에 들어간 값으로 봐요' : '다시 넣는 경우로 봐요',
      description: fixture.priceKind === 'adjusted-close'
        ? '검증 데이터는 조정종가를 사용해 별도 배당률을 더하지 않아요.'
        : '배당을 어떻게 다루는지에 따라 과거 결과도 달라져요.',
    },
  ];
  const assumptionRows = [
    ['분석 대상 ETF', fixture.symbol],
    ['적립 금액', `${dailyContributionKrw.toLocaleString('ko-KR')}원/일`],
    ['앞으로 볼 기간', `${effectiveYears}년`],
    ['과거 계산 주기', `${effectiveYears}년`],
    ['표시 기준', '원화'],
    ['가격 기준', fixture.priceKind === 'adjusted-close' ? '조정종가' : '로컬 예시 가격'],
  ];

  return (
    <main className="app-shell" aria-label="과거 수익률로 잡아본 참고 범위 설명">
      <div className="phone-frame">
        <nav className="app-nav" aria-label="상단 메뉴">
          <button className="nav-icon" type="button" aria-label="이전 화면">‹</button>
          <div className="nav-actions">
            <button className="nav-text" type="button">공유하기</button>
            <button className="nav-icon home-icon" type="button" aria-label="홈">⌂</button>
          </div>
        </nav>

        <Section title={`${effectiveYears}년 참고 범위`} description="과거 최저치, 평균, 최고치를 같은 적립 조건에 대입했어요.">
          <div className="choice-panel" aria-label="분석 조건 선택">
            <div className="choice-group">
              <span>ETF</span>
              <div className="segmented-control ticker-control" role="group" aria-label="ETF 선택">
                {etfFixtures.map((item) => (
                  <button
                    key={item.symbol}
                    className={selectedSymbol === item.symbol ? 'segment-button selected' : 'segment-button'}
                    type="button"
                    onClick={() => setSelectedSymbol(item.symbol)}
                  >
                    {item.symbol}
                  </button>
                ))}
              </div>
            </div>

            <div className="choice-group">
              <span>기간</span>
              <div className="segmented-control" role="group" aria-label="기간 선택">
                {periodOptions.map((years) => {
                  const disabled = !availablePeriods.includes(years);
                  return (
                    <button
                      key={years}
                      className={selectedYears === years ? 'segment-button selected' : 'segment-button'}
                      type="button"
                      onClick={() => setSelectedYears(years)}
                      disabled={disabled}
                    >
                      {years}년
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="choice-group">
              <span>하루 금액</span>
              <div className="amount-grid" role="group" aria-label="하루 적립 금액 선택">
                {amountOptions.map((option) => (
                  <button
                    key={option.value}
                    className={selectedAmount === option.value ? 'segment-button selected' : 'segment-button'}
                    type="button"
                    onClick={() => setSelectedAmount(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {selectedAmount === 'custom' ? (
                <label className="amount-input">
                  <span>직접 입력 금액</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value.replace(/\D/g, '').slice(0, 8))}
                    aria-label="직접 입력 금액"
                  />
                  <em>원/일</em>
                </label>
              ) : null}
            </div>
          </div>

          <div className="result-notice">
            <Badge tone="strong">과거 수익률로 잡아본 범위 · 보장 아님</Badge>
            <p>실시간 예측이나 상품 권유가 아니라 검증용으로 저장한 과거 데이터로 만든 설명 화면이에요.</p>
          </div>

          {chartSections.map((section) => (
            <LineChart
              key={section.title}
              title={section.title}
              description={section.description}
              series={section.series}
            />
          ))}
        </Section>

        <Section
          title="숫자로 보면"
          description={`매일 ${dailyContributionKrw.toLocaleString('ko-KR')}원씩 넣는다고 가정했을 때예요.`}
        >
          <div className="range-card">
            <span>{effectiveYears}년 뒤 참고 범위</span>
            <strong>
              {formatKrwMan(summary.lower.finalValueKrw)} ~ {formatKrwMan(summary.upper.finalValueKrw)}
            </strong>
            <p>매일 {dailyContributionKrw.toLocaleString('ko-KR')}원씩 넣으면 원금은 {formatKrwMan(summary.principalKrw)}이에요.</p>
            <div className="range-pills" aria-label="과거 연 기준값">
              <span>과거 최저치 {formatPercent(summary.lower.annualReturnPct)}/년</span>
              <span>과거 평균 {formatPercent(summary.average.annualReturnPct)}/년</span>
              <span>과거 최고치 {formatPercent(summary.upper.annualReturnPct)}/년</span>
            </div>
          </div>

          <p className="cost-note">
            위 금액은 과거 수익률을 넣어 본 범위예요. 앞으로의 결과를 약속하지 않아요.
          </p>

          <Disclosure
            title="꼭 확인할 점"
            open={detailOpen}
            onToggle={() => setDetailOpen((current) => !current)}
          >
            <ul className="risk-list">
              <li>{effectiveYears}년 과거 결과는 모든 일별 시작점을 기준으로 계산했어요.</li>
              <li>최저치와 최고치는 과거 {effectiveYears}년 시작일별 결과 중 가장 낮고 높은 값이에요.</li>
              <li>평균은 모든 {effectiveYears}년 시작일별 연 기준값을 단순 평균한 값이에요.</li>
              <li>환율은 원화 금액에 영향을 줘요.</li>
              <li>{fixture.symbol} 데이터는 화면 검증을 위해 저장한 과거 데이터예요.</li>
            </ul>

            <dl className="summary-list compact">
              {summary.historicalWindows.map((window) => (
                <div className="summary-row" key={window.years}>
                  <dt>{window.years}년 과거 연 기준값</dt>
                  <dd>
                    {formatPercent(window.lowAnnualReturnPct)}/년 ~ {formatPercent(window.highAnnualReturnPct)}/년
                  </dd>
                </div>
              ))}
              <div className="summary-row">
                <dt>데이터 기준</dt>
                <dd>{summary.fixture.periodStart}부터 {summary.fixture.periodEnd}까지</dd>
              </div>
              <div className="summary-row">
                <dt>데이터 한계</dt>
                <dd>{summary.fixture.limitNote}</dd>
              </div>
            </dl>
          </Disclosure>
        </Section>

        <Section title="조건" description="주문으로 이어지지 않는 확인 화면이에요.">
          <dl className="summary-list condition-grid">
            {assumptionRows.map(([label, value]) => (
              <div key={label} className="summary-row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <Disclosure
            title="가정 보기"
            open={advancedOpen}
            onToggle={() => setAdvancedOpen((current) => !current)}
          >
            <div className="assumption-stack">
              {advancedAssumptions.map((item) => (
                <article className="assumption-item" key={item.label}>
                  <div>
                    <h3>{item.label}</h3>
                    <strong>{item.value}</strong>
                  </div>
                  <p>{item.description}</p>
                </article>
              ))}
              <article className="assumption-item">
                <div>
                  <h3>데이터</h3>
                  <strong>{fixture.label}</strong>
                </div>
                <p>{fixture.sourceNote}</p>
              </article>
            </div>
          </Disclosure>
        </Section>

      </div>
    </main>
  );
}
