/**
 * TarotScreen — 오늘의 타로 한 장(별도 풀스크린, App 오버레이로 열림, 요청 #6).
 *
 * 운세 상세(FortuneScreen)의 타로 카드를 탭하면 이 화면이 따로 열린다 — 별도 화면이라
 *   추후 이 자리에 광고를 붙일 수 있다(이번 컨테스트 빌드엔 광고 SDK 미탑재, CRITICAL #4 → 자리만).
 *
 * 뽑기 규칙(#6):
 *   - 펼친 카드 중 한 장을 **직접 고른다**. 고른 자리(pickedIndex) + 내 사주 + 오늘 날짜로
 *     카드가 결정된다(pickTarotAt) — 고정된 임의값이 아니라 내 선택이 반영된다. 시드 결정론
 *     (Math.random 0)이라 같은 자리를 고르면 같은 카드.
 *   - 하루 한 장: 한 번 뽑으면 그날(새벽 5시 경계, todayDateString) 동안 같은 카드로 잠긴다 →
 *     뽑은 자리를 Storage(evrytimes:tarot)에 저장하고, 재진입 시 그 카드를 그대로 보여준다.
 *   - 카드 그림: 22장 각기 다른 골드 라인아트(TarotCardFace+arcana-symbols) — 자체 제작, 외부 타로 이미지 0(CRITICAL #2).
 *
 * 계산은 phrases.pickTarotAt 재사용(재구현 금지). 저장은 storage 접근자만(CRITICAL #1).
 * 웹 React + TDS + inline style(토큰). RN 프리미티브·애니메이션 라이브러리 0(CRITICAL #5, 뒤집기=CSS).
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { Top, Badge } from '@toss/tds-mobile';
import { Card } from '../../components';
import { palette, spacing, radius, serene } from '../../theme/tokens';
import type { SajuInput, TarotCard } from '../../types';
import { todayDateString } from '../../features/fortune/manse';
import { pickTarotAt } from '../../features/fortune/phrases';
import { loadTarotPick, saveTarotPick } from '../../features/storage';
import { TarotCardFace } from '../../components/tarot/TarotCardFace';

/** 옅은 골드 라인(serene 톤). */
const GOLD_LINE = 'rgba(197, 163, 88, 0.32)';
/** 우리 타로 카드 뒷면(자체 호스팅 래스터). */
const TAROT_BACK = '/tarot/card-back.png';

/** 펼쳐 보여줄 뒷면 카드 장수(고르는 느낌). 어느 자리를 고르냐에 따라 카드가 달라진다(#6). */
const TAROT_FAN = 5;

export interface TarotScreenProps {
  /** 사주 입력(카드 결정에 사용). */
  saju: SajuInput;
  /** 대상 날짜 `YYYY-MM-DD`. 테스트/미리보기 주입. 기본 오늘(새벽 5시 경계). */
  today?: string;
  /** 화면 닫기(App에서 운세 화면으로 복귀). */
  onClose?: () => void;
  /** 탭 패널 임베드 모드 — 자체 뒤로버튼/상단여백 제거. */
  embedded?: boolean;
}

