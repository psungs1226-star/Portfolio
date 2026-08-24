/**
 * TodayScreen — 오늘(홈) 탭. 메인 = "오늘의 사주"(간판).
 *
 * 고정 위계(레퍼런스 정합):
 *   헤더(오늘의 사주 + 설정) → 인사 카드 → 캐릭터+사주기둥(원국) 카드 + 4분류 별점(★최대 3)
 *   → 날씨 한 줄 → 메모(2단) → 다가오는 날(디데이) → 오늘의 일기(맨 아래).
 *   (타로는 홈 메인에서 제외 — 운세 탭의 '타로'에 있다.)
 *
 * 색 계열 통일: 배경=흰, 카드=연라벤더, 강조=보라 별점/CTA. 캐릭터=SajuMascot(종류별 단일 PNG, 토끼 간판).
 * 모든 데이터는 보존된 순수 로직으로 계산(저장은 storage 접근자만, CRITICAL #1).
 * 웹 React + inline style(theme/tokens). RN 프리미티브 금지.
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Screen, Card, Section, SectionHeader } from '../../components/ui';
import { spacing, radius } from '../../theme/tokens';
import { computeTodayFortune, computeNatalCached } from '../../widgets/fortune-today';
import { todayDateString, ganZhiKo } from '../../features/fortune/manse';
import { SajuMascot } from '../../components/character/SajuMascot';
import { runAfterAd } from '../../features/ads';
import {
  loadSettings,
  loadMemos,
  saveMemos,
  loadStreak,
  saveStreak,
  loadDdays,
} from '../../features/storage';
import { applyVisit } from '../../widgets/streak';
import { homeMemoItems, toggleMemo } from '../../widgets/memo-ops';
import { ddayLabel, daysUntil } from '../../widgets/dday-calc';
import { loadWeather } from '../../features/weather';
import type { WeatherBundle } from '../../features/weather';
import { sidoForRegion, iconEmoji } from '../../widgets/weather-view';
import type { CharacterKind, Dday, Memo, Region, SajuInput } from '../../types';
import type { TabKey } from '..';

const SAMPLE_SAJU: SajuInput = { birthDate: '1994-05-20', isLunar: false };

// ── 홈 전용 라벤더/보라 팔레트(레퍼런스 정합 — '오늘의 사주' 홈만 보라 톤) ──
const LAV = {
  /** 페이지 배경 — 흰색. */
  pageBg: '#FFFFFF',
  /** '오늘의 운세' 히어로 카드 — 흰색(라벤더 테두리로 구분). */
  charCardGrad: '#FFFFFF',
  /** 마스코트 밑 보라 그림자 타원. */
  ellipse: '#E4DAF4',
  /** 보조/분류 카드 — 흰색. */
  card: '#FFFFFF',
  /** 카드 위 인셋(메모 칸 등) — 연라벤더. */
  inset: '#F4F0FB',
  /** 보라 강조(별점·CTA·디데이). */
  purple: '#9A77D6',
  /** 진한 보라(날짜/포인트 텍스트). */
  purpleDeep: '#5E4E8F',
  /** 본문 강조 텍스트(거의 검정). */
  ink: '#2C2438',
  /** 본문 보조. */
  inkSub: '#6E6680',
  /** 캡션/약한. */
  outline: '#9A92AC',
  /** 카드 라벤더 테두리(흰 배경 위 또렷이). */
  border: '#D9CCF0',
  /** 빈 별(연라벤더). */
  starEmpty: '#DCD2EF',
} as const;
const LAV_SHADOW = '0 4px 16px rgba(120, 95, 175, 0.12), 0 1px 4px rgba(120, 95, 175, 0.07)';

/** 불변 배열 인덱스 치환(지역별 날씨 상태 갱신용). */
function withAt<T>(arr: T[], i: number, v: T): T[] {
  const next = arr.slice();
  next[i] = v;
  return next;
}

const WD_KO = ['일', '월', '화', '수', '목', '금', '토'];
/** `1994-05-20` → `1994.05.20 (금)`. */
function dotDateW(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (y == null || m == null || d == null) return date.replace(/-/g, '.');
  const wd = WD_KO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')} (${wd})`;
}

