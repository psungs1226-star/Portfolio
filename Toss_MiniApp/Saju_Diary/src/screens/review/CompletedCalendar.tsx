/**
 * CompletedCalendar — 완료한 일을 날짜별로 모아보는 월 캘린더(돌아보기 탭, #4·#5).
 *
 * 배경: 완료한 메모를 활성 목록(메모 위젯)에 계속 쌓으면 관리가 안 된다 →
 *   완료는 목록에서 빠지고(step2) 여기 **월 그리드 달력**에서 날짜별로 본다.
 *   일기와 같은 날짜 축이라 그날 일기 요약도 함께 보여준다.
 *
 * 규칙:
 *   - 라이브러리 없이 네이티브 7열 월 그리드(date-fns/캘린더 라이브러리 금지 — CRITICAL #5).
 *     날짜 산술·셀 구성은 순수 memo-calendar util(테스트 가능)에 위임한다.
 *   - 읽기 전용: 완료 메모를 여기서 변형/삭제하지 않는다(모아보기). 저장 호출 0.
 *   - 웹 React + inline style(cute 토큰 — 파스텔 소프트). RN 프리미티브 금지.
 *
 * 데이터는 호출부(ReviewScreen)가 loadMemos/loadDiaries로 읽어 props로 넘긴다.
 */
import { useMemo, useState, type CSSProperties } from 'react';
import type { Diary, Memo, DateString } from '../../types';
import { Card, SectionTitle } from '../../components';
import { palette, spacing, radius, cute, warm } from '../../theme/tokens';
import { diaryForDate } from '../diary/diary-ops';
import { completedTodosForDate } from '../../widgets/memo-ops';
import { todayDateString } from '../../features/fortune/manse';
import type { YearMonth } from './review-stats';
import {
  monthGridCells,
  daysWithCompleted,
  daysWithDiary,
} from './memo-calendar';

