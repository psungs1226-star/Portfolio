import { formatKrwMan, type SimulationLineSeries } from '../lib/simulation';

type LineChartProps = {
  title: string;
  description: string;
  series: SimulationLineSeries[];
};

const toneClass = {
  base: 'line-base',
  primary: 'line-primary',
  caution: 'line-caution',
  risk: 'line-risk',
};

const chartWidth = 320;
const chartHeight = 164;
const paddingX = 38;
const paddingY = 18;
const innerWidth = chartWidth - paddingX - 18;
const innerHeight = chartHeight - paddingY * 2;

function niceStep(rawStep: number) {
  if (rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

function buildYAxis(maxValue: number) {
  const step = niceStep(maxValue / 5);
  const roundedMax = Math.max(Math.ceil(maxValue / step) * step, step);
  const tickCount = Math.round(roundedMax / step);
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => roundedMax - step * index);

  return {
    max: roundedMax,
    ticks,
  };
}

function buildPath(points: Array<{ value: number }>, maxValue: number) {
  const lastIndex = Math.max(1, points.length - 1);

  return points
    .map((point, index) => {
      const x = paddingX + (index / lastIndex) * innerWidth;
      const y = paddingY + innerHeight - (point.value / maxValue) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function LineChart({ title, description, series }: LineChartProps) {
  const allValues = series.flatMap((item) => item.points.map((point) => point.value));
  const yAxis = buildYAxis(Math.max(...allValues, 1));
  const firstLabel = series[0]?.points[0]?.label ?? '시작';
  const firstSeriesPoints = series[0]?.points ?? [];
  const lastLabel = firstSeriesPoints[firstSeriesPoints.length - 1]?.label ?? '끝';

  return (
    <article className="line-chart">
      <div className="mini-chart-heading">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="line-chart-canvas" role="img" aria-label={`${title} 꺾은선 그래프`}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" aria-hidden="true">
          {yAxis.ticks.map((tick) => {
            const y = paddingY + innerHeight - (tick / yAxis.max) * innerHeight;
            return (
              <g key={tick}>
                <text className="grid-label" x="0" y={y + 4}>{formatKrwMan(tick)}</text>
                <line className="grid-line" x1={paddingX} y1={y} x2="302" y2={y} />
              </g>
            );
          })}
          {series.map((item) => (
            <polyline
              key={item.label}
              className={`line-path ${toneClass[item.tone]}`}
              points={buildPath(item.points, yAxis.max)}
            />
          ))}
        </svg>
        <div className="line-axis">
          <span>{firstLabel}</span>
          <span>{lastLabel}</span>
        </div>
      </div>

      <div className="line-legend">
        {series.map((item) => {
          const finalPoint = item.points[item.points.length - 1];
          return (
            <div className="legend-item" key={item.label}>
              <span className={`legend-dot ${toneClass[item.tone]}`} />
              <span>{item.label}</span>
              <strong>{finalPoint?.detail}</strong>
            </div>
          );
        })}
      </div>
    </article>
  );
}
