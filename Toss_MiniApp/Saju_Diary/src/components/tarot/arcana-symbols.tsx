/**
 * arcana-symbols — 메이저 아르카나 22장 상징(골드 라인아트, 인라인 SVG).
 *
 * 외부 타로 이미지(라이더-웨이트 등) IP 리스크 0(CRITICAL #2) → 자체 추상 라인아트.
 * 좌표계: viewBox 0 0 200 320 안에서 중심 (100,132) 기준 ±~54. 골드 stroke, fill none 기본.
 * 카드 0~21과 1:1(data/tarot.json 메이저 아르카나 순서).
 */
import type { JSX } from 'react';

const GOLD = '#C5A358';
const S = {
  stroke: GOLD,
  strokeWidth: 2.6,
  fill: 'none' as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};
const THIN = { ...S, strokeWidth: 1.6 };
/** 옅은 골드 채움(상징 강조용). */
const FILL = 'rgba(197,163,88,0.18)';

function Sparkles() {
  return (
    <>
      <path d="M60 96 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 l9 -4 Z" fill={FILL} />
      <path d="M140 168 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" fill={FILL} />
    </>
  );
}

function EightPointStar({ cx, cy, r1, r2 }: { cx: number; cy: number; r1: number; r2: number }) {
  const points = Array.from({ length: 16 })
    .map((_, i) => {
      const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? r1 : r2;
      return `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
    })
    .join(' ');

  return <polygon points={points} fill={FILL} />;
}

function SunRays() {
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = 100 + Math.cos(angle) * 26;
        const y1 = 134 + Math.sin(angle) * 26;
        const x2 = 100 + Math.cos(angle) * 44;
        const y2 = 134 + Math.sin(angle) * 44;
        return <path key={i} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`} />;
      })}
    </>
  );
}

