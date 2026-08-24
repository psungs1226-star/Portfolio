/**
 * PartIcon — 시간대(아침/낮/저녁/밤) 골드 라인아트 아이콘(자체 인라인 SVG, 이모지 X).
 * 홈 운세 위젯(DayPartStrip)과 운세 상세(시간대별 기운 타임라인)에서 공통으로 쓴다.
 * 떠오르는 해 · 한낮 해 · 지는 해 · 초승달+별. 색은 골드(파스텔 위 대비 ↑).
 */
import type { DayPart } from '../../types';

export function PartIcon({ part, size = 24 }: { part: DayPart; size?: number }) {
  const g = '#B0891C'; // 진한 골드(파스텔 위 대비 ↑)
  const soft = 'rgba(197, 163, 88, 0.22)';
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: g,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (part) {
    case 'morning': // 떠오르는 해(지평선 위 반원 + 위로 솟는 빛살)
      return (
        <svg {...base} aria-hidden>
          <line x1="3" y1="18.5" x2="21" y2="18.5" />
          <path d="M7 18.5a5 5 0 0 1 10 0z" fill={soft} />
          <line x1="12" y1="4.5" x2="12" y2="7.5" />
          <line x1="5.5" y1="8" x2="7.2" y2="9.7" />
          <line x1="18.5" y1="8" x2="16.8" y2="9.7" />
        </svg>
      );
    case 'day': // 한낮 해(원 + 사방 빛살)
      return (
        <svg {...base} aria-hidden>
          <circle cx="12" cy="12" r="4.2" fill={soft} />
          <line x1="12" y1="2.5" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="21.5" />
          <line x1="2.5" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="21.5" y2="12" />
          <line x1="5.2" y1="5.2" x2="6.9" y2="6.9" />
          <line x1="17.1" y1="17.1" x2="18.8" y2="18.8" />
          <line x1="18.8" y1="5.2" x2="17.1" y2="6.9" />
          <line x1="6.9" y1="17.1" x2="5.2" y2="18.8" />
        </svg>
      );
    case 'evening': // 지는 해(지평선 + 채운 반원 + 아래 화살)
      return (
        <svg {...base} aria-hidden>
          <line x1="3" y1="18.5" x2="21" y2="18.5" />
          <path d="M7 18.5a5 5 0 0 1 10 0z" fill={soft} />
          <line x1="12" y1="9.5" x2="12" y2="6" />
          <path d="M10 8l2 2 2-2" />
        </svg>
      );
    case 'night': // 초승달 + 별
    default:
      return (
        <svg {...base} aria-hidden>
          <path d="M17 14.2A6 6 0 1 1 10 7a4.6 4.6 0 0 0 7 7.2z" fill={soft} />
          <path d="M18.3 4.6l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill={g} stroke="none" />
        </svg>
      );
  }
}