export interface TodayScreenProps {
  /** 탭 전환(라우터 미사용 — App 탭 상태 재사용). */
  onNavigate?: (tab: TabKey) => void;
  /** 날씨 상세 오버레이 열기(홈 슬림 행 탭). */
  onOpenWeather?: () => void;
  /** 메모 관리 페이지 열기(오버레이). */
  onManageMemos?: () => void;
  /** 디데이 관리 페이지 열기(오버레이). */
  onManageDdays?: () => void;
}

/**
 * 통통한(두꺼운) 별 폴리곤 — 안쪽 반지름을 키워 뾰족하지 않고 도톰하게(사용자 요청).
 * round join + 동색 stroke로 모서리를 둥글려 묵직한 별 느낌. viewBox 24×24.
 */
const FAT_STAR_POINTS =
  '12,2 14.82,8.12 21.51,8.91 16.56,13.48 17.88,20.09 12,16.8 6.12,20.09 7.44,13.48 2.49,8.91 9.18,8.12';

/** 별 한 줄(max개)을 한 색으로 그린다. */
function StarRow({ max, size, gap, color }: { max: number; size: number; gap: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap, width: max * size + (max - 1) * gap }}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, display: 'block' }} aria-hidden>
          <polygon points={FAT_STAR_POINTS} fill={color} stroke={color} strokeWidth={2.4} strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

/**
 * 별점 — 최대 max개, 반쪽(부분) 채움 지원(레퍼런스 정합).
 * 빈 별(연라벤더) 위에 채움 별(보라)을 pct%만큼 잘라 덮는다. 두껍고 큼직한 별(사용자 요청, CRITICAL #8).
 */
function Stars({ value, max = 3, size = 16, fill = LAV.purple, empty = LAV.starEmpty }: { value: number; max?: number; size?: number; fill?: string; empty?: string }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  const gap = Math.max(1, Math.round(size * 0.07));
  const rowW = max * size + (max - 1) * gap;
  return (
    <div style={{ position: 'relative', width: rowW, height: size }} aria-label={`${value.toFixed(1)}/${max}점`}>
      <StarRow max={max} size={size} gap={gap} color={empty} />
      <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, overflow: 'hidden' }}>
        <StarRow max={max} size={size} gap={gap} color={fill} />
      </div>
    </div>
  );
}

/** 1~5점 → 3점 척도(반쪽 단위, 별 3개·빈 별 보임). 최소 0.5. */
function to3(score: number): number {
  const v = Math.round((score / 5) * 3 * 2) / 2; // 0.5 단위 반올림
  return Math.max(0.5, Math.min(3, v));
}

