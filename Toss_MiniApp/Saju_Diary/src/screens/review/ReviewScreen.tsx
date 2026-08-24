/**
 * ReviewScreen — 돌아보기(회고) 탭 (PRD §6.6).
 *
 * AU·공유 엔진(PRD §9): 한 달을 한눈에 돌아보고 → 텍스트로 공유해 유입을 만든다.
 *  ① 월간 기분 그래프  = TDS `BarChart`(일별 mood, 재구현 금지 / CRITICAL #5)
 *  ② 일기 모아보기      = 그달 일기 목록(날짜·기분·미리보기)
 *  ③ 운세/회고 요약 카드 = 일기 수·평균 기분·대표 행운색(앱 내 표시용 카드)
 *  ④ 공유 버튼          = share 엔진 shareReview(텍스트 전용) + 친구초대 inviteFriends
 *
 * 데이터는 storage loadDiaries 접근자만(CRITICAL #1, 외부 전송 0). 일기=민감정보.
 * 집계는 순수 review-stats로 분리(테스트 가능). 빈 달이면 친절한 빈 상태.
 * 웹 React + inline style(토큰 참조). RN 프리미티브·새 라이브러리 금지.
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Rating } from '@toss/tds-mobile';
import { Card, SectionTitle } from '../../components';
import { EmptyState } from '../EmptyState';
import { palette, spacing, radius, warm } from '../../theme/tokens';
import type { Diary, Memo } from '../../types';
import { loadDiaries, loadMemos } from '../../features/storage';
import { todayDateString } from '../../features/fortune/manse';
import { shareReview, inviteFriends } from '../../features/share';
import {
  diariesInMonth,
  dailyMoodSeries,
  daysInMonth,
  buildMonthlySummary,
  monthsWithDiaries,
  yearMonthOf,
  type DailyMood,
  type YearMonth,
} from './review-stats';
import {
  moodChartPoints,
  makeScales,
  smoothLinePath,
  areaUnderPath,
  xAxisTicks,
  yAxisTicks,
  type ChartDims,
} from './mood-chart';
import { monthsWithCompleted } from './memo-calendar';
import { CompletedCalendar } from './CompletedCalendar';

// ── 라벨 유틸(순수 표현) ─────────────────────────────────────

/** `YYYY-MM` → 사람이 읽는 월 라벨(예: '2026년 6월'). */
function monthLabel(yearMonth: YearMonth): string {
  const [y, m] = yearMonth.split('-');
  return `${y}년 ${Number(m)}월`;
}

