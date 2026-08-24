/**
 * TarotCardBack — 타로 카드 뒷면(인라인 SVG, 외부 이미지 0).
 *
 * 앞면(TarotCardFace)과 같은 200x320 좌표계, 라벤더 필드 + 고대비 골드 더블 프레임.
 * 중앙 문양은 결정론적 자체 제작 celestial/arcane ornament.
 */
import { useId } from 'react';

const GOLD = '#C5A358';
const DEEP_GOLD = '#F0C86A';
const LAVENDER_DEEP = '#5B397E';
const LAVENDER = '#7E58A4';

export interface TarotCardBackProps {
  /** 카드 폭(px). 높이는 TarotCardFace와 같은 8:5(2:3 근사) 비율로 자동. 기본 200. */
  width?: number;
}

export function TarotCardBack({ width = 200 }: TarotCardBackProps) {
  const uid = useId().replace(/:/g, '');
  const height = Math.round((width * 320) / 200);

  const rayLines = Array.from({ length: 16 }).map((_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const inner = i % 2 === 0 ? 28 : 34;
    const outer = i % 2 === 0 ? 56 : 48;
    const x1 = 100 + Math.cos(angle) * inner;
    const y1 = 160 + Math.sin(angle) * inner;
    const x2 = 100 + Math.cos(angle) * outer;
    const y2 = 160 + Math.sin(angle) * outer;
    return <path key={i} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`} />;
  });

  return (
    <svg width={width} height={height} viewBox="0 0 200 320" role="img" aria-label="타로 카드 뒷면">
      <defs>
        <linearGradient id={`tarot-back-bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={LAVENDER_DEEP} />
          <stop offset="52%" stopColor={LAVENDER} />
          <stop offset="100%" stopColor="#3F255F" />
        </linearGradient>
        <radialGradient id={`tarot-back-glow-${uid}`} cx="50%" cy="46%" r="58%">
          <stop offset="0%" stopColor="#D8B6FF" stopOpacity="0.34" />
          <stop offset="58%" stopColor="#8661B0" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#301D4E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x={4} y={4} width={192} height={312} rx={22} fill={`url(#tarot-back-bg-${uid})`} stroke={GOLD} strokeWidth={2.8} />
      <rect x={10} y={10} width={180} height={300} rx={17} fill={`url(#tarot-back-glow-${uid})`} stroke={DEEP_GOLD} strokeWidth={1.5} />
      <rect x={18} y={18} width={164} height={284} rx={12} fill="none" stroke={GOLD} strokeWidth={1.1} opacity={0.96} />

      <g stroke={DEEP_GOLD} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M36 56 C52 36 72 36 88 56 C72 50 52 50 36 56 Z" fill="rgba(240,200,106,0.2)" />
        <path d="M164 56 C148 36 128 36 112 56 C128 50 148 50 164 56 Z" fill="rgba(240,200,106,0.2)" />
        <path d="M36 264 C52 284 72 284 88 264 C72 270 52 270 36 264 Z" fill="rgba(240,200,106,0.2)" />
        <path d="M164 264 C148 284 128 284 112 264 C128 270 148 270 164 264 Z" fill="rgba(240,200,106,0.2)" />

        <path d="M100 38 L106 52 L121 54 L110 64 L113 79 L100 71 L87 79 L90 64 L79 54 L94 52 Z" fill="rgba(240,200,106,0.28)" />
        <path d="M100 241 L106 255 L121 257 L110 267 L113 282 L100 274 L87 282 L90 267 L79 257 L94 255 Z" fill="rgba(240,200,106,0.28)" />

        <path d="M44 104 C74 80 126 80 156 104" />
        <path d="M44 216 C74 240 126 240 156 216" />
        <path d="M50 124 C70 146 70 174 50 196" />
        <path d="M150 124 C130 146 130 174 150 196" />
      </g>

      <g stroke={DEEP_GOLD} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {rayLines}
        <circle cx={100} cy={160} r={30} fill="rgba(240,200,106,0.2)" />
        <circle cx={100} cy={160} r={14} fill="rgba(240,200,106,0.28)" />
        <path d="M100 100 C124 122 124 198 100 220 C76 198 76 122 100 100 Z" />
        <path d="M52 160 C74 136 126 136 148 160 C126 184 74 184 52 160 Z" />
        <path d="M74 112 C92 132 108 188 126 208" />
        <path d="M126 112 C108 132 92 188 74 208" />
        <path d="M86 160 C92 150 108 150 114 160 C108 170 92 170 86 160 Z" fill="rgba(240,200,106,0.34)" />
      </g>

      <g fill={DEEP_GOLD}>
        {[
          [36, 36],
          [164, 36],
          [36, 284],
          [164, 284],
          [54, 84],
          [146, 84],
          [54, 236],
          [146, 236],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.6} />
        ))}
      </g>
    </svg>
  );
}
