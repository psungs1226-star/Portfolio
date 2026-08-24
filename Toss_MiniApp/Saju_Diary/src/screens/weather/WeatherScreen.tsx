/**
 * WeatherScreen — 주간(여러 날) 날씨 자세히 보기(풀스크린 오버레이, 요청 #6).
 *
 * 홈 날씨 위젯의 "주간 날씨 자세히 보기"를 누르면 열린다. 한 지역의:
 *   - 현재 날씨(아이콘·기온·상태·최저/최고·미세먼지/자외선)
 *   - 일별 예보(오늘/내일/모레 — 대표 날씨 + 최저(파랑)/최고(빨강) + 강수확률)
 *   - 3시간별 전체 타임라인(가로 스크롤)
 * 을 정리해 보여준다.
 *
 * 데이터 한계(정직): 공공 **단기예보(getVilageFcst)** 는 오늘 포함 약 3일치다. 7일 풀주간은
 *   중기예보 API가 따로 필요해 이번 빌드엔 단기예보 범위(약 3일)를 "주간"으로 정리해 보여준다.
 * 계산·가공은 weather feature·weather-view 재사용(재구현 금지). 저장/외부 전송 0(CRITICAL #1, 읽기 전용 공공 API).
 * 웹 React + TDS + inline style(토큰). RN 프리미티브 금지(CRITICAL #5).
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Top, Badge } from '@toss/tds-mobile';
import { Card } from '../../components';
import { palette, spacing, radius, warm, peach, accent } from '../../theme/tokens';
import type { Region } from '../../types';
import {
  hasWeatherApiKey,
  loadWeather,
  type WeatherBundle,
} from '../../features/weather';
import {
  airBadge,
  airGradeOf,
  buildDailyOutlook,
  buildHalfDay,
  buildTimeline,
  conditionLabel,
  iconEmoji,
  sidoForRegion,
  uvBadge,
  uvGradeOf,
  type DailyCell,
  type HalfDay,
  type HalfDayOutlook,
  type TimelineCell,
} from '../../widgets/weather-view';

// 최저/최고 온도 색 — 원색 파랑/빨강 대신 Peach Milk 톤(저온=웜 토프, 고온=코랄).
const COLD = '#a08a7f';
const HOT = '#f2754a';

export interface WeatherScreenProps {
  /** 보여줄 지역(들). 2개면 상단 탭으로 전환한다. */
  regions: Region[];
  /** 처음 보여줄 지역 인덱스(홈에서 보고 있던 지역). 기본 0. */
  initialIndex?: number;
  /** 화면 닫기(App에서 setOverlay(null)). */
  onClose: () => void;
}

