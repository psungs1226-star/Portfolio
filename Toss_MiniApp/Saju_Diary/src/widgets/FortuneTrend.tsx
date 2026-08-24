/**
 * FortuneTrend — 오늘 기준 앞으로의 운세 흐름 그래프(주/월/연) + 현위치(오늘).
 *
 * ref 톤앤매너(에테리얼): 글래스 카드 + 보라 serif 제목 + 골드 **꺾은선** 그래프.
 * 막대 대신 라인 차트(인라인 SVG — 무단 라이브러리 0). 점수는 fortune-trend(엔진 재사용·결정론).
 * 토글은 TDS SegmentedControl. 저장/네트워크 0(표시 전용).
 */
import { useMemo, useState, type CSSProperties } from 'react';
import { SegmentedControl } from '@toss/tds-mobile';
import { Card } from '../components';
import { spacing, radius, serene } from '../theme/tokens';
import type { NatalChart, SajuInput } from '../types';
import { todayDateString } from '../features/fortune/manse';
import { fortuneTrend, trendInsight, type TrendRange } from './fortune-trend';

const RANGE_OPTIONS: { value: TrendRange; label: string }[] = [
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
  { value: 'year', label: '연' },
];

export interface FortuneTrendProps {
  saju: SajuInput;
  today?: string;
  gender?: 'male' | 'female';
  natal?: NatalChart;
}

export function FortuneTrend({ saju, today = todayDateString(), gender, natal }: FortuneTrendProps) {
  const [range, setRange] = useState<TrendRange>('week');

  const points = useMemo(
    () => fortuneTrend(saju, today, range, { gender, natal }),
    [saju, today, range, gender, natal],
  );

  const insight = useMemo(() => trendInsight(points, range), [points, range]);

  // ref 글래스 톤 정합 — 반투명 흰 + 블러 + 옅은 보라 그림자.
  const cardStyle: CSSProperties = {
    background: serene.glassGrad,
    border: `1px solid ${serene.glassBorder}`,
    borderRadius: radius.cute,
    boxShadow: serene.glassShadow,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };
  const heading: CSSProperties = {
    fontFamily: serene.serif,
    fontSize: 16,
    fontWeight: 700,
    color: serene.primary,
  };
  const insightStyle: CSSProperties = {
    fontSize: 13,
    color: serene.ink,
    lineHeight: 1.55,
    marginTop: spacing.sm,
  };

  return (
    <Card style={cardStyle} raised={false}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <span style={{ ...heading, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span aria-hidden>📈 </span>운세 흐름
        </span>
        <div style={{ flexShrink: 0 }}>
          <SegmentedControl size="small" value={range} onChange={(v: string) => setRange(v as TrendRange)}>
            {RANGE_OPTIONS.map((o) => (
              <SegmentedControl.Item key={o.value} value={o.value}>
                <span style={{ display: 'inline-block', padding: '0 6px', whiteSpace: 'nowrap' }}>{o.label}</span>
              </SegmentedControl.Item>
            ))}
          </SegmentedControl>
        </div>
      </div>

      <p style={insightStyle}>{insight}</p>

      <LineTrend points={points.map((p) => ({ value: p.value, label: p.label }))} />
    </Card>
  );
}

/** 골드 꺾은선 그래프 — SVG 선/면(스케일) + HTML 점·라벨 오버레이(왜곡 방지). */
function LineTrend({ points }: { points: { value: number; label: string }[] }) {
  if (points.length === 0) {
    return <span style={{ fontSize: 13, color: serene.inkVariant }}>흐름을 그릴 수 없어요.</span>;
  }
  const n = points.length;
  const H = 116;
  const xOf = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  // value 1~5 → y 100%(바닥)~0%(천장). 범위 밖은 클램프.
  const yOf = (v: number) => (1 - (Math.max(1, Math.min(5, v)) - 1) / 4) * 100;
  const linePts = points.map((p, i) => `${xOf(i)},${yOf(p.value)}`).join(' ');
  const areaPts = `0,100 ${linePts} 100,100`;
  // 라벨 과밀 방지: 점이 많으면(월/연) 일부 x축 라벨만 표기.
  const labelStep = n > 12 ? Math.ceil(n / 6) : 1;

  return (
    <div style={{ position: 'relative', height: H + 26, marginTop: spacing.md }}>
      <div style={{ position: 'absolute', left: 8, right: 8, top: 12, height: H }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }} aria-hidden>
          {/* 그라데이션 없이(사용자 요청) — 면은 옅은 피치 단색, 선은 모카 단색. */}
          <polygon points={areaPts} fill="#D8C9F2" fillOpacity={0.45} />
          <polyline
            points={linePts}
            fill="none"
            stroke={serene.primary}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        {/* 점 + 값 라벨(오늘 강조) */}
        {points.map((p, i) => {
          const today = i === 0;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${xOf(i)}%`,
                top: `${yOf(p.value)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {(today || labelStep === 1) && (
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '100%',
                    transform: 'translateX(-50%)',
                    marginBottom: 5,
                    fontSize: 11,
                    fontWeight: 800,
                    color: today ? serene.gold : serene.inkVariant,
                  }}
                >
                  {p.value}
                </span>
              )}
              <span
                style={{
                  display: 'block',
                  width: today ? 12 : 8,
                  height: today ? 12 : 8,
                  borderRadius: '50%',
                  background: today ? serene.gold : '#FFFFFF',
                  border: `2px solid ${serene.gold}`,
                  boxShadow: '0 1px 3px rgba(120, 95, 175, 0.2)',
                }}
              />
            </div>
          );
        })}
      </div>
      {/* x축 라벨(요일/구간) */}
      <div style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 16 }}>
        {points.map((p, i) =>
          i % labelStep === 0 || i === 0 ? (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${xOf(i)}%`,
                transform: 'translateX(-50%)',
                fontSize: 11,
                fontWeight: i === 0 ? 800 : 600,
                color: i === 0 ? serene.primary : serene.inkVariant,
                whiteSpace: 'nowrap',
              }}
            >
              {p.label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
