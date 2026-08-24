/**
 * FortuneScreen — 별도 운세 화면(App 풀스크린 오버레이로 열림).
 *
 * 톤앤매너: ref/DESIGN.md(Aetheria Wellness) "에테리얼 에디토리얼" — 라벤더 글래스모피즘 +
 *   보라(primary) 제목 + 골드 액센트 + serif 제목 + 원형 스코어 게이지 + 타임라인 시간대별 +
 *   Zen 인용구. 단, 세로 높이는 최대한 압축한다(사용자 요청 — ref의 넓은 여백을 줄임).
 *   외부 폰트/이미지 로드 없이(CRITICAL #2·#5) 시스템 serif + 인라인 SVG/CSS로 분위기만 차용.
 *
 * 상단 뒤로가기(onClose)로 닫는다. 라우터/제스처/애니메이션 라이브러리 미사용(CRITICAL #5).
 * 계산은 computeTodayFortune 재사용(만세력/점수 재구현 금지, CRITICAL #1). 산출은 메모리.
 * 웹 React + TDS(Rating) + inline style(토큰 참조). RN 프리미티브 금지.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { spacing, radius, serene, accent, typography } from '../../theme/tokens';
import type {
  CharacterKind,
  DayPart,
  Direction,
  FortuneResult,
  FortuneStance,
  LuckyColor,
  NatalChart,
  SajuInput,
} from '../../types';
import { computeNatal, todayDateString } from '../../features/fortune/manse';
import {
  buildOverallEnergyLine,
  computeTodayFortune,
  type FortuneDetailText,
  type TodayFortune,
} from '../../widgets/fortune-today';
import { FortuneTrend } from '../../widgets/FortuneTrend';
import { ElementTags } from '../../components/character/SajuCharacter';
import { SajuMascot } from '../../components/character/SajuMascot';
import { PartIcon } from '../../components/fortune/PartIcon';
import { characterTraits, type CharacterTraits } from '../../components/character/saju-character-traits';
import {
  STANCE_HEARTS,
  STANCE_VIS,
  HEART_FILL,
  HEART_EMPTY,
} from '../../features/fortune/fortune-level';

/** 행운색 → 스와치 hex(또렷하되 톤앤매너 안에서 살짝 정제된 채도). */
const LUCKY_COLOR_HEX: Record<LuckyColor, string> = {
  초록: '#4Fae7b',
  빨강: '#e85c4a',
  노랑: '#f0b429',
  흰색: '#f3ece7',
  검정: '#574c46',
};

/** 방위 → 한 줄 표기. */
function directionLabel(d: Direction): string {
  return d === '중앙' ? '중앙' : `${d}쪽`;
}

/** 시간대(아침/낮/저녁/밤) 메타 — 실제 시간 범위(이모지 없음, ref 톤). */
const PART_INFO: Record<DayPart, { range: string }> = {
  morning: { range: '오전 5–11시' },
  day: { range: '낮 11–17시' },
  evening: { range: '저녁 17–23시' },
  night: { range: '밤 23–5시' },
};

/**
 * stance → 타임라인 점 색(ref 톤). 이모지/라벨 없이 점 색 + 하트로 기운 정도를 표현한다.
 * favor=골드(좋은 기운), neutral=라벤더(무난), avoid=소프트 로즈(완급).
 */
