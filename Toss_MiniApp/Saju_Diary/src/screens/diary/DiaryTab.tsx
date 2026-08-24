/**
 * DiaryTab — 기록 탭. 상단 AppBar + SegTabs(오늘 쓰기 / 모아보기).
 *
 * 오늘 쓰기 = DiaryScreen(손글씨 일기 에디터, 이미지 저장) · 모아보기 = ReviewScreen(월 캘린더·기분 그래프·요약).
 * 라우터 미사용 — 로컬 state 전환(CRITICAL #5). 각 패널은 embedded 모드로 자체 헤더를 숨긴다.
 */
import { useState } from 'react';
import { AppBar, SegTabs } from '../../components/ui';
import { peach, spacing, layout } from '../../theme/tokens';
import { TAB_BAR_HEIGHT } from '../../components';
import { DiaryScreen } from './DiaryScreen';
import { ReviewScreen } from '../review/ReviewScreen';

type Seg = 'write' | 'browse';
const SEGS: readonly { key: Seg; label: string }[] = [
  { key: 'write', label: '오늘 쓰기' },
  { key: 'browse', label: '모아보기' },
];

export function DiaryTab() {
  const [seg, setSeg] = useState<Seg>('write');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: peach.surface,
        paddingBottom: `calc(${TAB_BAR_HEIGHT + 24}px + env(safe-area-inset-bottom, 0px))`,
        boxSizing: 'border-box',
      }}
    >
      <AppBar title="기록" />
      <div style={{ padding: `${spacing.sm}px ${layout.screenPaddingX}px ${spacing.md}px` }}>
        <SegTabs tabs={SEGS} value={seg} onChange={setSeg} />
      </div>

      {seg === 'write' ? (
        <DiaryScreen embedded />
      ) : (
        <ReviewScreen embedded onGoToDiary={() => setSeg('write')} />
      )}
    </div>
  );
}
