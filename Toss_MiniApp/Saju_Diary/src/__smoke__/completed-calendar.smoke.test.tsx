// @vitest-environment jsdom
/**
 * CompletedCalendar 렌더 스모크 — 완료 메모 캘린더(돌아보기 탭, #4·#5).
 *
 * - 완료 메모 seed → 월 그리드(요일 헤더 + 1~말일)가 throw 없이 렌더된다.
 * - 완료가 있는 날 칸은 접근성 라벨에 "완료한 일 있음", 일기 있는 날은 "일기 있음".
 * - 날짜 칸을 탭하면 그날 완료한 메모 목록 + (있으면) 일기 요약 패널이 보인다.
 * - 완료가 없는 달은 친절한 빈 상태 안내. (읽기 전용 — 저장/삭제 호출 0.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';

vi.mock('@apps-in-toss/web-framework', () => {
  const mem = new Map<string, string>();
  return {
    Storage: {
      getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
    },
  };
});

import { CompletedCalendar } from '../screens/review/CompletedCalendar';
import type { Diary, Memo } from '../types';
import { installMemoryStorage, resetStorage, renderApp } from './harness';

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  resetStorage();
  vi.clearAllMocks();
});

const COMPLETED: Memo[] = [
  { id: 'a', date: '2026-06-01', text: '우유 사기', checked: true, isTodo: true, completedDate: '2026-06-03' },
  { id: 'b', date: '2026-06-02', text: '운동하기', checked: true, isTodo: true, completedDate: '2026-06-03' },
  { id: 'c', date: '2026-06-10', text: '청소하기', checked: true, isTodo: true, completedDate: '2026-06-10' },
];

const DIARIES: Diary[] = [{ date: '2026-06-03', mood: 4, text: '좋은 하루였어요' }];

describe('CompletedCalendar 마운트', () => {
  it('완료 메모 seed로 월 그리드(요일 헤더 + 날짜)가 throw 없이 렌더된다', () => {
    expect(() =>
      renderApp(<CompletedCalendar memos={COMPLETED} diaries={DIARIES} yearMonth="2026-06" />),
    ).not.toThrow();
    // 섹션 제목(heading) + 날짜 칸.
    expect(screen.getByRole('heading', { name: '완료한 일 · 일기' })).toBeInTheDocument();
    expect(screen.getByLabelText('1일')).toBeInTheDocument();
    expect(screen.getByLabelText('30일')).toBeInTheDocument();
  });

  it('완료/일기가 있는 날 칸은 접근성 라벨로 표시된다', () => {
    renderApp(<CompletedCalendar memos={COMPLETED} diaries={DIARIES} yearMonth="2026-06" />);
    // 6/3: 완료 2건 + 일기 1건.
    expect(screen.getByLabelText('3일 (완료한 일 있음, 일기 있음)')).toBeInTheDocument();
    // 6/10: 완료만.
    expect(screen.getByLabelText('10일 (완료한 일 있음)')).toBeInTheDocument();
    // 6/1: 완료/일기 없음.
    expect(screen.getByLabelText('1일')).toBeInTheDocument();
  });

  it('날짜 칸을 탭하면 그날 완료 목록 + 일기 요약 패널이 보인다(크래시 0)', () => {
    renderApp(<CompletedCalendar memos={COMPLETED} diaries={DIARIES} yearMonth="2026-06" />);
    expect(() => fireEvent.click(screen.getByLabelText('3일 (완료한 일 있음, 일기 있음)'))).not.toThrow();
    // 상세 패널: 그날 완료한 일 + 일기 요약.
    expect(screen.getByText('6월 3일')).toBeInTheDocument();
    expect(screen.getByText('우유 사기')).toBeInTheDocument();
    expect(screen.getByText('운동하기')).toBeInTheDocument();
    expect(screen.getByText('좋은 하루였어요')).toBeInTheDocument();
  });

  it('완료가 없는 달도 빈 격자(달력)가 그대로 렌더된다(범례/안내문 없이)', () => {
    renderApp(<CompletedCalendar memos={COMPLETED} diaries={DIARIES} yearMonth="2026-09" />);
    // 완료/일기 점이 없어도 1~말일 격자는 정상 렌더(달력답게, #6).
    expect(screen.getByLabelText('1일')).toBeInTheDocument();
    expect(screen.getByLabelText('30일')).toBeInTheDocument();
    // 군더더기 범례 텍스트는 제거됨.
    expect(screen.queryByText('이 달에 완료한 일이 아직 없어요.')).not.toBeInTheDocument();
  });
});
