/**
 * SajuCharacter — 사주 캐릭터(인라인 SVG, 외부 이미지 0).
 *
 * 종류(kind) = 고양이/강아지/수달 중 사용자 선택. 1차 오행 = 몸 색(베이스), 2차 오행 = **귀 안쪽 색
 *   + 가슴 큰 메달(오행 색·심볼)** 으로 크게 드러낸다(보조속성 티 잘 나게). 결정론(traits/kind에서만 파생).
 * serene 톤과 어울리는 둥글둥글 귀여운 파스텔 라인아트. viewBox 120×120, size로 확대/축소.
 */
import { useId, type CSSProperties } from 'react';
import type { CharacterKind, WuXing } from '../../types';
import type { CharacterTraits } from './saju-character-traits';
import { ELEMENT_PALETTE, CHAR_GOLD, WUXING_KO, WUXING_EMOJI, type ElementColors } from './element-palette';

/** #RRGGBB 의 상대 휘도가 낮으면(어두우면) true — 칩/배지 글자색 대비용. */
export function isDarkColor(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // 인지 휘도(0~255)
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

const CX = 60;
const CY = 66;
const R = 31;
const NOSE = '#5A4658';
const INK = '#342B3E';
const MUZZLE_FILL = 'rgba(255,255,255,0.7)';

/** 오행 미니 심볼(메달 중심 ~60,94). 색=해당 오행 deep. */
function ElementGlyph({ element, color }: { element: WuXing; color: string }) {
  switch (element) {
    case '木':
      return <path d="M60 88 C54 91 54 98 60 100 C66 98 66 91 60 88 Z M60 90 L60 99" fill={color} stroke={color} strokeWidth={0.6} />;
    case '火':
      return <path d="M60 87 C56 92 58.5 94 58.5 96.5 C58.5 99 61.5 99 61.5 96.5 C61.5 94 64 92 60 87 Z" fill={color} />;
    case '土':
      return (
        <g fill={color} stroke={color}>
          <path d="M53 99 Q60 92 67 99 Z" strokeWidth={0.5} />
          <path d="M60 92 L60 87 M60 89 q3 -1 4 -3" fill="none" strokeWidth={1.6} strokeLinecap="round" />
        </g>
      );
    case '金':
      return <path d="M60 86 L62.4 92.4 L69 94 L62.4 95.6 L60 102 L57.6 95.6 L51 94 L57.6 92.4 Z" fill={color} />;
    case '水':
    default:
      return <path d="M60 86 C63.5 91.5 65 94.5 65 96.8 a5 5 0 1 1 -10 0 C55 94.5 56.5 91.5 60 86 Z" fill={color} />;
  }
}

/** 종류별 귀(몸 뒤에 먼저 그림). 바깥=1차 오행색, 안쪽=2차 오행색(보조 강조). */
function Ears({ kind, pal, pal2 }: { kind: CharacterKind; pal: ElementColors; pal2: ElementColors }) {
  if (kind === 'cat') {
    // 크고 뾰족한 삼각 귀(고양이 시그니처).
    return (
      <g stroke={pal.deep} strokeWidth={2.5} strokeLinejoin="round">
        <path d="M42 43 C38 35 34 20 31 10 C44 14 54 27 59 39 Z" fill={pal.base} />
        <path d="M78 43 C82 35 86 20 89 10 C76 14 66 27 61 39 Z" fill={pal.base} />
        <path d="M43 37 C41 31 39 23 37 18 C45 22 50 29 53 36 Z" fill={pal2.base} stroke={pal2.deep} strokeWidth={0.8} />
        <path d="M77 37 C79 31 81 23 83 18 C75 22 70 29 67 36 Z" fill={pal2.base} stroke={pal2.deep} strokeWidth={0.8} />
      </g>
    );
  }
  if (kind === 'dog') {
    // 머리 옆으로 축 늘어진 플로피 귀(강아지 시그니처).
    return (
      <g stroke={pal.deep} strokeWidth={2.5} strokeLinejoin="round">
        <path d="M45 39 C30 30 17 41 16 59 C15 77 25 96 38 95 C49 92 53 76 50 57 C49 48 50 42 45 39 Z" fill={pal.base} />
        <path d="M75 39 C90 30 103 41 104 59 C105 77 95 96 82 95 C71 92 67 76 70 57 C71 48 70 42 75 39 Z" fill={pal.base} />
        <path d="M34 50 C26 56 25 74 31 84 C38 83 42 66 40 55 C39 51 37 49 34 50 Z" fill={pal2.base} stroke={pal2.deep} strokeWidth={0.8} opacity={0.98} />
        <path d="M86 50 C94 56 95 74 89 84 C82 83 78 66 80 55 C81 51 83 49 86 50 Z" fill={pal2.base} stroke={pal2.deep} strokeWidth={0.8} opacity={0.98} />
      </g>
    );
  }
  // otter — 작고 동그란 귀(수달 시그니처: 큰 주둥이와 함께).
  return (
    <g stroke={pal.deep} strokeWidth={2.5}>
      <circle cx={41} cy={38} r={8.2} fill={pal.base} />
      <circle cx={79} cy={38} r={8.2} fill={pal.base} />
      <circle cx={41} cy={38} r={4.4} fill={pal2.base} stroke={pal2.deep} strokeWidth={0.8} />
      <circle cx={79} cy={38} r={4.4} fill={pal2.base} stroke={pal2.deep} strokeWidth={0.8} />
    </g>
  );
}

/** 종류별 주둥이/코/수염/입(mood). 눈/볼은 공용. */
function Muzzle({ kind, mood, deep }: { kind: CharacterKind; mood: 'good' | 'calm'; deep: string }) {
  const smile =
    mood === 'good' ? (
      <path d="M54 75 Q60 81 66 75" fill="none" stroke={NOSE} strokeWidth={2} strokeLinecap="round" />
    ) : (
      <path d="M56 76 L64 76" fill="none" stroke={NOSE} strokeWidth={2} strokeLinecap="round" />
    );

  if (kind === 'cat') {
    return (
      <g>
        <g stroke={deep} strokeWidth={1.4} strokeLinecap="round" opacity={0.32}>
          <path d="M52 48 Q55 52 58 48 M62 48 Q65 52 68 48" fill="none" />
          <path d="M60 46 L60 51" fill="none" />
        </g>
        <ellipse cx={55.7} cy={72.4} rx={6.1} ry={4.9} fill={MUZZLE_FILL} />
        <ellipse cx={64.3} cy={72.4} rx={6.1} ry={4.9} fill={MUZZLE_FILL} />
        {/* 수염 */}
        <g stroke={deep} strokeWidth={1.2} strokeLinecap="round" opacity={0.58}>
          <path d="M44 70 L30 67 M44 73 L30 74 M44 76 L31 81" fill="none" />
          <path d="M76 70 L90 67 M76 73 L90 74 M76 76 L89 81" fill="none" />
        </g>
        <path d="M56.6 69.5 L63.4 69.5 Q60 73.8 56.6 69.5 Z" fill={NOSE} />
        {mood === 'good' ? (
          <path d="M60 73.5 C58.4 77.6 55 77.6 53.8 75 M60 73.5 C61.6 77.6 65 77.6 66.2 75" fill="none" stroke={NOSE} strokeWidth={1.8} strokeLinecap="round" />
        ) : (
          smile
        )}
      </g>
    );
  }
  if (kind === 'dog') {
    return (
      <g>
        <ellipse cx={60} cy={75.5} rx={15.3} ry={10.5} fill={MUZZLE_FILL} stroke={deep} strokeWidth={1.15} opacity={0.98} />
        <ellipse cx={60} cy={70.8} rx={5.4} ry={3.9} fill={NOSE} />
        <path d="M60 73 L60 76" stroke={NOSE} strokeWidth={1.6} strokeLinecap="round" />
        {mood === 'good' ? (
          <>
            <path d="M60 76 Q60 81.5 54 80.5 M60 76 Q60 81.5 66 80.5" fill="none" stroke={NOSE} strokeWidth={1.8} strokeLinecap="round" />
            <path d="M57.1 80.4 Q60 87 62.9 80.4 Z" fill="#F28EA6" stroke={NOSE} strokeWidth={0.45} />
          </>
        ) : (
          <path d="M55 79 Q60 82 65 79" fill="none" stroke={NOSE} strokeWidth={1.8} strokeLinecap="round" />
        )}
        <circle cx={53.2} cy={74.4} r={0.85} fill={deep} opacity={0.36} />
        <circle cx={66.8} cy={74.4} r={0.85} fill={deep} opacity={0.36} />
      </g>
    );
  }
  // otter — 넓은 주둥이 + 큰 코 + 앞니 + 수염
  return (
    <g>
      <ellipse cx={60} cy={77.8} rx={18.5} ry={10.8} fill={MUZZLE_FILL} stroke={deep} strokeWidth={1.15} />
      <ellipse cx={53.7} cy={76.6} rx={8.6} ry={6.9} fill="rgba(255,255,255,0.42)" />
      <ellipse cx={66.3} cy={76.6} rx={8.6} ry={6.9} fill="rgba(255,255,255,0.42)" />
      <g stroke={deep} strokeWidth={1.15} strokeLinecap="round" opacity={0.54}>
        <path d="M45 74 L31 70 M45 77 L31 78 M45 80 L32 85" fill="none" />
        <path d="M75 74 L89 70 M75 77 L89 78 M75 80 L88 85" fill="none" />
      </g>
      <ellipse cx={60} cy={71.2} rx={6.2} ry={4.2} fill={NOSE} />
      <path d="M60 74.8 L60 79" stroke={NOSE} strokeWidth={1.7} strokeLinecap="round" />
      {mood === 'good' ? (
        <path d="M54.7 79.5 Q60 84.5 65.3 79.5" fill="none" stroke={NOSE} strokeWidth={1.8} strokeLinecap="round" />
      ) : (
        <path d="M56 80.5 L64 80.5" fill="none" stroke={NOSE} strokeWidth={1.8} strokeLinecap="round" />
      )}
      {/* 앞니 두 개(귀여움) */}
      <rect x={57.3} y={82} width={2.5} height={4} rx={0.9} fill="#FFFFFF" stroke={deep} strokeWidth={0.45} />
      <rect x={60.2} y={82} width={2.5} height={4} rx={0.9} fill="#FFFFFF" stroke={deep} strokeWidth={0.45} />
    </g>
  );
}

/** 2차 오행 — 가슴 큰 메달(코드 + 골드링 + 오행색 + 심볼 + 반짝이). 보조속성을 크게 드러낸다. */
function SecondaryMedal({ element }: { element: WuXing }) {
  const pal = ELEMENT_PALETTE[element];
  return (
    <g>
      {/* 목줄 */}
      <path d="M50.5 80 L60 86.2 M69.5 80 L60 86.2" stroke={pal.deep} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {/* 메달 오브 — 크게 + 골드 링 */}
      <circle cx={60} cy={87} r={3.5} fill="#FFF8DF" stroke={CHAR_GOLD} strokeWidth={1.6} />
      <circle cx={60} cy={95} r={14.8} fill={pal.base} stroke={CHAR_GOLD} strokeWidth={3.2} />
      <circle cx={60} cy={95} r={11.4} fill="#FFFFFF" opacity={0.2} />
      <circle cx={60} cy={95} r={14.8} fill="none" stroke={pal.deep} strokeWidth={1} opacity={0.48} />
      <g transform="translate(60 95) scale(1.24) translate(-60 -94)">
        <ElementGlyph element={element} color={pal.deep} />
      </g>
      {/* 반짝이 */}
      <path d="M43.5 89.2 l1.5 2.8 l3 0.7 l-3 0.7 l-1.5 2.8 l-1.5 -2.8 l-3 -0.7 l3 -0.7 Z" fill={CHAR_GOLD} opacity={0.9} />
      <path d="M76.5 89.5 l1.1 2 l2.2 0.55 l-2.2 0.55 l-1.1 2 l-1.1 -2 l-2.2 -0.55 l2.2 -0.55 Z" fill={CHAR_GOLD} opacity={0.82} />
    </g>
  );
}

export interface SajuCharacterProps {
  traits: CharacterTraits;
  /** 캐릭터 종류(고양이/강아지/수달). 기본 cat. */
  kind?: CharacterKind;
  /** 표정: good=환한 웃음, calm=잔잔. 기본 good. */
  mood?: 'good' | 'calm';
  /** 픽셀 크기(정사각). 기본 96. */
  size?: number;
  style?: CSSProperties;
}

export function SajuCharacter({ traits, kind = 'cat', mood = 'good', size = 96, style }: SajuCharacterProps) {
  const uid = useId().replace(/:/g, '');
  const pal = ELEMENT_PALETTE[traits.element];
  const pal2 = ELEMENT_PALETTE[traits.secondElement];

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={style} role="img" aria-label="내 사주 캐릭터">
      <defs>
        <radialGradient id={`body-${uid}`} cx="50%" cy="38%" r="72%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.6} />
          <stop offset="48%" stopColor={pal.base} />
          <stop offset="100%" stopColor={pal.deep} stopOpacity={0.88} />
        </radialGradient>
      </defs>

      {/* 뒤 글로우(라벤더) */}
      <circle cx={CX} cy={CY} r={41} fill="rgba(233,213,255,0.45)" />

      {/* 귀(몸 뒤) — 바깥 1차색 / 안쪽 2차색 */}
      <Ears kind={kind} pal={pal} pal2={pal2} />

      {/* 몸(둥근 얼굴) */}
      <circle cx={CX} cy={CY} r={R} fill={`url(#body-${uid})`} stroke={pal.deep} strokeWidth={2.4} />
      <circle cx={52} cy={53} r={10} fill="#FFFFFF" opacity={0.15} />

      {/* 볼터치 */}
      <ellipse cx={45.3} cy={72.5} rx={7.2} ry={4.6} fill={pal.cheek} opacity={0.88} transform="rotate(-7 45.3 72.5)" />
      <ellipse cx={74.7} cy={72.5} rx={7.2} ry={4.6} fill={pal.cheek} opacity={0.88} transform="rotate(7 74.7 72.5)" />
      <g stroke="#FFFFFF" strokeWidth={0.9} strokeLinecap="round" opacity={0.55}>
        <path d="M42.3 72.4 L38.9 71.5 M47.2 73.5 L43.6 76.2" fill="none" />
        <path d="M77.7 72.4 L81.1 71.5 M72.8 73.5 L76.4 76.2" fill="none" />
      </g>

      {/* 눈(크고 반짝) */}
      <g stroke={pal.deep} strokeWidth={0.45}>
        <ellipse cx={50} cy={61.7} rx={5.3} ry={5.9} fill={INK} />
        <ellipse cx={70} cy={61.7} rx={5.3} ry={5.9} fill={INK} />
        <circle cx={52} cy={59.2} r={1.8} fill="#FFFFFF" stroke="none" />
        <circle cx={72} cy={59.2} r={1.8} fill="#FFFFFF" stroke="none" />
        <circle cx={48.4} cy={64.4} r={1.05} fill="#FFFFFF" stroke="none" opacity={0.82} />
        <circle cx={68.4} cy={64.4} r={1.05} fill="#FFFFFF" stroke="none" opacity={0.82} />
        <path d="M45 55.8 Q50 53.2 55 55.8 M65 55.8 Q70 53.2 75 55.8" fill="none" strokeLinecap="round" opacity={0.38} />
      </g>

      {/* 주둥이/코/입(종류별) */}
      <Muzzle kind={kind} mood={mood} deep={pal.deep} />

      {/* 작은 앞발 */}
      <g stroke={pal.deep} strokeWidth={1.1} strokeLinecap="round" opacity={0.78}>
        <ellipse cx={43.5} cy={91} rx={6.8} ry={5.4} fill={pal.base} />
        <ellipse cx={76.5} cy={91} rx={6.8} ry={5.4} fill={pal.base} />
        <path d="M41.1 90.6 q2.4 2 4.8 0 M74.1 90.6 q2.4 2 4.8 0" fill="none" opacity={0.58} />
      </g>

      {/* 2차 오행 — 가슴 메달(크게) */}
      <SecondaryMedal element={traits.secondElement} />
    </svg>
  );
}