/** 기운 정도 하트(채움 level/3) — 선명한 로즈레드(serene 강조). */
function Hearts({ stance }: { stance: FortuneStance }) {
  const level = STANCE_HEARTS[stance];
  return (
    <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 2, fontSize: 16, lineHeight: 1 }} aria-label={`기운 ${level}/3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} aria-hidden style={{ color: i <= level ? HEART_FILL : HEART_EMPTY }}>
          ♥
        </span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Serene 톤 공통 컴포넌트(글래스 카드 / 칩 / 스코어 링 / 섹션 제목)
// ─────────────────────────────────────────────────────────────

function GlassCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: serene.glassGrad,
        border: `2px solid ${serene.glassBorder}`,
        borderRadius: radius.cute,
        boxShadow: serene.glassShadow,
        // 좌우 패딩 반응형 — 좁은 폰에선 줄여 본문 폭 확보(상하는 유지).
        padding: `${spacing.lg}px clamp(12px, 4vw, ${spacing.lg}px)`,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, children, color = serene.primary }: { icon: ReactNode; children: ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
      <span aria-hidden style={{ fontSize: 19, display: 'inline-flex', alignItems: 'center' }}>
        {icon}
      </span>
      <span style={{ fontFamily: serene.serif, fontSize: 20, fontWeight: 800, color }}>
        {children}
      </span>
    </div>
  );
}

type ChipTone = 'purple' | 'blue' | 'gold';
function Chip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  const map: Record<ChipTone, { bg: string; color: string }> = {
    purple: { bg: '#E7DEF6', color: serene.onPrimaryContainer },
    blue: { bg: serene.chipTertiaryBg, color: '#3E6B52' },
    gold: { bg: 'rgba(154, 119, 214, 0.16)', color: '#5E4E8F' },
  };
  const s = map[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: radius.pill,
        background: s.bg,
        color: s.color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** 총운 점수/강조 색 — 진한 마젠타-보라(총운 셀 강조 배경). */
const SCORE_NUM = '#9D2BB0';

/** 점수(0~100) 3분위 색 — 빨강(낮음)/노랑(보통)/초록(높음). 일기 점수와 동일 임계값으로 통일. */
function scoreTierColor(s100: number): string {
  return s100 >= 70 ? '#1FA055' : s100 >= 50 ? '#D99400' : '#E0413F';
}
/** 본문 가독용 거의-검정 잉크(사용자 요청 — 운세 설명을 또렷하게). */
const TEXT_INK = '#23202B';

/** 문장을 마침표/물음표/느낌표 단위로 끊어 배열로(끝부호 보존, 빈 줄 제거). */
function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]*/g);
  if (parts == null) return text.trim() === '' ? [] : [text.trim()];
  return parts.map((s) => s.trim()).filter((s) => s !== '');
}

/** 여러 문장을 한 호흡(한 줄)으로 매끄럽게 합친다 — 앞 문장 끝부호를 떼고 쉼표로 잇는다(사용자 요청). */
function mergeAdvice(text: string): string {
  const ss = splitSentences(text);
  if (ss.length <= 1) return text.trim();
  const head = ss.slice(0, -1).map((s) => s.replace(/[.!?]+$/, ''));
  return [...head, ss[ss.length - 1]].join(', ');
}

/** `YYYY-MM-DD` → "THU, JUNE 18"(ref의 uppercase 라벨 톤). */
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const MO = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'] as const;
function heroDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (y == null || m == null || d == null) return '';
  const dow = new Date(y, m - 1, d).getDay();
  return `${WD[dow]}, ${MO[m - 1]} ${d}`;
}

export interface FortuneScreenProps {
  saju: SajuInput;
  today?: string;
  gender?: 'male' | 'female';
  natal?: NatalChart;
  /** 사주 캐릭터 종류(토끼/고양이/강아지/수달). 기본 rabbit. */
  characterKind?: CharacterKind;
  /** 사용자가 올린 커스텀 캐릭터 사진(data URL). 있으면 종류 PNG 대신 표시. */
  characterPhoto?: string;
  onClose?: () => void;
  /** 탭 패널 임베드 모드 — 자체 뒤로버튼/상단여백 제거(상위가 AppBar+SegTabs 제공). */
  embedded?: boolean;
  /** 맨 아래 '타로 보기' 버튼 → 타로 서브탭으로 이동(있을 때만 노출). */
  onOpenTarot?: () => void;
}

export function FortuneScreen({
  saju,
  today = todayDateString(),
  gender,
  natal,
  characterKind = 'rabbit',
  characterPhoto,
  onClose,
  embedded = false,
  onOpenTarot,
}: FortuneScreenProps) {
  const fortune = useMemo<TodayFortune | null>(() => {
    if (saju == null || saju.birthDate === '') return null;
    try {
      return computeTodayFortune(saju, today, { gender, natal });
    } catch {
      return null;
    }
  }, [saju, today, gender, natal]);

  // 사주 캐릭터 속성(오행+십신) — 원국에서 파생(결정론). 실패 시 null(이모지 폴백).
  const traits = useMemo<CharacterTraits | null>(() => {
    if (saju == null || saju.birthDate === '') return null;
    try {
      return characterTraits(natal ?? computeNatal(saju));
    } catch {
      return null;
    }
  }, [saju, natal]);

  const wrap: CSSProperties = {
    minHeight: embedded ? undefined : '100vh',
    background: embedded ? 'transparent' : serene.appBg,
    boxSizing: 'border-box',
  };
  const back: CSSProperties = {
    position: 'absolute',
    // 상태바/노치에 가리지 않게 safe-area 위로 띄운다(사용자 #1 — 뒤로 키가 화면 밖).
    top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
    left: spacing.lg,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    padding: `${spacing.xs}px ${spacing.md}px`,
    background: serene.glassBg,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${serene.glassBorder}`,
    borderRadius: radius.pill,
    color: serene.primary,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    zIndex: 2,
  };
  const body: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    // 미니멀 숨표 — 섹션 사이 여백을 넓혀 빽빽함 완화(장식 추가 없이 화이트스페이스로만).
    gap: spacing.xl,
    // 좌우 화면 패딩 반응형 — 좁은 폰에선 줄여 카드 폭 확보.
    padding: `0 clamp(12px, 4vw, ${spacing.lg}px) ${spacing.xxl}px`,
  };

  return (
    <div style={wrap}>
      {!embedded ? (
        <button type="button" style={back} onClick={onClose} aria-label="뒤로 가기">
          <span aria-hidden style={{ fontSize: 18 }}>
            ‹
          </span>
          뒤로
        </button>
      ) : null}

      {/* Hero — 가로 배치(높이 절약, 사용자 #9): 캐릭터 왼쪽 + 제목·날짜·오행·행운색·방향 오른쪽. */}
      <section style={{ padding: embedded ? `${spacing.sm}px clamp(12px, 4vw, ${spacing.lg}px) ${spacing.md}px` : `calc(env(safe-area-inset-top, 0px) + 52px) clamp(12px, 4vw, ${spacing.lg}px) ${spacing.md}px` }}>
        {/* 캐릭터 왼쪽 + 오른쪽 정보열(제목·날짜 묶음 → 배지 4종 한 그룹으로 줄바꿈) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 3vw, 14px)' }}>
          <SajuMascot kind={characterKind} photoUrl={characterPhoto} size={116} style={{ display: 'block', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {/* 제목 + 날짜 한 묶음 */}
            <div>
              <h2 style={{ fontFamily: serene.serif, fontSize: 25, fontWeight: 800, color: serene.primary, margin: 0, lineHeight: 1.1 }}>
                오늘의 운세
              </h2>
              {fortune != null && (
                <p style={{ margin: '4px 0 0', fontSize: 11, letterSpacing: '0.12em', color: serene.inkVariant, fontWeight: 600 }}>
                  {heroDateLabel(today)}
                </p>
              )}
            </div>
            {/* 배지 4종(주오행·보조오행·행운색·방향)을 한 그룹으로 자연스럽게 줄바꿈 */}
            {fortune != null && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {traits != null && (
                  <ElementTags element={traits.element} secondElement={traits.secondElement} align="start" />
                )}
                <Chip tone="purple">
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: LUCKY_COLOR_HEX[fortune.result.luckyColor],
                    }}
                  />
                  행운색 {fortune.result.luckyColor}
                </Chip>
                <Chip tone="blue">🧭 {directionLabel(fortune.result.luckyDirection)}</Chip>
              </div>
            )}
          </div>
        </div>
      </section>

      <div style={body}>
        {fortune == null ? (
          <GlassCard>
            <span style={{ fontSize: 14, color: serene.inkVariant }}>
              운세를 불러오지 못했어요. 생일을 다시 확인해 주세요.
            </span>
          </GlassCard>
        ) : (
          <>
            <FortuneDetail result={fortune.result} phrases={fortune.phrases} detailText={fortune.detailText} />
            <FortuneTrend saju={saju} today={today} gender={gender} natal={natal} />
            <ZenQuote />
            {/* 맨 아래 타로 보기 — 위로 스크롤하지 않고 바로 타로로 이어지게(사용자 #5). */}
            {onOpenTarot != null && (
              <button
                type="button"
                onClick={onOpenTarot}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: radius.pill,
                  background: serene.primary,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 800,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(129, 85, 207, 0.28)',
                }}
              >
                🔮 타로 보기 ›
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 상세 본문 — 총운(스코어) / 사주 기운(별점) / 시간대별(타임라인) / 조심 / Zen
// ─────────────────────────────────────────────────────────────

function FortuneDetail({
  result,
  phrases,
  detailText,
}: {
  result: FortuneResult;
  phrases: TodayFortune['phrases'];
  detailText: FortuneDetailText;
}) {
  const score = Math.round((result.overall / 5) * 100);

  return (
    <>
      {/* 오늘의 총운 — 연한 라벤더 카드 + 제목 더 짙게(사용자 #9), 제목 바로 옆에 점수 N점/100점(#4). */}
      <GlassCard style={{ background: '#F1ECFB', border: '1.5px solid #DDD0F4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SectionTitle icon="✨" color={serene.primaryDeep}>오늘의 총운</SectionTitle>
          <span style={{ flexShrink: 0, fontFamily: typography.fontBody, fontWeight: 800, color: scoreTierColor(score), lineHeight: 1 }}>
            <span style={{ fontSize: 18 }}>{score}점</span>
            <span style={{ fontSize: 13, color: serene.inkVariant, fontWeight: 700 }}>/100점</span>
          </span>
        </div>
        {/* 설명 텍스트 전체 폭 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: spacing.sm }}>
          {/* 기운 — 이어서 쓰기(자연 줄바꿈), 검정 진하게(가독성, 사용자 요청) */}
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: TEXT_INK, lineHeight: 1.5, textAlign: 'left' }}>
            {buildOverallEnergyLine(result)}
          </p>
          {/* 조언 — 두 문장을 한 줄로 매끄럽게 합쳐 한 호흡으로(사용자 요청) */}
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: TEXT_INK, lineHeight: 1.5, textAlign: 'left' }}>
            {mergeAdvice(phrases.overall)}
          </p>
        </div>
      </GlassCard>

      {/* 나의 사주 기운 — 운별 카드 2×2(아이콘 + 별점 + 점수 게이지 바, 볼 맛 나게 강조). */}
      <GlassCard>
        <SectionTitle icon="🌙">나의 사주 기운</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: spacing.sm,
            marginTop: spacing.md,
          }}
        >
          <EnergyCell label="총운" emoji="✨" tint={SCORE_NUM} score={result.overall} />
          <EnergyCell label="재물운" emoji="💰" tint={accent.gold} score={result.scores.wealth} />
          <EnergyCell label="애정운" emoji="💗" tint={accent.rose} score={result.scores.love} />
          <EnergyCell label="건강운" emoji="🌿" tint={accent.sage} score={result.scores.health} />
        </div>
      </GlassCard>

      {/* 시간대별 기운 — ref 타임라인: 좌측 세로선 + 컬러 점 + 옅은 글래스 행(이모지 없음) */}
      <GlassCard>
        <SectionTitle icon="⏱️">시간대별 기운</SectionTitle>
        <div style={{ position: 'relative', marginTop: spacing.md, paddingLeft: 26 }}>
          {/* 세로 연결선 */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 8,
              top: 10,
              bottom: 10,
              width: 1.5,
              background: 'rgba(120, 95, 175, 0.16)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {detailText.segments.map((seg) => (
              <TimelineRow key={seg.part} part={seg.part} label={seg.label} stance={seg.stance} text={seg.text} />
            ))}
          </div>
        </div>
      </GlassCard>
    </>
  );
}