export function WeatherScreen({ regions, initialIndex = 0, onClose }: WeatherScreenProps) {
  const [active, setActive] = useState(Math.min(Math.max(initialIndex, 0), Math.max(regions.length - 1, 0)));
  const region = regions[Math.min(active, regions.length - 1)] ?? regions[0];

  const [bundle, setBundle] = useState<WeatherBundle | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (region == null) return;
    let alive = true;
    setFailed(false);
    setBundle(null); // 지역 전환 시 이전 지역 데이터가 잠깐 보이지 않도록 초기화.
    loadWeather(region, { sido: sidoForRegion(region) })
      .then(async ({ cached, refresh }) => {
        if (alive && cached != null) setBundle(cached);
        try {
          const fresh = await refresh();
          if (alive) setBundle(fresh);
        } catch {
          if (alive && cached == null) setFailed(true);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region?.nx, region?.ny, region?.name]);

  const forecast = bundle?.forecast;
  // 내일·모레만(오늘은 '현재' + '시간대별'로 충분, #5). buildDailyOutlook의 첫칸=오늘 → 제외.
  const days = useMemo<DailyCell[]>(
    () => (forecast != null ? buildDailyOutlook(forecast, 4).filter((d) => !d.isToday).slice(0, 2) : []),
    [forecast],
  );
  // 오늘 시간대별(가까운 슬롯부터). 너무 길지 않게 16칸 정도.
  const cells = useMemo<TimelineCell[]>(
    () => (forecast != null ? buildTimeline(forecast, 16) : []),
    [forecast],
  );

  const wrap: CSSProperties = { minHeight: '100vh', backgroundColor: warm.paper, boxSizing: 'border-box' };
  // 뒤로가기를 또렷한 알약 버튼으로(#3) — 배경에 묻히지 않게 흰 칩 + 테두리.
  const back: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xxs,
    margin: `${spacing.md}px ${spacing.xl}px 0`,
    padding: `${spacing.xs}px ${spacing.md}px`,
    background: warm.cream,
    border: `1px solid ${warm.line}`,
    borderRadius: radius.pill,
    color: warm.ink,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  };
  const body: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.gapCard,
    padding: `0 ${spacing.xl}px ${spacing.xxl}px`,
  };

  return (
    <div style={wrap}>
      <button type="button" style={back} onClick={onClose} aria-label="뒤로 가기">
        <span aria-hidden style={{ fontSize: 18 }}>‹</span>
        뒤로
      </button>
      <Top
        title={<Top.TitleParagraph size={22}>🌤️ 주간 날씨</Top.TitleParagraph>}
        subtitleBottom={
          regions.length > 1 ? undefined : (
            <Top.SubtitleParagraph size={15}>{region?.name}</Top.SubtitleParagraph>
          )
        }
      />

      <div style={body}>
        {/* 2지역이면 탭으로 전환(홈과 동일하게 탭으로 직접 고른다). */}
        {regions.length > 1 && (
          <RegionTabs regions={regions} activeIndex={active} onSelect={setActive} />
        )}

        {!hasWeatherApiKey() ? (
          <Notice text="날씨 정보를 불러올 키가 아직 없어요." />
        ) : forecast == null ? (
          <Notice text={failed ? '지금은 날씨를 못 받았어요. 잠시 후 다시 시도해 주세요.' : '날씨 불러오는 중…'} />
        ) : (
          <>
            <Card style={cardStyle} raised={false}>
              <CurrentBlock bundle={bundle!} />
            </Card>

            {/* 오늘 시간대별 — 현재 바로 아래로(#5). */}
            <Card style={cardStyle} raised={false}>
              <Heading>오늘 시간대별</Heading>
              <div style={{ display: 'flex', gap: spacing.xs, overflowX: 'auto', marginTop: spacing.sm, paddingBottom: spacing.xxs }}>
                {cells.map((c, i) => (
                  <HourCell key={`${c.time}-${i}`} cell={c} />
                ))}
              </div>
            </Card>

            {/* 내일·모레만(2장 카드, 재디자인 #5). */}
            {days.length > 0 ? (
              <div>
                <div style={{ marginBottom: spacing.sm }}><Heading>내일 · 모레</Heading></div>
                <div style={{ display: 'grid', gridTemplateColumns: days.length === 1 ? '1fr' : '1fr 1fr', gap: spacing.sm }}>
                  {days.map((d) => (
                    <DayCard key={d.date} cell={d} half={buildHalfDay(forecast, d.date)} />
                  ))}
                </div>
                <p style={noteStyle}>공공 단기예보 기준이라 모레까지만 제공돼요.</p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// ── 지역 전환 탭(2지역) ──
function RegionTabs({
  regions,
  activeIndex,
  onSelect,
}: {
  regions: Region[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  const wrap: CSSProperties = {
    display: 'flex',
    gap: spacing.xxs,
    padding: 3,
    borderRadius: radius.pill,
    background: warm.cream,
    border: `1px solid ${warm.line}`,
  };
  const tab = (on: boolean): CSSProperties => ({
    flex: 1,
    minWidth: 0,
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.pill,
    border: 'none',
    background: on ? warm.terracotta : 'transparent',
    color: on ? '#FFFFFF' : palette.textSecondary,
    fontSize: 14,
    fontWeight: on ? 800 : 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  });
  return (
    <div style={wrap} role="tablist" aria-label="지역 선택">
      {regions.map((r, i) => (
        <button
          key={`${r.nx}-${r.ny}-${i}`}
          type="button"
          role="tab"
          aria-selected={i === activeIndex}
          style={tab(i === activeIndex)}
          onClick={() => onSelect(i)}
        >
          {r.name}
        </button>
      ))}
    </div>
  );
}

const cardStyle: CSSProperties = { background: warm.cream, borderRadius: radius.cute, boxShadow: warm.shadow };
const noteStyle: CSSProperties = { margin: 0, marginTop: spacing.sm, fontSize: 11, color: palette.textTertiary };

function Heading({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 15, fontWeight: 800, color: warm.ink }}>{children}</span>;
}

function Notice({ text }: { text: string }) {
  return (
    <Card style={cardStyle} raised={false}>
      <span style={{ fontSize: 14, color: palette.textSecondary }}>{text}</span>
    </Card>
  );
}

/** 등급 심각도 → 웜 계열 색(좋음=세이지 → 보통=골드 → 나쁨=코랄). 톤앤매너 정합. */
function gradeColor(grade: string): string {
  if (grade === 'good' || grade === 'low') return accent.sage;
  if (grade === 'moderate') return '#c9962f';
  if (grade === 'unhealthy' || grade === 'high') return accent.coral;
  if (grade === 'very-unhealthy' || grade === 'very-high' || grade === 'extreme') return '#cf3d2a';
  return peach.outline;
}

/** 웜 톤 상태 칩(미세먼지/자외선). 원색 뱃지 대신 연한 틴트+진한 텍스트. */
function WeatherChip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: `${color}1f`, color, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: radius.pill, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function CurrentBlock({ bundle }: { bundle: WeatherBundle }) {
  const forecast = bundle.forecast!;
  const airG = airGradeOf(bundle.air);
  const uvG = uvGradeOf(bundle.uv);
  const air = airBadge(airG);
  const uv = uvBadge(uvG);
  const min = forecast.todayMin != null ? Math.round(forecast.todayMin) : undefined;
  const max = forecast.todayMax != null ? Math.round(forecast.todayMax) : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      {/* 맨 위 날씨는 "현재"임을 명시(#3). */}
      <Heading>현재</Heading>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
      <span style={{ fontSize: 48, lineHeight: 1, flexShrink: 0 }} aria-hidden>
        {iconEmoji(forecast.current.iconCode)}
      </span>
      <span style={{ fontSize: 38, fontWeight: 800, color: palette.textPrimary, lineHeight: 1, flexShrink: 0 }}>
        {Math.round(forecast.current.temp)}°C
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: palette.textPrimary }}>
          {conditionLabel(forecast.current)}
        </span>
        {min != null && max != null && (
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: COLD }}>최저 {min}°C</span>
            <span style={{ color: palette.textTertiary, fontWeight: 400 }}> / </span>
            <span style={{ color: HOT }}>최고 {max}°C</span>
          </span>
        )}
        <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <WeatherChip label={air.label} color={gradeColor(airG)} />
          <WeatherChip label={uv.label} color={gradeColor(uvG)} />
        </div>
      </div>
      </div>
    </div>
  );
}

/** 일별 예보 대표 이모지 → 한 줄 날씨말(최저/최고 왼쪽 빈 칸을 채운다, #4). */
const DAY_CONDITION_WORD: Record<string, string> = {
  '☀️': '맑음',
  '⛅': '구름조금',
  '☁️': '흐림',
  '🌦️': '소나기',
  '🌧️': '비',
  '❄️': '눈',
  '🌨️': '비/눈',
};

/** 내일·모레 한 장(세로 카드, 재디자인 #5) — 라벨 → 큰 이모지/날씨말 → 최저·최고 → 오전/오후. */
function DayCard({ cell, half }: { cell: DailyCell; half: HalfDayOutlook }) {
  const word = DAY_CONDITION_WORD[cell.emoji] ?? '';
  const box: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.md}px ${spacing.sm}px`,
    borderRadius: radius.cute,
    background: warm.cream,
    border: `1.5px solid ${warm.line}`,
    boxShadow: '0 2px 8px rgba(120, 95, 175,0.06)',
    minWidth: 0,
  };
  return (
    <div style={box}>
      {/* 라벨 칩 */}
      <span style={{ fontSize: 13, fontWeight: 800, color: warm.terracotta, background: warm.honeyBg, borderRadius: radius.pill, padding: '3px 12px' }}>
        {cell.label}
      </span>
      {/* 큰 대표 이모지 */}
      <span style={{ fontSize: 46, lineHeight: 1.1 }} aria-hidden>{cell.emoji}</span>
      {/* 날씨말 + 강수 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 18 }}>
        {word !== '' ? <span style={{ fontSize: 14, fontWeight: 800, color: palette.textPrimary }}>{word}</span> : null}
        {cell.pop != null && cell.pop > 0 ? (
          <span style={{ fontSize: 12, color: peach.outline, fontWeight: 700 }}>💧{cell.pop}%</span>
        ) : null}
      </div>
      {/* 최저 / 최고 — 크게 */}
      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.3 }}>
        <span style={{ color: COLD }}>{cell.min}°</span>
        <span style={{ color: palette.textTertiary, fontWeight: 400 }}> / </span>
        <span style={{ color: HOT }}>{cell.max}°</span>
      </div>
      {/* 오전 / 오후 */}
      {(half.am != null || half.pm != null) && (
        <div style={{ display: 'flex', gap: spacing.xs, width: '100%', marginTop: 2 }}>
          <HalfChip label="오전" half={half.am} />
          <HalfChip label="오후" half={half.pm} />
        </div>
      )}
    </div>
  );
}

/** 일별 예보의 오전/오후 한 칸. 데이터 없으면 옅게 '–'. */
function HalfChip({ label, half }: { label: string; half: HalfDay | null }) {
  const wrap: CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs}px ${spacing.sm}px`,
    borderRadius: radius.md,
    background: warm.cream,
    border: `1px solid ${warm.line}`,
  };
  // 오전/오후 강조(#4) — 따뜻한 테라코타 + 굵게.
  const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 800, color: warm.terracotta, flexShrink: 0 };
  if (half == null) {
    return (
      <div style={wrap}>
        <span style={labelStyle}>{label}</span>
        <span style={{ fontSize: 13, color: palette.textTertiary, marginLeft: 'auto' }}>–</span>
      </div>
    );
  }
  return (
    <div style={wrap}>
      <span style={labelStyle}>{label}</span>
      <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>{half.emoji}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: palette.textPrimary }}>{half.temp}°</span>
      {half.pop != null && half.pop > 0 ? (
        <span style={{ fontSize: 11, color: peach.outline, fontWeight: 700, marginLeft: 'auto' }}>💧{half.pop}%</span>
      ) : null}
    </div>
  );
}

function HourCell({ cell }: { cell: TimelineCell }) {
  return (
    <div
      style={{
        flex: '0 0 auto',
        width: 54,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: `${spacing.sm}px ${spacing.xxs}px`,
        borderRadius: radius.md,
        background: cell.isNow ? warm.honeyBg : palette.fill,
        border: `1px solid ${cell.isNow ? warm.line : 'transparent'}`,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: cell.isNow ? 800 : 600, color: cell.isNow ? warm.terracotta : palette.textTertiary }}>
        {cell.label}
      </span>
      <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>{cell.emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: palette.textPrimary }}>{cell.temp}°C</span>
      {/* 강수확률에도 빗방울(💧)을 붙여 일별 예보와 일관(피드백). 비/눈은 텍스트 그대로. */}
      <span style={{ fontSize: 10, color: palette.info, minHeight: 12, fontWeight: 600 }}>
        {cell.precip !== '' ? cell.precip : cell.pop !== '' ? `💧${cell.pop}` : ''}
      </span>
    </div>
  );
}