export function TodayScreen({ onNavigate, onOpenWeather, onManageMemos, onManageDdays }: TodayScreenProps = {}) {
  const today = todayDateString();
  const [saju, setSaju] = useState<SajuInput | undefined>(undefined);
  const [kind, setKind] = useState<CharacterKind>('rabbit');
  const [userName, setUserName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [regions, setRegions] = useState<Region[]>([]);
  const [weathers, setWeathers] = useState<(WeatherBundle | null)[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [ddays, setDdays] = useState<Dday[]>([]);
  const [, setStreakCount] = useState(0);

  useEffect(() => {
    let alive = true;
    loadSettings()
      .then((s) => {
        if (!alive) return;
        setSaju(s.saju);
        setKind(s.characterKind ?? 'rabbit');
        setUserName(s.userName ?? '');
        setPhotoUrl(s.characterPhoto);
        // 최대 2개 지역(설정) — 각각 캐시 우선 페인트 후 백그라운드 갱신, 인덱스별로 저장.
        const rs = s.weather.regions.slice(0, 2);
        setRegions(rs);
        setWeathers(rs.map(() => null));
        rs.forEach((r, i) => {
          loadWeather(r, { sido: sidoForRegion(r) })
            .then(({ cached, refresh }) => {
              if (alive && cached != null) setWeathers((prev) => withAt(prev, i, cached));
              refresh()
                .then((b) => alive && setWeathers((prev) => withAt(prev, i, b)))
                .catch(() => {});
            })
            .catch(() => {});
        });
      })
      .catch(() => {});
    loadMemos().then((m) => alive && setMemos(m)).catch(() => {});
    loadDdays().then((d) => alive && setDdays(d)).catch(() => {});
    loadStreak()
      .then((prev) => {
        const next = applyVisit(prev, today);
        saveStreak(next).catch(() => {});
        if (alive) setStreakCount(next.streakCount);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [today]);

  const hasBirth = saju?.birthDate != null && saju.birthDate !== '';
  const activeSaju = hasBirth ? saju! : SAMPLE_SAJU;

  const fortune = useMemo(() => {
    try {
      return computeTodayFortune(activeSaju, today);
    } catch {
      return null;
    }
  }, [activeSaju, today]);

  // 카드 기둥 = '오늘의 운세' → 오늘 날짜의 일진(년/월/일주). 캐릭터(traits)는 원국 유지.
  const pillars = useMemo(() => {
    try {
      const n = computeNatalCached({ birthDate: today, isLunar: false });
      return { year: ganZhiKo(n.year.ganZhi), month: ganZhiKo(n.month.ganZhi), day: ganZhiKo(n.day.ganZhi) };
    } catch {
      return null;
    }
  }, [today]);

  const activeMemos = useMemo(() => homeMemoItems(memos, today), [memos, today]);
  const upcomingDdays = useMemo(
    () =>
      ddays
        .map((d) => ({ d, diff: daysUntil(d.targetDate, today) }))
        .filter((x) => !Number.isNaN(x.diff) && x.diff >= 0)
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 3)
        .map((x) => x.d),
    [ddays, today],
  );

  const onToggleTodo = (id: string) => {
    const next = toggleMemo(memos, id, { completedDate: today });
    setMemos(next);
    saveMemos(next).catch(() => {});
  };

  const cats = fortune != null
    ? [
        { label: '총운', score: fortune.result.overall },
        { label: '연애운', score: fortune.result.scores.love },
        { label: '금전운', score: fortune.result.scores.wealth },
        { label: '직장운', score: fortune.result.scores.health },
      ]
    : [];

  // 날씨 상세 진입 시 전면광고(스킵 가능) → 닫히면 열기. 미지원/쿨다운이면 바로 열림.
  const openWeatherWithAd = onOpenWeather ? () => runAfterAd(onOpenWeather) : undefined;

  return (
    <Screen padTop="calc(env(safe-area-inset-top, 0px) + 30px)" style={{ background: LAV.pageBg }}>
      {/* ── 헤더: ☰ · 사주 다이어리(앱 이름) · ⚙️ ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <button type="button" onClick={() => onNavigate?.('my')} aria-label="메뉴" style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1, color: LAV.ink }}>☰</button>
        {/* 앱 로고 + 이름(사용자 요청 — 사주 다이어리 옆에 로고) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <img src="/logo-192.png" width={24} height={24} alt="" aria-hidden style={{ borderRadius: 7, display: 'block' }} />
          <h1 className="display-font" style={{ margin: 0, fontSize: 18, fontWeight: 400, color: LAV.ink, letterSpacing: -0.3 }}>
            사주 다이어리
          </h1>
        </div>
        <button type="button" onClick={() => onNavigate?.('my')} aria-label="설정" style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>⚙️</button>
      </div>

      {/* ── 인사 문구(카드 아님 — 흰 배경 위 텍스트, 레퍼런스 실측) ── */}
      <p className="display-font" style={{ margin: `${spacing.sm}px 0 ${spacing.lg}px`, fontSize: 22, fontWeight: 400, color: LAV.ink, lineHeight: 1.4 }}>
        {userName.trim() !== '' ? `${userName.trim()}님 ` : ''}오늘 하루도<br />행운 가득한 날이 되세요! <span style={{ fontSize: 20 }}>✨</span>
      </p>

      {/* ── '오늘의 운세' 히어로 카드 — 텍스트+캐릭터를 가운데로 모아 빈공간 채움 + 하단 CTA ── */}
      <Card padding={spacing.lg} style={{ background: LAV.charCardGrad, border: `1.5px solid ${LAV.border}`, boxShadow: LAV_SHADOW, marginBottom: spacing.lg, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          {/* 본문(왼쪽): 뱃지 → 사주기둥 → 날짜 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'inline-block', background: LAV.purple, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 0.2, padding: '4px 10px', borderRadius: radius.pill }}>
              오늘의 운세
            </span>
            {pillars != null ? (
              <div className="display-font" style={{ marginTop: 12, lineHeight: 1.28 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: LAV.ink }}>{pillars.year}년 {pillars.month}월</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: LAV.ink }}>{pillars.day}일</div>
              </div>
            ) : null}
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: LAV.purpleDeep, letterSpacing: 0.2 }}>
              {dotDateW(today)}
            </div>
            {!hasBirth ? (
              <button
                type="button"
                onClick={() => onNavigate?.('my')}
                style={{ marginTop: spacing.md, border: 'none', background: LAV.purple, color: '#fff', fontSize: 13, fontWeight: 800, borderRadius: radius.pill, padding: '9px 16px', cursor: 'pointer' }}
              >
                내 생일 넣기
              </button>
            ) : null}
          </div>
          {/* 마스코트 + 밑 보라 그림자 타원 — 반응형(clamp): 좁은 폰에선 더 줄이고 오른쪽으로 당겨 '병오년 갑오월' 한 줄 확보. */}
          <div style={{ position: 'relative', width: 'clamp(116px, 39vw, 172px)', height: 'clamp(116px, 39vw, 172px)', flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginRight: -16 }}>
            <span aria-hidden style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 'clamp(92px, 31vw, 134px)', height: 26, borderRadius: '50%', background: LAV.ellipse }} />
            <SajuMascot kind={kind} photoUrl={photoUrl} size="clamp(114px, 38vw, 168px)" style={{ position: 'relative', zIndex: 1 }} />
          </div>
        </div>
        {/* 캐릭터 아래 — 오늘의 운세 보러가기 CTA */}
        <button
          type="button"
          onClick={() => runAfterAd(() => onNavigate?.('fortune'))}
          style={{ marginTop: spacing.md, width: '100%', border: 'none', background: LAV.purple, color: '#fff', fontSize: 15, fontWeight: 800, borderRadius: radius.pill, padding: '13px 16px', cursor: 'pointer', boxShadow: '0 6px 16px rgba(129, 85, 207, 0.28)' }}
        >
          오늘의 운세 보러가기 ›
        </button>
      </Card>

      {/* ── 4분류(★ 최대 3, 보라 — 레퍼런스 정합: 플랫, 카드 배경 없음) ── */}
      {cats.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: spacing.md }}>
          {cats.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onNavigate?.('fortune')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, background: LAV.card, border: `1px solid ${LAV.border}`, borderRadius: radius.md, padding: `${spacing.sm}px 3px`, cursor: 'pointer', boxShadow: LAV_SHADOW }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: LAV.ink }}>{c.label}</span>
              <Stars value={to3(c.score)} max={3} size={18} />
            </button>
          ))}
        </div>
      ) : null}

      {/* ── 날씨 — 위치명 + 오전/오후 날씨모양(사용자 #6). 2개 지역이면 한 카드에 2줄(사용자 #3). ── */}
      <Section gap={spacing.sm} style={{ marginTop: spacing.section }}>
        <SectionHeader title="날씨" action={regions.length > 0 ? '상세' : undefined} onAction={regions.length > 0 ? openWeatherWithAd : undefined} />
        <WeatherCard regions={regions} weathers={weathers} onOpen={regions.length > 0 ? openWeatherWithAd : undefined} />
      </Section>

      {/* ── 메모 — '관리'로 전용 페이지(추가/수정/삭제). 항목 탭 → 관리 페이지. ── */}
      <Section gap={spacing.sm} style={{ marginTop: spacing.section }}>
        <SectionHeader title="메모/할 일" action="관리" onAction={onManageMemos} />
        <Card padding={spacing.md} style={{ background: LAV.card, border: `1px solid ${LAV.border}`, boxShadow: LAV_SHADOW }}>
          {activeMemos.length === 0 ? (
            <button
              type="button"
              onClick={onManageMemos}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', border: 'none', background: 'transparent', padding: `${spacing.sm}px 0`, fontSize: 14, color: LAV.outline, cursor: 'pointer' }}
            >
              메모·할 일이 없어요. 눌러서 추가해요 <span style={{ color: LAV.purple, fontWeight: 800 }}>›</span>
            </button>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.xs }}>
              {activeMemos.slice(0, 6).map((m) => {
                // 뒷날로 잡아둔 할 일은 날짜 뱃지(M/D)를 붙여 언제 할 일인지 보이게.
                const future = m.date !== today;
                const [, mm, dd] = m.date.split('-');
                return (
                  <div
                    key={m.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: LAV.inset, borderRadius: radius.sm, padding: '10px 12px', minWidth: 0 }}
                  >
                    {/* 완료 체크(메모·할 일 모두) — 체크하면 그날 일기 '오늘 한 일'에 연동 */}
                    <button
                      type="button"
                      onClick={() => onToggleTodo(m.id)}
                      aria-label="완료 표시"
                      style={{ width: 18, height: 18, borderRadius: 6, border: `2px solid ${LAV.purple}`, background: 'transparent', flexShrink: 0, cursor: 'pointer', padding: 0 }}
                    />
                    <button
                      type="button"
                      onClick={onManageMemos}
                      style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', textAlign: 'left', padding: 0, cursor: 'pointer', fontSize: 14, color: LAV.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {future ? (
                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: LAV.purple, background: '#fff', border: `1px solid ${LAV.border}`, borderRadius: 6, padding: '1px 5px' }}>
                          {Number(mm)}/{Number(dd)}
                        </span>
                      ) : null}
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.text}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Section>

      {/* ── 다가오는 날(디데이) — '관리'로 전용 페이지. 카드 탭 → 관리. ── */}
      <Section gap={spacing.sm} style={{ marginTop: spacing.section }}>
        <SectionHeader title="다가오는 날" action="관리" onAction={onManageDdays} />
        {upcomingDdays.length === 0 ? (
          <Card padding={spacing.md} onClick={onManageDdays} style={{ background: LAV.card, border: `1px solid ${LAV.border}`, boxShadow: LAV_SHADOW }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: LAV.outline }}>
              디데이가 없어요. 눌러서 추가해요 <span style={{ color: LAV.purple, fontWeight: 800 }}>›</span>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', gap: spacing.sm, overflowX: 'auto', paddingBottom: 2 }}>
            {upcomingDdays.map((d) => {
              const lab = ddayLabel(d.targetDate, today);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={onManageDdays}
                  style={{
                    flexShrink: 0,
                    minWidth: 104,
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: LAV.card,
                    border: `1.5px solid ${LAV.border}`,
                    borderRadius: radius.md,
                    boxShadow: LAV_SHADOW,
                    padding: `${spacing.sm}px ${spacing.md}px`,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 900, color: LAV.purple, letterSpacing: -0.3 }}>
                    {lab.text}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: LAV.inkSub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.title}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── 오늘의 일기(맨 아래) ── */}
      <Section gap={spacing.sm} style={{ marginTop: spacing.section }}>
        <SectionHeader title="오늘의 일기" />
        <Card onClick={() => onNavigate?.('diary')} padding={spacing.lg} style={{ background: LAV.card, border: `1px solid ${LAV.border}`, boxShadow: LAV_SHADOW, display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <span style={{ fontSize: 40, flexShrink: 0 }}>📖</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display-font" style={{ fontSize: 19, fontWeight: 400, color: LAV.ink }}>오늘 하루를 남겨요</div>
            <div style={{ fontSize: 13, color: LAV.inkSub, marginTop: 2 }}>예쁜 손글씨로 한 줄, 이미지로도 저장돼요</div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: LAV.purple, borderRadius: radius.pill, padding: '9px 15px', flexShrink: 0 }}>쓰기</span>
        </Card>
      </Section>
    </Screen>
  );
}

