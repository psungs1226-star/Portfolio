/**
 * OnboardingScreen — 첫 실행/재설정 온보딩. "Peach Milk" 3스텝.
 *
 * 위젯 on/off·크기 선택을 폐기한 새 IA에 맞춰 단순화한다:
 *   ① 생일(사주) → ② 캐릭터(종류·색) → ③ 날씨 지역.
 * 홈은 고정 큐레이션이므로 위젯은 기본 프리셋(defaultPresetSettings)으로 고정 저장한다.
 *
 * 저장은 storage 접근자만(CRITICAL #1, 로컬 전용). 생일 미입력 가능(필수 게이트 금지) — 언제든 건너뛰기.
 * 라우터 미사용 — step state(CRITICAL #5). 웹 React + inline style(theme/tokens).
 */
import { useMemo, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { Card, PillButton } from '../../components/ui';
import { peach, accent, spacing, radius } from '../../theme/tokens';
import { SajuMascot } from '../../components/character/SajuMascot';
import { readResizedImage } from '../../components/character/photo';
import { computeTodayFortune, buildSummaryLine } from '../../widgets/fortune-today';
import { todayDateString } from '../../features/fortune/manse';
import { BirthInputs, type BirthInputsValue } from '../../components/BirthInputs';
import { isValidBirthDate, defaultPresetSettings } from '../../features/onboarding/preset';
import { saveSettings, saveOnboarded } from '../../features/storage';
import { PRESET_CITIES, regionFromCity } from '../../widgets/weather-view';
import type { CharacterKind, Region, SajuInput, Settings } from '../../types';

const SAMPLE_SAJU: SajuInput = { birthDate: '1994-05-20', isLunar: false };
const TOTAL = 4;

const CHAR_KINDS: { k: CharacterKind; label: string; emoji: string }[] = [
  { k: 'rabbit', label: '토끼', emoji: '🐰' },
  { k: 'cat', label: '고양이', emoji: '🐱' },
  { k: 'dog', label: '강아지', emoji: '🐶' },
  { k: 'otter', label: '수달', emoji: '🦦' },
];

export interface OnboardingScreenProps {
  /** 완료/건너뛰기 후 호출(App이 홈으로 전환). */
  onDone: () => void;
  /** 'reconfigure'면 기존 설정 prefill(처음부터 꾸미기). */
  mode?: 'first' | 'reconfigure';
  initialSaju?: SajuInput;
  initialCharacterKind?: CharacterKind;
  /** 재설정 시 기존 호칭 이름 prefill. */
  initialUserName?: string;
  /** 재설정 시 기존 캐릭터 별명 prefill. */
  initialCharacterName?: string;
  /** 재설정 시 기존 캐릭터 사진 prefill. */
  initialCharacterPhoto?: string;
  /** 재설정 시 기존 날씨 지역 prefill. */
  preserveWeather?: Settings['weather'];
}

export function OnboardingScreen({
  onDone,
  mode = 'first',
  initialSaju,
  initialCharacterKind,
  initialUserName,
  initialCharacterName,
  initialCharacterPhoto,
  preserveWeather,
}: OnboardingScreenProps) {
  const today = todayDateString();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState(initialUserName ?? '');
  const [charName, setCharName] = useState(initialCharacterName ?? '');
  const [photo, setPhoto] = useState<string | undefined>(initialCharacterPhoto);
  const [imgErr, setImgErr] = useState('');

  const onPickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file == null) return;
    setImgErr('');
    try {
      setPhoto(await readResizedImage(file, 320));
    } catch {
      setImgErr('사진을 불러오지 못했어요. 다른 이미지로 시도해 주세요.');
    }
  };

  const [birth, setBirth] = useState<BirthInputsValue>({
    birthDate: initialSaju?.birthDate ?? '',
    birthTime: initialSaju?.birthTime ?? '',
    // 시작 시 시간 입력창이 무조건 바로 보이게(사용자 요청) — '시간을 몰라요'를 디폴트로 두지 않는다.
    // 재설정이라도 기존 시간이 있으면 입력 모드, 없을 때만 입력 모드로 시작(둘 다 false).
    timeUnknown: false,
    isLunar: initialSaju?.isLunar ?? false,
  });
  const [kind, setKind] = useState<CharacterKind>(initialCharacterKind ?? 'rabbit');
  const [regions, setRegions] = useState<Region[]>(preserveWeather?.regions ?? []);

  const birthValid = birth.birthDate === '' || isValidBirthDate(birth.birthDate);
  const saju = useMemo<SajuInput | undefined>(() => {
    if (!(birth.birthDate && isValidBirthDate(birth.birthDate))) return undefined;
    const s: SajuInput = { birthDate: birth.birthDate, isLunar: birth.isLunar };
    if (!birth.timeUnknown && birth.birthTime !== '') s.birthTime = birth.birthTime;
    return s;
  }, [birth]);

  const previewLine = useMemo(() => {
    try {
      return buildSummaryLine(computeTodayFortune(saju ?? SAMPLE_SAJU, today).result);
    } catch {
      return null;
    }
  }, [saju, today]);

  async function commit(s: Settings) {
    if (saving) return;
    setSaving(true);
    try {
      await saveSettings(s);
      await saveOnboarded(true);
      onDone();
    } catch {
      onDone();
    }
  }

  function finish() {
    const next = defaultPresetSettings();
    if (saju != null) next.saju = saju;
    next.characterKind = kind;
    const trimmedName = userName.trim();
    if (trimmedName !== '') next.userName = trimmedName;
    const trimmedChar = charName.trim();
    if (trimmedChar !== '') next.characterName = trimmedChar;
    if (photo != null && photo !== '') next.characterPhoto = photo;
    next.weather = { regions };
    void commit(next);
  }

  function skip() {
    void commit(defaultPresetSettings());
  }

  const isLast = step === TOTAL - 1;
  const toggleRegion = (name: string) => {
    setRegions((prev) => {
      if (prev.some((r) => r.name === name)) return prev.filter((r) => r.name !== name);
      if (prev.length >= 2) return prev;
      const r = regionFromCity(name);
      return r != null ? [...prev, r] : prev;
    });
  };

  return (
    <div style={pageStyle}>
      {/* 상단: 로고 + 건너뛰기 */}
      <div style={topBar}>
        <img src="/logo-192.png" width={36} height={36} alt="Evry Times" style={{ borderRadius: radius.sm }} />
        <button type="button" style={skipBtn} onClick={skip} disabled={saving}>
          건너뛰기
        </button>
      </div>

      {/* 진행 점 */}
      <div style={dotsWrap} aria-label={`${step + 1} / ${TOTAL} 단계`}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <span key={i} style={dotStyle(i === step)} aria-hidden />
        ))}
      </div>

      <div style={bodyStyle}>
        {step === 0 ? (
          <>
            <Hero emoji="✨" title="어떻게 불러드릴까요?" subtitle="홈에서 매일 이 이름으로 인사해 드려요. 나중에 바꿀 수 있어요." />
            <Card>
              <FieldLabel>부를 이름</FieldLabel>
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value.slice(0, 12))}
                placeholder="예: 지우"
                maxLength={12}
                style={textInput}
              />
            </Card>
            <Card tint="peach" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: peach.primary }}>홈 인사 미리보기</span>
              <span className="display-font" style={{ fontSize: 18, color: peach.primaryDeep, lineHeight: 1.4 }}>
                {userName.trim() !== '' ? `${userName.trim()}님 ` : ''}오늘 하루도 행운 가득한 날이 되세요! ✨
              </span>
            </Card>
          </>
        ) : step === 1 ? (
          <>
            <Hero emoji="🔮" title="생일을 알려주세요" subtitle="매일 바뀌는 나만의 사주 운세를 봐요. 지금 건너뛰어도 괜찮아요." />
            <Card>
              <BirthInputs
                birthDate={birth.birthDate}
                birthTime={birth.birthTime}
                timeUnknown={birth.timeUnknown}
                isLunar={birth.isLunar}
                onChange={(patch) => setBirth((prev) => ({ ...prev, ...patch }))}
                tone="warm"
              />
            </Card>
            {previewLine != null ? (
              <Card tint="peach" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: peach.primary }}>
                  오늘의 운세 미리보기{saju == null ? ' (예시)' : ''}
                </span>
                <span className="display-font" style={{ fontSize: 18, color: peach.primaryDeep }}>{previewLine}</span>
              </Card>
            ) : null}
          </>
        ) : step === 2 ? (
          <>
            <Hero emoji="🐾" title="내 캐릭터를 골라요" subtitle="동물을 고르거나 내 사진을 올리고, 매일 함께할 별명을 지어주세요." />
            <Card style={{ display: 'flex', justifyContent: 'center', padding: spacing.xl }}>
              <SajuMascot kind={kind} photoUrl={photo} size={140} />
            </Card>
            <Card>
              <FieldLabel>내 사진으로 꾸미기 (선택)</FieldLabel>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <label
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    border: 'none',
                    borderRadius: radius.pill,
                    background: accent.coral,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 800,
                    padding: '12px 0',
                    cursor: 'pointer',
                  }}
                >
                  📷 {photo != null ? '사진 바꾸기' : '사진 올리기'}
                  <input type="file" accept="image/*" onChange={onPickPhoto} style={{ display: 'none' }} />
                </label>
                {photo != null ? (
                  <button
                    type="button"
                    onClick={() => setPhoto(undefined)}
                    style={{ flex: '0 0 auto', border: `1.5px solid ${peach.outlineVariant}`, borderRadius: radius.pill, background: peach.card, color: peach.onSurfaceVar, fontSize: 14, fontWeight: 700, padding: '12px 18px', cursor: 'pointer' }}
                  >
                    기본으로
                  </button>
                ) : null}
              </div>
              {imgErr !== '' ? <p style={{ margin: '8px 0 0', fontSize: 12, color: accent.coral, fontWeight: 600 }}>{imgErr}</p> : null}
            </Card>
            <Card>
              <FieldLabel>종류{photo != null ? ' (사진 사용 중 — 기본으로 돌리면 적용)' : ''}</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                {CHAR_KINDS.map((c) => (
                  <Chip key={c.k} active={kind === c.k} onClick={() => setKind(c.k)}>
                    {c.emoji} {c.label}
                  </Chip>
                ))}
              </div>
            </Card>
            <Card>
              <FieldLabel>별명을 지어주세요</FieldLabel>
              <input
                value={charName}
                onChange={(e) => setCharName(e.target.value.slice(0, 10))}
                placeholder={`예: 복실이 (기본: ${CHAR_KINDS.find((c) => c.k === kind)?.label})`}
                maxLength={10}
                style={textInput}
              />
            </Card>
          </>
        ) : (
          <>
            <Hero emoji="📍" title="날씨 지역을 골라요" subtitle="최대 2곳까지 고를 수 있어요. 나중에 MY에서 바꿀 수 있어요." />
            <Card>
              <FieldLabel>지역 ({regions.length}/2)</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                {PRESET_CITIES.map((c) => {
                  const on = regions.some((r) => r.name === c.name);
                  const disabled = !on && regions.length >= 2;
                  return (
                    <Chip key={c.name} active={on} disabled={disabled} onClick={() => toggleRegion(c.name)}>
                      {c.name}
                    </Chip>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* CTA 바 */}
      <div style={ctaBar}>
        {step > 0 ? (
          <PillButton variant="tonal" onClick={() => setStep((s) => s - 1)} style={{ flex: '0 0 auto', padding: '14px 22px' }}>
            이전
          </PillButton>
        ) : null}
        <PillButton
          variant="primary"
          full
          onClick={() => {
            if (step === 1 && !birthValid) return;
            if (isLast) finish();
            else setStep((s) => s + 1);
          }}
          style={{ opacity: step === 1 && !birthValid ? 0.5 : 1 }}
        >
          {isLast ? (mode === 'reconfigure' ? '저장하고 시작' : '시작하기') : '다음'}
        </PillButton>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 조각
// ─────────────────────────────────────────────────────────────
function Hero({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: 'center', padding: `${spacing.md}px 0 ${spacing.xs}px` }}>
      <div style={{ fontSize: 40 }}>{emoji}</div>
      <h1 className="display-font" style={{ margin: `${spacing.sm}px 0 0`, fontSize: 25, fontWeight: 400, color: peach.onSurface, letterSpacing: -0.4 }}>
        {title}
      </h1>
      <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: 14, color: peach.onSurfaceVar, lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: peach.primary, marginBottom: spacing.sm }}>{children}</div>;
}

const textInput: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1.5px solid ${peach.outlineVariant}`,
  borderRadius: radius.md,
  background: peach.surface,
  color: peach.onSurface,
  fontSize: 16,
  fontWeight: 600,
  padding: '13px 14px',
  outline: 'none',
};

function Chip({ children, active, disabled, onClick }: { children: ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1.5px solid ${active ? accent.coral : peach.outlineVariant}`,
        background: active ? 'rgba(154, 119, 214, 0.12)' : peach.card,
        color: disabled ? peach.outline : active ? accent.coral : peach.onSurfaceVar,
        borderRadius: radius.pill,
        padding: '9px 16px',
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  background: peach.surface,
  overflowX: 'hidden',
  boxSizing: 'border-box',
};
const topBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `calc(env(safe-area-inset-top, 0px) + ${spacing.md}px) ${spacing.xl}px 0`,
};
const skipBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  color: peach.outline,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  padding: spacing.xs,
};
const dotsWrap: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: spacing.xs,
  paddingTop: spacing.md,
};
function dotStyle(active: boolean): CSSProperties {
  return {
    width: active ? 20 : 8,
    height: 8,
    borderRadius: radius.pill,
    background: active ? accent.coral : peach.outlineVariant,
    transition: 'width 0.15s ease, background 0.15s ease',
  };
}
const bodyStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
  padding: `${spacing.md}px ${spacing.xl}px ${spacing.lg}px`,
  overflowY: 'auto',
};
const ctaBar: CSSProperties = {
  display: 'flex',
  gap: spacing.sm,
  padding: `${spacing.md}px ${spacing.xl}px`,
  paddingBottom: `calc(${spacing.md}px + env(safe-area-inset-bottom, 0px))`,
  borderTop: `1px solid ${peach.outlineVariant}`,
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  position: 'sticky',
  bottom: 0,
};