/** 행운색 hex → rgba(투명도). 셀 틴트 배경에 쓰는 헬퍼. */
function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * 사주 기운 셀 — 흰 카드 위 운별 아이콘 + 별점 + 점수 게이지 바(볼 맛, #9).
 * 운별 강조색(tint)은 코랄/골드/로즈/세이지 한 계열 — 난잡하지 않게 포인트만.
 */
function EnergyCell({ label, emoji, tint, score }: { label: string; emoji: string; tint: string; score: number }) {
  const pct = Math.round((score / 5) * 100);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: `${spacing.md}px 10px`,
        borderRadius: radius.md,
        background: '#ffffff',
        border: `1.5px solid ${withAlpha(tint, 0.28)}`,
        boxShadow: '0 2px 8px rgba(120, 95, 175, 0.06)',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: withAlpha(tint, 0.16),
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {emoji}
        </span>
        {/* 라벨=진한 보라, 점수=운별 강조색(별 제거, 40/100 표기 — 사용자 요청). 한 줄 고정. */}
        <span style={{ fontSize: 14, fontWeight: 800, color: serene.primaryDeep, whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontWeight: 900, color: tint, flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 18 }}>{pct}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: serene.inkVariant }}>/100</span>
        </span>
      </div>
      {/* 점수 게이지 바 — 운별 강조색으로 채워 또렷이(시인성, CRITICAL #8) */}
      <div style={{ height: 7, borderRadius: 999, background: withAlpha(tint, 0.14), overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: tint }} />
      </div>
    </div>
  );
}