/** forecast.timeline에서 오늘의 오전(≈9시)·오후(≈15시) 슬롯을 고른다. */
function amPmSlots(forecast: NonNullable<WeatherBundle['forecast']>, date: string) {
  const today = forecast.timeline.filter((s) => s.date === date);
  const pick = (lo: number, hi: number, target: number) => {
    let best: (typeof today)[number] | undefined;
    let bestDist = Infinity;
    for (const s of today) {
      const h = Number(s.time.slice(0, 2));
      if (h >= lo && h <= hi) {
        const d = Math.abs(h - target);
        if (d < bestDist) { bestDist = d; best = s; }
      }
    }
    return best;
  };
  return { am: pick(6, 11, 9), pm: pick(12, 18, 15) };
}

/** 오전/오후 — 날씨모양 아이콘만(비/구름/해/해가린모양). 온도는 적지 않는다(사용자 #6). */
function PartIconCell({ label, s }: { label: string; s?: { iconCode: string } }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: LAV.purpleDeep }}>{label}</span>
      {s != null ? (
        <span style={{ fontSize: 18 }}>{iconEmoji(s.iconCode)}</span>
      ) : (
        <span style={{ fontSize: 12, color: LAV.outline }}>–</span>
      )}
    </span>
  );
}

/** 날씨 한 줄(카드 래퍼 없음) — 위치명 + 현재 아이콘/온도 + 최저/최고 + 오전/오후 날씨모양. */
function WeatherLine({ region, bundle }: { region: Region; bundle: WeatherBundle | null }) {
  const forecast = bundle?.forecast;
  const slot = forecast?.current;
  if (slot == null || forecast == null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <span aria-hidden style={{ fontSize: 13 }}>📍</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: LAV.ink }}>{region.name}</span>
        <span style={{ fontSize: 13, color: LAV.inkSub }}>· 날씨를 불러오는 중…</span>
      </div>
    );
  }
  const todayStr = todayDateString();
  const { am, pm } = amPmSlots(forecast, todayStr);
  // 최저/최고 — API값 우선, 없으면 오늘 타임라인에서 계산(둘 다 항상 표시).
  const dayTemps = forecast.timeline.filter((s) => s.date === todayStr).map((s) => s.temp);
  const hi = forecast.todayMax ?? (dayTemps.length ? Math.max(...dayTemps) : undefined);
  const lo = forecast.todayMin ?? (dayTemps.length ? Math.min(...dayTemps) : undefined);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, rowGap: 6, flexWrap: 'wrap' }}>
      {/* 위치명(어디 날씨인지 명시, 사용자 #6) */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <span aria-hidden style={{ fontSize: 13 }}>📍</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: LAV.ink }}>{region.name}</span>
      </span>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{iconEmoji(slot.iconCode)}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: LAV.ink, flexShrink: 0 }}>{Math.round(slot.temp)}°</span>
      {lo != null && hi != null ? (
        <span style={{ fontSize: 11, fontWeight: 600, color: LAV.inkSub, flexShrink: 0 }}>
          최저 <span style={{ color: '#3B72C4', fontWeight: 800 }}>{Math.round(lo)}°</span>{' '}
          최고 <span style={{ color: '#E0612F', fontWeight: 800 }}>{Math.round(hi)}°</span>
        </span>
      ) : null}
      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <PartIconCell label="오전" s={am} />
        <PartIconCell label="오후" s={pm} />
      </span>
    </div>
  );
}