/**
 * 오행 라벨 칩 — "주 오행 🌳 나무 · 보조 오행 💧 물"을 색으로 구분해 누구나 알아보게.
 */
export function ElementTags({
  element,
  secondElement,
  size = 'md',
  align = 'center',
}: {
  element: WuXing;
  secondElement: WuXing;
  size?: 'sm' | 'md';
  align?: 'center' | 'start';
}) {
  const fs = size === 'sm' ? 11 : 12;
  const tag = (label: string, w: WuXing) => {
    const p = ELEMENT_PALETTE[w];
    // base 밝기에 따라 글자색 자동(진한 base=흰 글자, 밝은 base=먹 글자) — 水(남색) 같은 어두운 칩 가독성.
    const dark = isDarkColor(p.base);
    const fg = dark ? '#FFFFFF' : '#3A3340';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: size === 'sm' ? '2px 7px' : '3px 9px',
          borderRadius: 999,
          background: p.base,
          border: `1px solid ${p.deep}`,
          fontSize: fs,
          fontWeight: 800,
          color: fg,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontWeight: 700, opacity: dark ? 0.85 : 0.75 }}>{label}</span>
        <span aria-hidden>{WUXING_EMOJI[w]}</span>
        {WUXING_KO[w]}
      </span>
    );
  };
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: align === 'start' ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
      {tag('주 오행', element)}
      {tag('보조 오행', secondElement)}
    </div>
  );
}
