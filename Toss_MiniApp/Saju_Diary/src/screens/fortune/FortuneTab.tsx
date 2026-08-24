/**
 * FortuneTab — 운세 탭(간판). 상단 AppBar + SegTabs(오늘 운세 / 타로) 서브내비.
 *
 * 라우터 미사용 — 로컬 state로 서브뷰 전환(CRITICAL #5). 각 패널은 기존 화면을 embedded 모드로 임베드:
 *   오늘 운세 = FortuneScreen(상세, 운세 흐름 차트·오늘의 글귀 포함) · 타로 = TarotScreen.
 * '흐름'은 별도 탭에서 제거 — 흐름 차트가 '오늘 운세' 본문에 이미 들어있어 중복(요청 #7).
 * 생일 미입력이면 MY로 유도(막다른 길 방지).
 */
import { useState } from 'react';
import { AppBar, SegTabs, PillButton } from '../../components/ui';
import { peach, spacing, layout } from '../../theme/tokens';
import { TAB_BAR_HEIGHT } from '../../components';
import { FortuneScreen } from './FortuneScreen';
import { TarotScreen } from '../tarot/TarotScreen';
import type { CharacterKind, SajuInput } from '../../types';
import type { TabKey } from '..';

type Seg = 'today' | 'tarot';
const SEGS: readonly { key: Seg; label: string }[] = [
  { key: 'today', label: '오늘 운세' },
  { key: 'tarot', label: '타 로' },
];

export interface FortuneTabProps {
  saju?: SajuInput;
  characterKind?: CharacterKind;
  /** 사용자가 올린 커스텀 캐릭터 사진(data URL). */
  characterPhoto?: string;
  /** 진입 시 펼칠 서브탭(홈 '오늘의 타로' → 'tarot'). 기본 'today'. */
  initialSeg?: Seg;
  onNavigate?: (tab: TabKey) => void;
}

export function FortuneTab({ saju, characterKind, characterPhoto, initialSeg = 'today', onNavigate }: FortuneTabProps) {
  const [seg, setSeg] = useState<Seg>(initialSeg);
  const hasBirth = saju?.birthDate != null && saju.birthDate !== '';

  const root = {
    minHeight: '100vh',
    background: peach.surface,
    paddingBottom: `calc(${TAB_BAR_HEIGHT + 24}px + env(safe-area-inset-bottom, 0px))`,
    boxSizing: 'border-box' as const,
  };

  if (!hasBirth) {
    return (
      <div style={root}>
        <AppBar title="운세" />
        <div style={{ padding: `48px ${layout.screenPaddingX}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 44 }}>🔮</span>
          <div className="display-font" style={{ fontSize: 20, color: peach.onSurface }}>생일을 넣으면 오늘의 사주를 봐요</div>
          <p style={{ margin: 0, fontSize: 14, color: peach.onSurfaceVar }}>내 사주로 오늘의 운세·타로를 봐드려요.</p>
          <PillButton onClick={() => onNavigate?.('my')}>생일 넣으러 가기</PillButton>
        </div>
      </div>
    );
  }

  return (
    <div style={root}>
      <AppBar title="운세" />
      <div style={{ padding: `${spacing.sm}px ${layout.screenPaddingX}px ${spacing.md}px` }}>
        <SegTabs tabs={SEGS} value={seg} onChange={setSeg} />
      </div>

      {seg === 'today' ? (
        <FortuneScreen
          saju={saju}
          characterKind={characterKind}
          characterPhoto={characterPhoto}
          embedded
          onOpenTarot={() => {
            setSeg('tarot');
            if (typeof window !== 'undefined') window.scrollTo(0, 0);
          }}
        />
      ) : (
        <TarotScreen saju={saju!} embedded />
      )}
    </div>
  );
}