/** `YYYY-MM-DD` → '6월 14일'. */
function dayLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일`;
}

/** 일기 미리보기(한 줄, 본문이 비면 '기분만 기록한 날'). */
function previewText(text: string): string {
  const trimmed = text.trim();
  if (trimmed === '') {
    return '기분만 기록한 날';
  }
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

export interface ReviewScreenProps {
  /** 기준 '오늘' `YYYY-MM-DD`. 테스트/미리보기 주입. 기본 오늘(로컬). */
  today?: string;
  /** 빈 상태 CTA — 일기 탭으로 이동(다음 행동 명확화). */
  onGoToDiary?: () => void;
  /** 탭 패널 임베드 모드 — 자체 헤더 제거(상위가 AppBar+SegTabs 제공). */
  embedded?: boolean;
}

export function ReviewScreen({ today = todayDateString(), onGoToDiary, embedded = false }: ReviewScreenProps) {
  const [diaries, setDiaries] = useState<Diary[] | null>(null);
  // 완료 메모 캘린더(#4·#5)용. 읽기 전용(여기서 변형/삭제 0 — storage 접근자만).
  const [memos, setMemos] = useState<Memo[]>([]);
  const [month, setMonth] = useState<YearMonth>(yearMonthOf(today));

  // 로컬 Storage 로드(접근자만 — 네트워크 0). 일기·메모 둘 다.
  useEffect(() => {
    let alive = true;
    Promise.all([loadDiaries(), loadMemos()])
      .then(([d, m]) => {
        if (!alive) return;
        setDiaries(d);
        setMemos(m);
      })
      .catch(() => {
        if (!alive) return;
        setDiaries([]);
        setMemos([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 기록이 있는 달 목록(최신 먼저). 일기·완료 메모 둘 다 고려(완료만 있는 달도 보여준다).
  // 현재 선택 달에 기록이 없으면 가장 최근 달로 보정.
  const months = useMemo(() => {
    if (diaries == null) return [];
    const set = new Set<YearMonth>([...monthsWithDiaries(diaries), ...monthsWithCompleted(memos)]);
    return Array.from(set).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  }, [diaries, memos]);
  useEffect(() => {
    if (diaries == null || months.length === 0) return;
    if (!months.includes(month)) {
      setMonth(months[0]);
    }
  }, [diaries, months, month]);

  const monthDiaries = useMemo(
    () => (diaries == null ? [] : diariesInMonth(diaries, month)),
    [diaries, month],
  );
  const series = useMemo(
    () => (diaries == null ? [] : dailyMoodSeries(diaries, month)),
    [diaries, month],
  );
  const summary = useMemo(
    () => (diaries == null ? null : buildMonthlySummary(diaries, month)),
    [diaries, month],
  );

  const handleShare = () => {
    if (summary == null) return;
    shareReview(summary).catch(() => {
      /* 공유 실패는 무시(외부 전송 없음, SDK 경유만). */
    });
  };

  const handleInvite = () => {
    // 친구초대(공유 리워드). 콘솔 모듈 UUID가 필요 — 컨테스트 빌드엔 미설정이라 best-effort.
    // moduleId가 없으면 SDK가 무시/실패하므로 흐름이 깨지지 않게 try/catch로 감싼다.
    try {
      const cleanup = inviteFriends({ moduleId: '' });
      // 즉시 정리(모듈이 안 열리면 no-op). 실제 모듈 연결 시엔 화면 unmount에 맞춰 해제.
      cleanup?.();
    } catch {
      /* 친구초대 미설정/실패 — 무시. */
    }
  };

  if (diaries == null) {
    return (
      <div>
        <ReviewTop />
        <div style={{ padding: spacing.xl, color: palette.textTertiary, fontSize: 14 }}>
          불러오는 중…
        </div>
      </div>
    );
  }

  // 빈 상태: 일기·완료한 일이 한 건도 없을 때.
  if (months.length === 0) {
    return (
      <div>
        <ReviewTop />
        <EmptyState>
          일기를 쓰거나 할 일을 완료하면 한 달 기분 변화·회고를 여기서 돌아볼 수 있어요.
        </EmptyState>
        {onGoToDiary != null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: `0 ${spacing.xl}px ${spacing.xl}px` }}>
            <button
              type="button"
              onClick={onGoToDiary}
              style={{
                border: 'none',
                borderRadius: radius.pill,
                background: warm.gold,
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 800,
                padding: `${spacing.sm}px ${spacing.xl}px`,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(197, 163, 88, 0.34)',
              }}
            >
              오늘 한 줄 남기러 가기
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {!embedded ? <ReviewTop /> : null}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.gapCard,
          padding: `0 ${spacing.xl}px ${spacing.xl}px`,
        }}
      >
        {/* 월 선택 */}
        <MonthNav months={months} value={month} onChange={setMonth} />

        {/* ③ 회고 요약 카드 */}
        {summary != null && <SummaryCard summary={summary} />}

        {/* 완료한 일 캘린더(#4·#5) — 완료 메모를 날짜별로 모아본다(읽기 전용) */}
        <CompletedCalendar memos={memos} diaries={diaries} yearMonth={month} />

        {/* ① 월간 기분 그래프 — 꺾은선/영역(레퍼런스 이미지2). 별점 y축 + 그라데이션 채우기. */}
        <Card>
          <SectionTitle size="t6">기분 그래프</SectionTitle>
          <MoodLineChart
            series={series}
            daysInMonth={daysInMonth(month)}
            average={summary?.moodAverage ?? 0}
          />
        </Card>

        {/* ② 일기 모아보기 */}
        <Card>
          <SectionTitle size="t6">일기 모아보기</SectionTitle>
          {monthDiaries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {monthDiaries.map((d, i) => (
                <DiaryRow key={d.date} diary={d} divider={i > 0} />
              ))}
            </div>
          ) : (
            <div style={{ padding: `${spacing.lg}px 0`, color: palette.textTertiary, fontSize: 13, textAlign: 'center' }}>
              이 달에 쓴 일기가 없어요.
            </div>
          )}
        </Card>

        {/* ④ 공유 + 친구초대 */}
        <ShareBar onShare={handleShare} onInvite={handleInvite} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 상단
// ─────────────────────────────────────────────────────────────

function ReviewTop() {
  // 레퍼런스 톤(이미지2): 제목 + 서브타이틀을 가운데 정렬로 크게 연다.
  const wrap: CSSProperties = {
    textAlign: 'center',
    padding: `${spacing.xl}px ${spacing.xl}px ${spacing.md}px`,
  };
  return (
    <div style={wrap}>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#5E4E8F', letterSpacing: -0.4 }}>
        돌아보기
      </div>
      <div style={{ marginTop: spacing.xxs, fontSize: 14, color: palette.textTertiary, fontWeight: 600 }}>
        한 달의 기분과 기록을 돌아보고 공유해요.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 월 선택(기록이 있는 달 중에서)
// ─────────────────────────────────────────────────────────────

function MonthNav({
  months,
  value,
  onChange,
}: {
  months: YearMonth[];
  value: YearMonth;
  onChange: (m: YearMonth) => void;
}) {
  const idx = months.indexOf(value);
  // months는 내림차순(최신 먼저): 이전 달 = 더 과거(인덱스 +1), 다음 달 = 더 최신(인덱스 -1).
  const hasOlder = idx >= 0 && idx < months.length - 1;
  const hasNewer = idx > 0;

  const arrow = (enabled: boolean): CSSProperties => ({
    background: palette.fill,
    border: 'none',
    borderRadius: radius.pill,
    width: 36,
    height: 36,
    fontSize: 16,
    color: palette.textSecondary,
    cursor: enabled ? 'pointer' : 'default',
    opacity: enabled ? 1 : 0.35,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <button
        type="button"
        style={arrow(hasOlder)}
        disabled={!hasOlder}
        onClick={hasOlder ? () => onChange(months[idx + 1]) : undefined}
        aria-label="이전 달"
      >
        ‹
      </button>
      <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: palette.textPrimary }}>
        {monthLabel(value)}
      </span>
      <button
        type="button"
        style={arrow(hasNewer)}
        disabled={!hasNewer}
        onClick={hasNewer ? () => onChange(months[idx - 1]) : undefined}
        aria-label="다음 달"
      >
        ›
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 월간 기분 꺾은선/영역 그래프 (레퍼런스 이미지2)
//   TDS 라인차트 미제공 → 인라인 SVG. 좌표/패스는 순수 mood-chart 모듈(테스트 동반).
// ─────────────────────────────────────────────────────────────

/** 그래프 viewBox 치수(좌측=별점 y축 공간, 하단=날짜 x축 공간). */
const CHART_DIMS: ChartDims = {
  width: 340,
  height: 210,
  padLeft: 34,
  padRight: 14,
  padTop: 16,
  padBottom: 26,
};

/** 평균 기분 → 한 줄 코멘트(레퍼런스의 그래프 하단 문구). */
function moodCaption(average: number): string {
  if (average >= 4) return '이번 달은 대체로 기분이 좋았어요.';
  if (average >= 3) return '이번 달은 잔잔하게 흘러갔어요.';
  return '기복이 조금 있었던 한 달이에요.';
}

function MoodLineChart({
  series,
  daysInMonth: dim,
  average,
}: {
  series: DailyMood[];
  daysInMonth: number;
  average: number;
}) {
  const pts = moodChartPoints(series, dim, CHART_DIMS);
  if (pts.length === 0) {
    return (
      <div style={{ padding: `${spacing.lg}px 0`, color: palette.textTertiary, fontSize: 13, textAlign: 'center' }}>
        이 달에는 기분 기록이 없어요.
      </div>
    );
  }
  const D = CHART_DIMS;
  const scales = makeScales(dim, D);
  const line = smoothLinePath(pts);
  const area = areaUnderPath(pts, scales.baselineY);

  return (
    <>
      <svg
        viewBox={`0 0 ${D.width} ${D.height}`}
        width="100%"
        style={{ display: 'block', height: 'auto' }}
        role="img"
        aria-label="월간 기분 변화 꺾은선 그래프"
      >
        {/* y축: 가로 그리드 + 별점 라벨(숫자 + 골드 ★) */}
        {yAxisTicks().map((m) => {
          const y = scales.y(m);
          return (
            <g key={m}>
              <line
                x1={D.padLeft}
                y1={y}
                x2={D.width - D.padRight}
                y2={y}
                stroke="rgba(0,0,0,0.06)"
                strokeWidth={1}
              />
              <text x={D.padLeft - 24} y={y + 4} fontSize={11} fontWeight={700} fill={palette.textTertiary}>
                {m}
              </text>
              <text x={D.padLeft - 14} y={y + 4} fontSize={11} fill={warm.gold}>
                ★
              </text>
            </g>
          );
        })}

        {/* x축: 날짜 눈금(1,5,10,…,말일) */}
        {xAxisTicks(dim).map((day) => (
          <text
            key={day}
            x={scales.x(day)}
            y={D.height - 6}
            fontSize={10}
            fill={palette.textTertiary}
            textAnchor="middle"
          >
            {day}
          </text>
        ))}

        {/* 영역 → 라인 → 점 순서로 겹쳐 그린다. */}
        {area && <path d={area} fill="#D8C9F2" fillOpacity={0.45} stroke="none" />}
        <path
          d={line}
          fill="none"
          stroke="#5E4E8F"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p) => (
          <circle key={p.day} cx={p.x} cy={p.y} r={3.4} fill="#FFFFFF" stroke="#5E4E8F" strokeWidth={2} />
        ))}
      </svg>

      <div
        style={{
          textAlign: 'center',
          marginTop: spacing.sm,
          fontSize: 13,
          color: palette.textSecondary,
          fontWeight: 600,
        }}
      >
        {moodCaption(average)}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 회고 요약 카드
// ─────────────────────────────────────────────────────────────

/** 행운색 → 스와치 hex(DiaryScreen과 동일 팔레트). */
const LUCKY_COLOR_HEX: Record<string, string> = {
  초록: '#22C55E',
  빨강: '#EF4444',
  노랑: '#EAB308',
  흰색: '#E5E7EB',
  검정: '#374151',
};

function SummaryCard({
  summary,
}: {
  summary: { diaryCount: number; moodAverage: number; topKeyword?: string };
}) {
  // 표시용 별점은 반올림 정수(평균은 소수).
  const avgStars = Math.round(summary.moodAverage);
  // Peach Milk 히어로 카드 + 글로시 북 이모지 + "이 달의 최고".
  return (
    <Card
      raised
      style={{
        background: '#F2ECFB',
        border: '1px solid #FFFFFF',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            flexShrink: 0,
            borderRadius: radius.cute,
            background: 'rgba(255, 255, 255, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
          }}
        >
          📖
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7A5CB0' }}>이 달의 최고</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.xs, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: palette.textPrimary }}>
              일기 {summary.diaryCount}개
            </span>
          </div>
          {summary.diaryCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: palette.textSecondary }}>
                평균 기분 {summary.moodAverage}
              </span>
              <Rating readOnly value={avgStars} max={5} size="tiny" variant="compact" />
            </div>
          )}
          {summary.diaryCount > 0 && summary.topKeyword != null && (
            <span style={{ fontSize: 12, color: palette.textSecondary, display: 'flex', alignItems: 'center', gap: spacing.xxs, marginTop: 2 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: LUCKY_COLOR_HEX[summary.topKeyword] ?? palette.textTertiary,
                }}
              />
              자주 뜬 행운색 {summary.topKeyword}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// 일기 한 줄(모아보기)
// ─────────────────────────────────────────────────────────────

function DiaryRow({ diary, divider }: { diary: Diary; divider: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: `${spacing.sm}px 0`,
        borderTop: divider ? `1px solid ${palette.border}` : undefined,
      }}
    >
      <span style={{ width: 56, flexShrink: 0, fontSize: 13, fontWeight: 700, color: palette.textSecondary }}>
        {dayLabel(diary.date)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Rating readOnly value={Math.round(diary.mood)} max={5} size="tiny" variant="iconOnly" />
        <div
          style={{
            fontSize: 13,
            color: palette.textPrimary,
            marginTop: spacing.xxs,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {previewText(diary.text)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 공유 + 친구초대
// ─────────────────────────────────────────────────────────────

function ShareBar({ onShare, onInvite }: { onShare: () => void; onInvite: () => void }) {
  const primary: CSSProperties = {
    flex: 1,
    padding: `${spacing.md}px`,
    borderRadius: radius.md,
    border: 'none',
    background: '#5E4E8F',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  };
  const secondary: CSSProperties = {
    flex: 1,
    padding: `${spacing.md}px`,
    borderRadius: radius.md,
    border: 'none',
    background: palette.fill,
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  };
  return (
    <div style={{ display: 'flex', gap: spacing.sm }}>
      <button type="button" style={primary} onClick={onShare}>
        회고 공유하기
      </button>
      <button type="button" style={secondary} onClick={onInvite}>
        친구 초대
      </button>
    </div>
  );
}