/** 시간대별 타임라인 한 줄 — 컬러 점 + 라벨/시간 + 본문(이모지·라벨 없음, ref 톤). */
function TimelineRow({
  part,
  label,
  stance,
  text,
}: {
  part: DayPart;
  label: string;
  stance: FortuneStance;
  text: string;
}) {
  const info = PART_INFO[part];
  return (
    <div
      style={{
        position: 'relative',
        // 시간대별 운 레이어 = 옅은 크림(항목별 레이어와 명도로 구분). 시기 내부는 모두 동일색.
        background: '#fbf3ee',
        border: `2px solid #FFFFFF`,
        borderRadius: radius.md,
        padding: `${spacing.sm + 1}px ${spacing.md}px`,
      }}
    >
      {/* 점 — 시간대 기운색(골드/탠/테라코타, 세로선 위에 흰 테두리로 올라앉음) */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: -22,
          top: 15,
          width: 13,
          height: 13,
          borderRadius: '50%',
          background: STANCE_VIS[stance].dot,
          border: '3px solid #FFFFFF',
          boxShadow: '0 0 0 1px rgba(120, 95, 175, 0.10)',
        }}
      />
      {/* 시간대 아이콘 + 라벨 + 시간 + (우측) 기운 하트 (#6: 이미지를 글자 앞에) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
        <PartIcon part={part} size={20} />
        <span style={{ fontSize: 16, fontWeight: 800, color: serene.primary }}>{label}</span>
        <span style={{ fontSize: 12.5, color: serene.inkVariant }}>{info.range}</span>
        <Hearts stance={stance} />
      </div>
      <span style={{ display: 'block', fontSize: 13.5, color: serene.ink, lineHeight: 1.55, marginTop: 3 }}>
        {text}
      </span>
    </div>
  );
}

/** Zen 인용구 — serif italic 마무리. 또렷한 토프(저대비 금지, 사용자 #3). */
function ZenQuote() {
  return (
    <section style={{ textAlign: 'center', padding: `${spacing.md}px ${spacing.lg}px` }}>
      <div aria-hidden style={{ fontSize: 20, color: serene.gold, marginBottom: spacing.xs }}>
        ❦
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: serene.serif,
          fontStyle: 'italic',
          fontSize: 18,
          fontWeight: 600,
          lineHeight: 1.6,
          color: serene.primaryDeep,
        }}
      >
        “오늘 당신이 걷는 길마다,
        <br />
        따스한 행운의 빛이 머물러요.”
      </p>
    </section>
  );
}