export function TarotScreen({ saju, today = todayDateString(), onClose, embedded = false }: TarotScreenProps) {
  // 오늘 이미 뽑았는지: 저장된 pick의 date가 오늘과 같으면 그 카드로 잠금(하루 한 장).
  // null=아직 안 뽑음(펼친 카드 보여줌), number=오늘 고른 자리(공개).
  const [picked, setPicked] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadTarotPick()
      .then((p) => {
        if (!alive) return;
        if (p != null && p.date === today) setPicked(p.pickedIndex);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [today]);

  const pick = (index: number) => {
    setPicked(index);
    // 그날 동안 같은 카드로 잠그기 위해 고른 자리를 저장(실패해도 화면은 공개 — 저장은 베스트에포트).
    void saveTarotPick({ date: today, pickedIndex: index });
  };

  const card: TarotCard | null =
    picked != null && saju.birthDate !== '' ? pickTarotAt(saju.birthDate, today, picked) : null;

  const wrap: CSSProperties = {
    minHeight: embedded ? undefined : '100vh',
    background: embedded ? 'transparent' : serene.appBg,
    boxSizing: 'border-box',
  };
  const back: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    // 상태바/노치 아래로(safe-area). 뒤로 키가 화면 밖으로 나가지 않게.
    margin: `calc(env(safe-area-inset-top, 0px) + 10px) ${spacing.xl}px 0`,
    padding: `${spacing.xs}px ${spacing.sm}px`,
    background: serene.glassBg,
    border: `1px solid ${serene.glassBorder}`,
    borderRadius: radius.pill,
    color: serene.primary,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  };
  const body: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.gapCard,
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
    paddingBottom: spacing.xxl,
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

      {!embedded ? <Top title={<Top.TitleParagraph size={22}>🃏 오늘의 타로</Top.TitleParagraph>} /> : null}

      <div style={body}>
        <Card
          style={{
            background: serene.glassGrad,
            backgroundColor: 'transparent',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${GOLD_LINE}`,
            borderRadius: radius.cute,
            boxShadow: serene.glassShadow,
          }}
          raised={false}
        >
          {!loaded ? (
            <span style={{ fontSize: 14, color: palette.textSecondary }}>카드를 준비하고 있어요…</span>
          ) : card != null ? (
            <TarotRevealed card={card} />
          ) : (
            <TarotFan onPick={pick} />
          )}
        </Card>
      </div>
    </div>
  );
}

/** 부채꼴 뒷면 카드 — 한 장을 골라 "뽑는" 느낌. 라이브러리 0(inline transform만). */
function TarotFan({ onPick }: { onPick: (index: number) => void }) {
  const prompt: CSSProperties = {
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: 'center',
    margin: `${spacing.sm}px 0 ${spacing.md}px`,
  };
  const stage: CSSProperties = {
    position: 'relative',
    height: 180,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
  };
  const sub: CSSProperties = {
    fontSize: 12,
    color: palette.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  };

  const center = (TAROT_FAN - 1) / 2;
  return (
    <div>
      <p style={prompt}>마음이 가는 카드를 한 장 골라보세요</p>
      <div style={stage}>
        {Array.from({ length: TAROT_FAN }).map((_, i) => {
          const offset = i - center;
          const cardStyle: CSSProperties = {
            position: 'absolute',
            bottom: Math.abs(offset) * 10,
            width: 84,
            height: 132,
            transform: `translateX(${offset * 38}px) rotate(${offset * 9}deg)`,
            transformOrigin: 'bottom center',
            borderRadius: radius.lg,
            border: 0,
            padding: 0,
            cursor: 'pointer',
            background: 'transparent',
            boxShadow: serene.glassShadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease',
          };
          return (
            <button
              key={i}
              type="button"
              style={cardStyle}
              onClick={() => onPick(i)}
              aria-label={`${i + 1}번째 타로 카드 뽑기`}
            >
              <img src={TAROT_BACK} alt="" width={82.5} style={{ display: 'block', borderRadius: radius.lg }} />
            </button>
          );
        })}
      </div>
      <p style={sub}>오늘의 카드는 하루에 한 장이에요</p>
    </div>
  );
}

/** 고른 카드 공개 — 카드 면(그림)이 뒤집히듯 나타난다(rotateY+opacity). 그날 잠긴 카드. */
function TarotRevealed({ card }: { card: TarotCard }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShown(true), 20);
    return () => clearTimeout(id);
  }, []);

  const perspective: CSSProperties = { perspective: 900, display: 'flex', justifyContent: 'center', marginTop: spacing.sm };
  const face: CSSProperties = {
    transformStyle: 'preserve-3d',
    transform: shown ? 'rotateY(0deg)' : 'rotateY(-90deg)',
    opacity: shown ? 1 : 0,
    transition: 'transform 0.5s ease, opacity 0.3s ease',
    filter: 'drop-shadow(0 8px 20px rgba(120, 95, 175, 0.18))',
  };

  const info: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    marginTop: spacing.lg,
    alignItems: 'center',
  };
  const head: CSSProperties = { display: 'flex', alignItems: 'center', gap: spacing.xs };
  const nameStyle: CSSProperties = { fontSize: 18, fontWeight: 800, color: palette.textPrimary };
  const meaningStyle: CSSProperties = {
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 1.6,
    textAlign: 'center',
  };

  return (
    <div>
      <div style={perspective}>
        <div style={face}>
          <TarotCardFace index={card.index} name={card.name} reversed={card.reversed} width={200} />
        </div>
      </div>

      <div style={info}>
        <div style={head}>
          <span style={nameStyle}>{card.name}</span>
          <Badge size="small" color={card.reversed ? 'red' : 'blue'} variant="weak">
            {card.reversed ? '역방향' : '정방향'}
          </Badge>
        </div>
        <span style={meaningStyle}>{card.meaning}</span>
      </div>
    </div>
  );
}