/** 요일 헤더(일요일 시작 — monthGridCells와 동일 기준). */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 주말 색: 일요일=빨강, 토요일=파랑(#7). 평일은 기본 텍스트색. */
const SUNDAY_COLOR = '#EF4444';
const SATURDAY_COLOR = '#2563EB';
/** 열 인덱스(0=일 … 6=토) → 요일 색(평일은 null = 기본색). */
function weekdayColor(col: number): string | null {
  if (col === 0) return SUNDAY_COLOR;
  if (col === 6) return SATURDAY_COLOR;
  return null;
}

export interface CompletedCalendarProps {
  /** 전체 메모(읽기 전용 — 완료분만 캘린더에 쓴다). */
  memos: Memo[];
  /** 전체 일기(읽기 전용 — 날짜 점·요약에 쓴다). */
  diaries: Diary[];
  /** 표시 중인 달(`YYYY-MM`). 월 이동은 ReviewScreen의 월 선택과 공유한다. */
  yearMonth: YearMonth;
}

/** 일기 미리보기(한 줄, 본문이 비면 '기분만 기록한 날'). DiaryRow와 동일 규칙. */
function diaryPreview(text: string): string {
  const trimmed = text.trim();
  if (trimmed === '') {
    return '기분만 기록한 날';
  }
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

export function CompletedCalendar({ memos, diaries, yearMonth }: CompletedCalendarProps) {
  const cells = useMemo(() => monthGridCells(yearMonth), [yearMonth]);
  const completedDays = useMemo(() => daysWithCompleted(memos, yearMonth), [memos, yearMonth]);
  const diaryDays = useMemo(() => daysWithDiary(diaries, yearMonth), [diaries, yearMonth]);
  // 오늘(이 달이면 해당 일을 코랄 링으로 강조).
  const todayStr = todayDateString();
  const todayDay = todayStr.startsWith(yearMonth) ? Number(todayStr.slice(8, 10)) : null;

  // 선택한 날짜(상세 패널). 달이 바뀌면 자연스럽게 비운다.
  const [selected, setSelected] = useState<DateString | null>(null);
  // 달 변경 시 다른 달의 선택이 남지 않도록 보정(파생값으로 무효화).
  const activeSelected = selected != null && selected.startsWith(yearMonth) ? selected : null;

  const selectedCompleted = useMemo(
    () => (activeSelected == null ? [] : completedTodosForDate(memos, activeSelected)),
    [memos, activeSelected],
  );
  const selectedDiary = useMemo(
    () => (activeSelected == null ? null : diaryForDate(diaries, activeSelected)),
    [diaries, activeSelected],
  );

  return (
    <Card>
      <SectionTitle size="t6">완료한 일 · 일기</SectionTitle>

      {cells.length === 0 ? (
        <div style={emptyTextStyle}>달력을 표시할 수 없어요.</div>
      ) : (
        <>
          {/* 달력 프레임(크림 종이 + 격자감) — "달력답게" 보이도록 테두리/배경을 준다(#6). */}
          <div style={calendarFrameStyle}>
            {/* 요일 헤더 */}
            <div style={{ ...gridStyle, marginBottom: 4, paddingBottom: 4, borderBottom: `1px solid ${warm.line}` }} aria-hidden>
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  style={{
                    ...weekdayStyle,
                    color: weekdayColor(i) ?? palette.textSecondary,
                  }}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={gridStyle}>
              {cells.map((cell, idx) => {
                if (cell.day == null) {
                  return <div key={`pad-${idx}`} style={padCellStyle} />;
                }
                const done = completedDays.has(cell.day);
                const hasDiary = diaryDays.has(cell.day);
                const isSelected = activeSelected === cell.date;
                const isToday = todayDay === cell.day;
                // 주말 색(일=빨강·토=파랑, #7). 선택/완료 칸은 코랄 강조색.
                const dayColor = isSelected || done ? cute.lavender : weekdayColor(idx % 7) ?? palette.textPrimary;
                return (
                  <button
                    key={cell.date as string}
                    type="button"
                    onClick={() => setSelected(cell.date)}
                    aria-label={dayAriaLabel(cell.day, done, hasDiary)}
                    aria-pressed={isSelected}
                    style={dayCellStyle(done, isSelected, isToday)}
                  >
                    <span style={{ fontSize: 13, fontWeight: done || isToday ? 800 : 500, lineHeight: 1, color: dayColor }}>
                      {cell.day}
                    </span>
                    {/* 일기 표식만 점으로(완료는 칸 채움으로 구분 → 범례 불필요). */}
                    <span style={dotRowStyle}>
                      {hasDiary && <span style={dotStyle(cute.peach)} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 선택한 날짜 상세 패널(읽기 전용) */}
          {activeSelected != null && (
            <DayDetail
              date={activeSelected}
              completed={selectedCompleted}
              diary={selectedDiary}
            />
          )}
        </>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// 선택한 날짜 상세 — 그날 완료한 일 + (있으면) 일기 요약
// ─────────────────────────────────────────────────────────────

function DayDetail({
  date,
  completed,
  diary,
}: {
  date: DateString;
  completed: Memo[];
  diary: Diary | null;
}) {
  return (
    <div style={detailStyle}>
      <div style={{ fontSize: 13, fontWeight: 800, color: palette.textPrimary }}>
        {detailDayLabel(date)}
      </div>

      {/* 그날 완료한 일 */}
      {completed.length > 0 ? (
        <ul style={listResetStyle}>
          {completed.map((m) => (
            <li key={m.id} style={completedItemStyle}>
              <span style={{ color: cute.lavender, fontSize: 13 }}>✓</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: palette.textPrimary }}>
                {m.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 12, color: palette.textTertiary }}>완료한 일이 없어요.</div>
      )}

      {/* 일기 요약(있으면) */}
      {diary != null && (
        <div style={diarySummaryStyle}>
          <span style={{ fontSize: 11, fontWeight: 700, color: cute.peach }}>일기</span>
          <span style={{ fontSize: 12, color: palette.textSecondary }}>
            {diaryPreview(diary.text)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 라벨 유틸(순수 표현)
// ─────────────────────────────────────────────────────────────

/** `YYYY-MM-DD` → '6월 14일'. */
function detailDayLabel(date: DateString): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일`;
}

/** 날짜 칸 접근성 라벨. */
function dayAriaLabel(day: number, done: boolean, hasDiary: boolean): string {
  const tags: string[] = [];
  if (done) tags.push('완료한 일 있음');
  if (hasDiary) tags.push('일기 있음');
  return tags.length > 0 ? `${day}일 (${tags.join(', ')})` : `${day}일`;
}

// ─────────────────────────────────────────────────────────────
// 스타일(파스텔 소프트 — cute 토큰)
// ─────────────────────────────────────────────────────────────

/** 달력 프레임 — 크림 종이 카드 안에서 격자감을 주는 안쪽 박스(#6 "달력답게"). */
const calendarFrameStyle: CSSProperties = {
  marginTop: spacing.sm,
  padding: spacing.sm,
  borderRadius: radius.md,
  background: warm.paper,
  border: `1px solid ${warm.line}`,
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 3,
};

const weekdayStyle: CSSProperties = {
  textAlign: 'center',
  fontSize: 11,
  fontWeight: 800,
  padding: `2px 0`,
};

const padCellStyle: CSSProperties = {
  aspectRatio: '1 / 1',
};

function dayCellStyle(done: boolean, selected: boolean, isToday: boolean): CSSProperties {
  return {
    aspectRatio: '1 / 1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    // 선택=코랄 테두리 / 오늘=옅은 코랄 링 / 그 외=투명(격자 배경 위에 떠 보이게).
    border: selected
      ? `2px solid ${cute.lavender}`
      : isToday
        ? `1.5px solid ${cute.lavender}`
        : '1.5px solid transparent',
    borderRadius: radius.sm,
    // 완료한 날은 코랄 틴트로 칸을 채워 한눈에(범례 없이 구분, #6). 그 외는 흰 칸(격자감).
    background: selected ? cute.lavenderBg : done ? cute.lavenderBg : warm.card,
    color: palette.textPrimary,
    cursor: 'pointer',
    padding: 0,
  };
}

const dotRowStyle: CSSProperties = {
  display: 'flex',
  gap: 2,
  height: 5,
  alignItems: 'center',
};

function dotStyle(color: string): CSSProperties {
  return {
    display: 'inline-block',
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  };
}

const emptyTextStyle: CSSProperties = {
  padding: `${spacing.lg}px 0`,
  color: palette.textTertiary,
  fontSize: 13,
  textAlign: 'center',
};

const detailStyle: CSSProperties = {
  marginTop: spacing.md,
  padding: spacing.md,
  borderRadius: radius.cute,
  background: cute.lavenderBg,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
};

const listResetStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.xs,
};

const completedItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: spacing.xs,
};

const diarySummaryStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: spacing.xs,
  paddingTop: spacing.xs,
  borderTop: `1px solid ${palette.border}`,
};