/** index(0~21) → 상징 라인아트. 범위 밖이면 기본 별. */
export function ArcanaSymbol({ index }: { index: number }): JSX.Element {
  switch (index) {
    case 0: // 바보 — 봇짐 막대, 길, 별
      return (
        <g {...S}>
          <Sparkles />
          <path d="M66 176 C82 158 104 150 134 148" {...THIN} />
          <path d="M76 166 L126 94" />
          <path d="M126 94 C143 91 145 110 128 114 C119 111 119 99 126 94 Z" fill={FILL} />
          <path d="M92 142 q14 18 30 10" />
          <circle cx={84} cy={164} r={5} fill={GOLD} stroke="none" />
        </g>
      );
    case 1: // 마법사 — 무한대, 지팡이, 사원
      return (
        <g {...S}>
          <path d="M77 111 q-15 -17 0 -17 q14 0 23 18 q9 18 23 18 q15 0 0 -17 q-14 -17 -23 0 q-9 18 -23 -2 Z" />
          <path d="M100 93 L100 174" />
          <path d="M82 174 L118 174" />
          <path d="M72 145 L128 145" {...THIN} />
          <circle cx={100} cy={132} r={8} fill={FILL} />
          <path d="M88 118 L112 118 M88 158 L112 158" {...THIN} />
        </g>
      );
    case 2: // 여사제 — 달, 기둥, 베일
      return (
        <g {...S}>
          <path d="M76 96 L76 174 M124 96 L124 174" />
          <path d="M84 98 C102 118 102 152 84 172" {...THIN} />
          <path d="M116 98 C98 118 98 152 116 172" {...THIN} />
          <path d="M114 102 a34 34 0 1 0 0 68 a25 25 0 1 1 0 -68 Z" fill={FILL} />
          <path d="M82 184 q18 12 36 0" />
        </g>
      );
    case 3: // 여황제 — 꽃, 씨앗, 금성
      return (
        <g {...S}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = 100 + Math.cos(a) * 24;
            const y = 128 + Math.sin(a) * 24;
            return <ellipse key={i} cx={x} cy={y} rx={10} ry={19} transform={`rotate(${(a * 180) / Math.PI + 90} ${x} ${y})`} fill={FILL} />;
          })}
          <circle cx={100} cy={128} r={8} fill={GOLD} stroke="none" />
          <path d="M100 152 L100 182 M86 168 L114 168" />
          <path d="M78 184 C92 174 108 174 122 184" {...THIN} />
        </g>
      );
    case 4: // 황제 — 왕관, 방패, 산
      return (
        <g {...S}>
          <path d="M66 144 L66 103 L83 125 L100 94 L117 125 L134 103 L134 144 Z" fill={FILL} />
          <path d="M66 144 L134 144 L126 176 L74 176 Z" />
          <path d="M82 156 L100 140 L118 156" {...THIN} />
          <path d="M74 96 L126 96" {...THIN} />
          <circle cx={100} cy={94} r={4} fill={GOLD} stroke="none" />
        </g>
      );
    case 5: // 교황 — 삼중 십자, 열쇠
      return (
        <g {...S}>
          <path d="M100 88 L100 178" />
          <path d="M83 108 L117 108 M78 126 L122 126 M87 144 L113 144" />
          <path d="M76 178 C84 164 92 164 100 178 C108 164 116 164 124 178" fill={FILL} />
          <circle cx={82} cy={150} r={7} />
          <path d="M87 155 L103 171 M103 171 L112 162 M103 171 L96 178" {...THIN} />
        </g>
      );
    case 6: // 연인 — 쌍심장, 연결 리본, 별
      return (
        <g {...S}>
          <path d="M84 114 c-9 -12 -27 -4 -27 10 c0 14 27 30 27 30 c0 0 27 -16 27 -30 c0 -14 -18 -22 -27 -10 Z" fill={FILL} />
          <path d="M116 130 c-8 -11 -24 -3 -24 9 c0 13 24 27 24 27 c0 0 24 -14 24 -27 c0 -12 -16 -20 -24 -9 Z" fill={FILL} />
          <path d="M82 168 C92 182 108 182 118 168" />
          <path d="M100 91 l5 11 l12 2 l-9 8 l2 12 l-10 -6 l-10 6 l2 -12 l-9 -8 l12 -2 Z" fill={FILL} />
        </g>
      );
    case 7: // 전차 — 전차, 별바퀴, 말갈기
      return (
        <g {...S}>
          <path d="M70 114 L130 114 L120 168 L80 168 Z" fill={FILL} />
          <path d="M78 104 L122 104 L112 92 L88 92 Z" />
          <circle cx={82} cy={176} r={10} />
          <circle cx={118} cy={176} r={10} />
          <path d="M82 166 L82 186 M72 176 L92 176 M118 166 L118 186 M108 176 L128 176" {...THIN} />
          <path d="M88 128 C98 138 102 138 112 128" />
          <path d="M62 136 C72 126 76 138 72 150 M138 136 C128 126 124 138 128 150" {...THIN} />
        </g>
      );
    case 8: // 힘 — 무한대, 사자 갈기, 온화한 입
      return (
        <g {...S}>
          <path d="M77 105 q-15 -17 0 -17 q14 0 23 18 q9 18 23 18 q15 0 0 -17 q-14 -17 -23 0 q-9 18 -23 -2 Z" />
          <circle cx={100} cy={145} r={26} fill={FILL} />
          <path d="M70 145 C76 112 124 112 130 145 C124 178 76 178 70 145 Z" />
          <path d="M86 144 q14 18 28 0" />
          <circle cx={90} cy={138} r={3} fill={GOLD} stroke="none" />
          <circle cx={110} cy={138} r={3} fill={GOLD} stroke="none" />
        </g>
      );
    case 9: // 은둔자 — 등불, 산길, 별
      return (
        <g {...S}>
          <path d="M100 88 L100 99" />
          <path d="M84 99 L116 99 L123 158 L77 158 Z" fill={FILL} />
          <circle cx={100} cy={128} r={10} fill="rgba(197,163,88,0.32)" />
          <path d="M88 128 L112 128 M100 116 L100 140" {...THIN} />
          <path d="M72 178 C88 160 112 160 128 178" />
          <path d="M128 96 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 l9 -4 Z" fill={FILL} />
        </g>
      );
    case 10: // 운명의 수레바퀴 — 회전륜, 사방 표식
      return (
        <g {...S}>
          <circle cx={100} cy={134} r={38} />
          <circle cx={100} cy={134} r={14} fill={FILL} />
          <path d="M100 96 L100 172 M62 134 L138 134 M73 107 L127 161 M127 107 L73 161" />
          <path d="M100 86 l5 10 l11 2 l-8 8 l2 11 l-10 -5 l-10 5 l2 -11 l-8 -8 l11 -2 Z" fill={FILL} />
          <circle cx={62} cy={134} r={4} fill={GOLD} stroke="none" />
          <circle cx={138} cy={134} r={4} fill={GOLD} stroke="none" />
        </g>
      );
    case 11: // 정의 — 저울, 검, 중심축
      return (
        <g {...S}>
          <path d="M100 88 L100 182" />
          <path d="M72 112 L128 112" />
          <path d="M72 112 l-14 28 a16 9 0 0 0 28 0 Z" fill={FILL} />
          <path d="M128 112 l-14 28 a16 9 0 0 0 28 0 Z" fill={FILL} />
          <path d="M90 182 L110 182" />
          <path d="M100 88 L108 102 L100 98 L92 102 Z" fill={FILL} />
          <circle cx={100} cy={112} r={4} fill={GOLD} stroke="none" />
        </g>
      );
    case 12: // 매달린 사람 — 매듭, 역삼각, 발목 고리
      return (
        <g {...S}>
          <path d="M70 95 L130 95" />
          <path d="M100 95 C94 104 94 112 100 120 C106 112 106 104 100 95 Z" fill={FILL} />
          <path d="M74 118 L126 118 L100 176 Z" fill={FILL} />
          <path d="M100 120 L100 176" />
          <path d="M84 152 C96 142 104 142 116 152" {...THIN} />
          <circle cx={100} cy={112} r={7} />
        </g>
      );
    case 13: // 죽음(변화) — 나비, 낫, 새싹
      return (
        <g {...S}>
          <path d="M100 132 C70 96 56 132 94 145 Z" fill={FILL} />
          <path d="M100 132 C130 96 144 132 106 145 Z" fill={FILL} />
          <path d="M100 132 C72 166 70 132 96 130 Z" fill={FILL} />
          <path d="M100 132 C128 166 130 132 104 130 Z" fill={FILL} />
          <path d="M100 104 L100 166" />
          <path d="M122 95 C92 115 82 150 78 181" />
          <path d="M86 181 C96 166 104 166 114 181" {...THIN} />
        </g>
      );
    case 14: // 절제 — 두 잔, 흐름, 날개
      return (
        <g {...S}>
          <path d="M72 112 a16 9 0 0 0 32 0 L100 142 L76 142 Z" fill={FILL} />
          <path d="M96 160 a16 9 0 0 0 32 0 L124 190 L100 190 Z" fill={FILL} />
          <path d="M88 116 C118 132 92 146 112 158" />
          <path d="M72 142 C58 126 58 108 76 98" {...THIN} />
          <path d="M128 160 C144 144 144 126 126 116" {...THIN} />
          <circle cx={100} cy={134} r={4} fill={GOLD} stroke="none" />
        </g>
      );
    case 15: // 악마 — 뿔, 사슬, 역오각성
      return (
        <g {...S}>
          <path d="M70 94 C78 122 91 130 100 130 C109 130 122 122 130 94" />
          <path d="M80 117 C72 132 74 154 90 168" />
          <path d="M120 117 C128 132 126 154 110 168" />
          <circle cx={90} cy={140} r={4} fill={GOLD} stroke="none" />
          <circle cx={110} cy={140} r={4} fill={GOLD} stroke="none" />
          <path d="M86 158 q14 14 28 0" />
          <path d="M100 177 L108 158 L128 158 L112 147 L118 128 L100 140 L82 128 L88 147 L72 158 L92 158 Z" {...THIN} />
        </g>
      );
    case 16: // 탑 — 탑, 번개, 떨어지는 불꽃
      return (
        <g {...S}>
          <path d="M82 178 L86 110 L114 110 L118 178 Z" fill={FILL} />
          <path d="M80 110 L100 92 L120 110" />
          <path d="M105 112 L92 136 L103 136 L90 164" />
          <path d="M86 128 L114 128 M84 148 L116 148" {...THIN} />
          <path d="M64 116 l5 11 l11 3 l-9 7 l1 12 l-8 -9 l-11 4 l6 -11 l-7 -10 Z" fill={FILL} />
          <path d="M136 150 l4 9 l9 3 l-8 6 l1 10 l-7 -7 l-10 3 l5 -9 l-6 -8 Z" fill={FILL} />
        </g>
      );
    case 17: // 별 — 큰 별, 물결, 작은 별들
      return (
        <g {...S}>
          <EightPointStar cx={100} cy={118} r1={32} r2={10} />
          <path d="M70 172 C86 158 114 186 130 172" />
          <path d="M68 188 C86 174 114 202 132 188" {...THIN} />
          <path d="M62 138 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 l9 -4 Z" fill={FILL} />
          <path d="M138 144 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" fill={FILL} />
        </g>
      );
    case 18: // 달 — 초승달, 두 기둥, 물방울
      return (
        <g {...S}>
          <path d="M116 92 a40 40 0 1 0 0 80 a29 29 0 1 1 0 -80 Z" fill={FILL} />
          <path d="M70 130 L70 178 M130 130 L130 178" />
          <path d="M58 178 C76 164 84 164 100 178 C116 164 124 164 142 178" {...THIN} />
          <path d="M88 188 c0 -8 8 -14 8 -14 s8 6 8 14 a8 8 0 0 1 -16 0 Z" fill={FILL} />
          <circle cx={84} cy={154} r={2.8} fill={GOLD} stroke="none" />
          <circle cx={118} cy={154} r={2.8} fill={GOLD} stroke="none" />
        </g>
      );
    case 19: // 태양 — 원, 얼굴, 광선
      return (
        <g {...S}>
          <SunRays />
          <circle cx={100} cy={134} r={24} fill={FILL} />
          <circle cx={91} cy={130} r={2.8} fill={GOLD} stroke="none" />
          <circle cx={109} cy={130} r={2.8} fill={GOLD} stroke="none" />
          <path d="M91 143 q9 8 18 0" />
          <path d="M68 184 C84 170 116 170 132 184" {...THIN} />
        </g>
      );
    case 20: // 심판 — 나팔, 떠오르는 문, 광선
      return (
        <g {...S}>
          <path d="M64 180 q36 -38 72 0" fill={FILL} />
          <path d="M84 126 L126 102 L126 120 L90 142 Z" fill={FILL} />
          <path d="M82 125 L70 112" />
          <path d="M104 118 L116 140" {...THIN} />
          <path d="M100 82 L100 104 M76 94 L88 112 M124 94 L112 112" />
          <path d="M88 164 L88 184 M112 164 L112 184" {...THIN} />
        </g>
      );
    case 21: // 세계 — 화환, 사방 점, 완성 리본
      return (
        <g {...S}>
          <ellipse cx={100} cy={134} rx={34} ry={48} fill={FILL} />
          <path d="M73 104 C88 88 112 88 127 104" />
          <path d="M73 164 C88 180 112 180 127 164" />
          <path d="M76 116 C88 126 88 142 76 152" {...THIN} />
          <path d="M124 116 C112 126 112 142 124 152" {...THIN} />
          <circle cx={100} cy={80} r={4} fill={GOLD} stroke="none" />
          <circle cx={100} cy={188} r={4} fill={GOLD} stroke="none" />
          <circle cx={54} cy={134} r={4} fill={GOLD} stroke="none" />
          <circle cx={146} cy={134} r={4} fill={GOLD} stroke="none" />
          <path d="M88 134 L100 122 L112 134 L100 146 Z" fill="rgba(197,163,88,0.26)" />
        </g>
      );
    default: // 폴백 — 별
      return (
        <g {...S}>
          <EightPointStar cx={100} cy={132} r1={38} r2={13} />
        </g>
      );
  }
}