/**
 * 날씨 카드 — 지역 0개면 설정 유도, 1개면 한 줄, 2개면 한 카드에 2줄(사용자 #3).
 * 카드 전체 탭 → 날씨 상세 오버레이.
 */
function WeatherCard({ regions, weathers, onOpen }: { regions: Region[]; weathers: (WeatherBundle | null)[]; onOpen?: () => void }) {
  const cardSx: CSSProperties = { background: LAV.card, border: `1px solid ${LAV.border}`, boxShadow: LAV_SHADOW };
  if (regions.length === 0) {
    return (
      <Card padding={spacing.md} style={{ ...cardSx, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <span style={{ fontSize: 18 }}>☀️</span>
        <span style={{ fontSize: 14, color: LAV.inkSub }}>MY에서 날씨 지역을 설정해요</span>
      </Card>
    );
  }
  // 2개면 줄 사이 간격을 넉넉히(카드를 키워 2줄 다 보이게).
  return (
    <Card padding={spacing.md} onClick={onOpen} style={{ ...cardSx, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      {regions.map((r, i) => (
        <div
          key={`${r.nx}:${r.ny}:${i}`}
          style={i > 0 ? { paddingTop: spacing.sm, borderTop: `1px solid ${LAV.border}` } : undefined}
        >
          <WeatherLine region={r} bundle={weathers[i] ?? null} />
        </div>
      ))}
    </Card>
  );
}
