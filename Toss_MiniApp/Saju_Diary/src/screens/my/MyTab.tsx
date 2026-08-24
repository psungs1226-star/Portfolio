/**
 * MyTab — MY(프로필) 탭. "Peach Milk" 톤.
 *
 * 홈(프로필 + 통계 + 컬렉션 + 설정) → 각 항목 탭하면 드릴다운 서브뷰(자체 AppBar 뒤로).
 * 위젯 on/off·크기 커스터마이즈를 폐기한 새 IA에서, 옛 WidgetsScreen/WeatherScreen의
 * 설정 로직(생일·캐릭터·글씨체·날씨지역)과 메모/디데이 관리를 한 곳에 모은다.
 *
 * 모든 저장은 storage 접근자만(CRITICAL #1, 로컬 전용). 비즈니스 로직은 보존 모듈 재사용.
 * 라우터 미사용 — 로컬 view state 드릴다운(CRITICAL #5). 웹 React + inline style.
 */
import { useEffect, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { AppBar, Card, Section, SectionHeader, PillButton } from '../../components/ui';
import { TAB_BAR_HEIGHT } from '../../components';
import { peach, accent, spacing, radius, layout } from '../../theme/tokens';
import { SajuMascot } from '../../components/character/SajuMascot';
import { readResizedImage } from '../../components/character/photo';
import { computeTodayFortune } from '../../widgets/fortune-today';
import { todayDateString } from '../../features/fortune/manse';
import { BirthInputs, type BirthInputsValue } from '../../components/BirthInputs';
import { isValidBirthDate } from '../../features/onboarding/preset';
import {
  loadSettings,
  saveSettings,
  loadMemos,
  saveMemos,
  loadDdays,
  saveDdays,
} from '../../features/storage';
import { addMemo, removeMemo, toggleMemo, setMemoCompletedDate } from '../../widgets/memo-ops';
import { ddayLabel } from '../../widgets/dday-calc';
import { PRESET_CITIES, regionFromCity } from '../../widgets/weather-view';
import { shareFortune } from '../../features/share';
import type {
  CharacterKind,
  DiaryFont,
  Dday,
  Memo,
  Region,
  SajuInput,
  Settings,
} from '../../types';

const CHAR_KINDS: { k: CharacterKind; label: string; emoji: string }[] = [
  { k: 'rabbit', label: '토끼', emoji: '🐰' },
  { k: 'cat', label: '고양이', emoji: '🐱' },
  { k: 'dog', label: '강아지', emoji: '🐶' },
  { k: 'otter', label: '수달', emoji: '🦦' },
];
const DIARY_FONTS: { id: DiaryFont; label: string; css: string }[] = [
  { id: 'poorstory', label: '푸어스토리', css: "'PoorStory'" },
  { id: 'himelody', label: '하이멜로디', css: "'HiMelody'" },
  { id: 'gaegu', label: '개구', css: "'Gaegu'" },
  { id: 'dongle', label: '동글', css: "'Dongle'" },
];

/** `YYYY-MM-DD` → `M/D`(앞자리 0 제거). 메모 본문 옆 날짜 표기용. */
function mdLabel(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}`;
}

type View = 'home' | 'saju' | 'naming' | 'character' | 'font' | 'region' | 'memos' | 'ddays';

export interface MyTabProps {
  /** 처음부터 꾸미기(온보딩 재진입). */
  onReconfigure?: () => void;
  /** 오버레이로 띄울 때 시작 화면(홈 메모/디데이 '관리' → 해당 페이지 바로 진입). */
  initialView?: View;
  /** 오버레이 모드에서 뒤로가기 = 오버레이 닫기(미지정 시 홈으로). */
  onExit?: () => void;
}

export function MyTab({ onReconfigure, initialView, onExit }: MyTabProps = {}) {
  const today = todayDateString();
  const [view, setView] = useState<View>(initialView ?? 'home');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [ddays, setDdays] = useState<Dday[]>([]);

  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => alive && setSettings(s)).catch(() => {});
    loadMemos().then((m) => alive && setMemos(m)).catch(() => {});
    loadDdays().then((d) => alive && setDdays(d)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const persist = (next: Settings) => {
    setSettings(next);
    saveSettings(next).catch(() => {});
  };
  const persistMemos = (next: Memo[]) => {
    setMemos(next);
    saveMemos(next).catch(() => {});
  };
  const persistDdays = (next: Dday[]) => {
    setDdays(next);
    saveDdays(next).catch(() => {});
  };

  const saju = settings?.saju;
  const hasBirth = saju?.birthDate != null && saju.birthDate !== '';
  const kind = settings?.characterKind ?? 'rabbit';
  const charName = (settings?.characterName?.trim() ?? '') !== ''
    ? settings!.characterName!.trim()
    : (CHAR_KINDS.find((c) => c.k === kind)?.label ?? '내 캐릭터');

  const onShare = () => {
    if (!hasBirth) return;
    try {
      const f = computeTodayFortune(saju!, today);
      shareFortune(f.result).catch(() => {});
    } catch {
      /* noop */
    }
  };

  const back = () => (onExit != null ? onExit() : setView('home'));

  // ── 드릴다운 서브뷰 ──
  if (view !== 'home') {
    let title = '';
    let body: ReactNode = null;
    if (view === 'saju') {
      title = '생일 · 사주';
      body = <SajuEditor settings={settings} onSave={(s) => { persist(s); back(); }} />;
    } else if (view === 'naming') {
      title = '이름 · 별명';
      body = <NameEditor settings={settings} onChange={persist} />;
    } else if (view === 'character') {
      title = '캐릭터';
      body = <CharacterEditor settings={settings} onChange={persist} />;
    } else if (view === 'font') {
      title = '일기 글씨체';
      body = <FontEditor settings={settings} onChange={persist} />;
    } else if (view === 'region') {
      title = '날씨 지역';
      body = <RegionEditor settings={settings} onChange={persist} />;
    } else if (view === 'memos') {
      title = '메모 · 할 일';
      body = <MemoManager memos={memos} today={today} onChange={persistMemos} />;
    } else if (view === 'ddays') {
      title = '디데이';
      body = <DdayManager ddays={ddays} today={today} onChange={persistDdays} />;
    }
    return (
      <Shell title={title} onBack={back}>
        {body}
      </Shell>
    );
  }

  // ── 홈 ──
  return (
    <Shell title="MY">
      {/* 캐릭터 카드/버튼 폐기 — 맨 위는 'MY' 타이틀만. 이름·별명·캐릭터는 모두 설정 행으로. */}
      {/* 컬렉션 */}
      <Section gap={spacing.sm}>
        <SectionHeader title="내 기록" />
        <Card padding={spacing.xs}>
          <Row icon="📝" label="메모 · 할 일" value={`${memos.length}개`} onClick={() => setView('memos')} />
          <Divider />
          <Row icon="📅" label="디데이" value={`${ddays.length}개`} onClick={() => setView('ddays')} />
        </Card>
      </Section>

      {/* 설정 */}
      <Section gap={spacing.sm} style={{ marginTop: spacing.xl }}>
        <SectionHeader title="설정" />
        <Card padding={spacing.xs}>
          <Row icon="🎂" label="생일 · 사주" value={hasBirth ? saju!.birthDate : '미설정'} onClick={() => setView('saju')} />
          <Divider />
          <Row icon="🙋" label="이름 · 별명" value={`${(settings?.userName?.trim() || '미설정')} · ${charName}`} onClick={() => setView('naming')} />
          <Divider />
          <Row icon={CHAR_KINDS.find((c) => c.k === kind)?.emoji ?? '🐰'} label="캐릭터" value={settings?.characterPhoto != null ? '내 사진' : (CHAR_KINDS.find((c) => c.k === kind)?.label ?? '기본')} onClick={() => setView('character')} />
          <Divider />
          <Row icon="✍️" label="일기 글씨체" value={DIARY_FONTS.find((f) => f.id === (settings?.diary?.font ?? 'poorstory'))?.label} onClick={() => setView('font')} />
          <Divider />
          <Row icon="📍" label="날씨 지역" value={settings?.weather.regions.map((r) => r.name).join(', ') || '미설정'} onClick={() => setView('region')} />
        </Card>
      </Section>

      {/* 기타 */}
      <Section gap={spacing.sm} style={{ marginTop: spacing.xl }}>
        <Card padding={spacing.xs}>
          {hasBirth ? (
            <>
              <Row icon="💌" label="오늘 운세 공유하기" onClick={onShare} />
              <Divider />
            </>
          ) : null}
          <Row icon="✨" label="처음부터 다시 꾸미기" onClick={onReconfigure} />
        </Card>
        <p style={{ margin: `${spacing.md}px 0 0`, fontSize: 12, color: peach.outline, textAlign: 'center', lineHeight: 1.6 }}>
          모든 기록은 이 기기에만 저장돼요.
        </p>
      </Section>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// 공용 셸 / 행 / 구분선
// ─────────────────────────────────────────────────────────────
function Shell({ title, onBack, children }: { title: string; onBack?: () => void; children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: peach.surface,
        paddingBottom: `calc(${TAB_BAR_HEIGHT + 24}px + env(safe-area-inset-bottom, 0px))`,
        boxSizing: 'border-box',
      }}
    >
      <AppBar title={title} onBack={onBack} />
      <div style={{ padding: `${spacing.sm}px ${layout.screenPaddingX}px 0` }}>{children}</div>
    </div>
  );
}

function Row({ icon, label, value, onClick }: { icon: string; label: string; value?: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        width: '100%',
        border: 'none',
        background: 'transparent',
        padding: `${spacing.sm}px ${spacing.sm}px`,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 19, width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: peach.onSurface }}>{label}</span>
      {value != null ? (
        <span style={{ fontSize: 13, color: peach.outline, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      ) : null}
      <span style={{ fontSize: 18, color: peach.outline, flexShrink: 0 }}>›</span>
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: peach.outlineVariant, margin: `0 ${spacing.sm}px` }} />;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: peach.primary, marginBottom: spacing.sm }}>{children}</div>;
}

// ─────────────────────────────────────────────────────────────
// 생일 · 사주 편집
// ─────────────────────────────────────────────────────────────
function SajuEditor({ settings, onSave }: { settings: Settings | null; onSave: (s: Settings) => void }) {
  const s = settings?.saju;
  const [v, setV] = useState<BirthInputsValue>({
    birthDate: s?.birthDate ?? '',
    birthTime: s?.birthTime ?? '',
    timeUnknown: s?.birthTime == null,
    isLunar: s?.isLunar ?? false,
  });
  const [err, setErr] = useState('');
  const valid = isValidBirthDate(v.birthDate);

  const save = () => {
    if (settings == null) return;
    if (!valid) {
      setErr('생년월일을 정확히 입력해주세요.');
      return;
    }
    const saju: SajuInput = { birthDate: v.birthDate, isLunar: v.isLunar };
    if (!v.timeUnknown && v.birthTime !== '') saju.birthTime = v.birthTime;
    onSave({ ...settings, saju });
  };

  return (
    <Section gap={spacing.md}>
      <Card>
        <BirthInputs
          birthDate={v.birthDate}
          birthTime={v.birthTime}
          timeUnknown={v.timeUnknown}
          isLunar={v.isLunar}
          onChange={(patch) => {
            setV((prev) => ({ ...prev, ...patch }));
            setErr('');
          }}
          tone="warm"
        />
      </Card>
      {err !== '' ? <p style={{ margin: 0, fontSize: 13, color: accent.coral, fontWeight: 600 }}>{err}</p> : null}
      <PillButton variant="primary" full onClick={save}>
        저장
      </PillButton>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// 캐릭터(종류) — 라이브 미리보기
// ─────────────────────────────────────────────────────────────
function CharacterEditor({ settings, onChange }: { settings: Settings | null; onChange: (s: Settings) => void }) {
  const [imgErr, setImgErr] = useState('');
  if (settings == null) return null;
  const kind = settings.characterKind ?? 'rabbit';
  const photo = settings.characterPhoto;
  const setKind = (k: CharacterKind) => onChange({ ...settings, characterKind: k });

  const onPickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (file == null) return;
    setImgErr('');
    try {
      const url = await readResizedImage(file, 320);
      onChange({ ...settings, characterPhoto: url });
    } catch {
      setImgErr('사진을 불러오지 못했어요. 다른 이미지로 시도해 주세요.');
    }
  };
  const clearPhoto = () => {
    const next = { ...settings };
    delete next.characterPhoto;
    onChange(next);
  };

  return (
    <Section gap={spacing.lg}>
      <Card style={{ display: 'flex', justifyContent: 'center', padding: spacing.xl }}>
        <SajuMascot kind={kind} photoUrl={photo} size={120} />
      </Card>

      {/* 사진 커스텀 — 사용자가 직접 올린 이미지로 캐릭터 교체(로컬 저장, CRITICAL #1) */}
      <Card>
        <FieldLabel>내 사진으로 꾸미기</FieldLabel>
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
              onClick={clearPhoto}
              style={{ flex: '0 0 auto', border: `1.5px solid ${peach.outlineVariant}`, borderRadius: radius.pill, background: peach.card, color: peach.onSurfaceVar, fontSize: 14, fontWeight: 700, padding: '12px 18px', cursor: 'pointer' }}
            >
              기본으로
            </button>
          ) : null}
        </div>
        <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: 12, color: peach.onSurfaceVar, lineHeight: 1.5 }}>
          사진을 올리면 아래 종류 대신 내 사진이 캐릭터로 보여요. 기기에만 저장돼요.
        </p>
        {imgErr !== '' ? <p style={{ margin: `6px 0 0`, fontSize: 12, color: accent.coral, fontWeight: 600 }}>{imgErr}</p> : null}
      </Card>

      <Card>
        <FieldLabel>종류{photo != null ? ' (사진 사용 중 — 기본으로 돌리면 적용)' : ''}</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {CHAR_KINDS.map((c) => (
            <ChoiceChip key={c.k} active={kind === c.k} onClick={() => setKind(c.k)}>
              {c.emoji} {c.label}
            </ChoiceChip>
          ))}
        </div>
      </Card>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// 이름 · 별명 — 부르는 이름(홈 인사) + 캐릭터 별명
// ─────────────────────────────────────────────────────────────
function NameEditor({ settings, onChange }: { settings: Settings | null; onChange: (s: Settings) => void }) {
  if (settings == null) return null;
  const kindLabel = CHAR_KINDS.find((c) => c.k === (settings.characterKind ?? 'rabbit'))?.label ?? '';
  const setUserName = (v: string) => onChange({ ...settings, userName: v.slice(0, 12) });
  const setCharName = (v: string) => onChange({ ...settings, characterName: v.slice(0, 10) });
  return (
    <Section gap={spacing.lg}>
      <Card>
        <FieldLabel>나를 부르는 이름</FieldLabel>
        <input
          value={settings.userName ?? ''}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="예: 지우 (홈 인사에 사용)"
          maxLength={12}
          style={{ ...inputStyle, width: '100%' }}
        />
      </Card>
      <Card>
        <FieldLabel>캐릭터 별명</FieldLabel>
        <input
          value={settings.characterName ?? ''}
          onChange={(e) => setCharName(e.target.value)}
          placeholder={`예: 까루 (기본: ${kindLabel})`}
          maxLength={10}
          style={{ ...inputStyle, width: '100%' }}
        />
      </Card>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// 일기 글씨체
// ─────────────────────────────────────────────────────────────
function FontEditor({ settings, onChange }: { settings: Settings | null; onChange: (s: Settings) => void }) {
  if (settings == null) return null;
  const cur = settings.diary?.font ?? 'poorstory';
  const set = (font: DiaryFont) => onChange({ ...settings, diary: { ...settings.diary, font } });
  return (
    <Section gap={spacing.sm}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {DIARY_FONTS.map((f) => {
            const on = cur === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => set(f.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: `1.5px solid ${on ? accent.coral : peach.outlineVariant}`,
                  background: on ? 'rgba(154, 119, 214, 0.12)' : peach.card,
                  borderRadius: radius.md,
                  padding: `${spacing.md}px ${spacing.lg}px`,
                  cursor: 'pointer',
                }}
              >
                {/* 라벨도 해당 글씨체로 — 사람들이 폰트를 한눈에 알아보게(#10) */}
                <span style={{ fontFamily: f.css, fontSize: 19, fontWeight: 700, color: on ? accent.coral : peach.onSurfaceVar }}>{f.label}</span>
                <span style={{ fontFamily: f.css, fontSize: 26, color: peach.onSurface }}>다정한 하루</span>
              </button>
            );
          })}
        </div>
      </Card>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// 날씨 지역(최대 2)
// ─────────────────────────────────────────────────────────────
function RegionEditor({ settings, onChange }: { settings: Settings | null; onChange: (s: Settings) => void }) {
  if (settings == null) return null;
  const regions = settings.weather.regions;
  const has = (name: string) => regions.some((r) => r.name === name);
  const toggle = (name: string) => {
    let next: Region[];
    if (has(name)) {
      next = regions.filter((r) => r.name !== name);
    } else {
      if (regions.length >= 2) return;
      const r = regionFromCity(name);
      if (r == null) return;
      next = [...regions, r];
    }
    onChange({ ...settings, weather: { ...settings.weather, regions: next } });
  };
  const full = regions.length >= 2;

  return (
    <Section gap={spacing.sm}>
      <p style={{ margin: 0, fontSize: 13, color: peach.onSurfaceVar }}>최대 2곳까지 고를 수 있어요. (현재 {regions.length}/2)</p>
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {PRESET_CITIES.map((c) => {
            const on = has(c.name);
            const disabled = !on && full;
            return (
              <ChoiceChip key={c.name} active={on} disabled={disabled} onClick={() => toggle(c.name)}>
                {c.name}
              </ChoiceChip>
            );
          })}
        </div>
      </Card>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// 메모 · 할 일 관리
// ─────────────────────────────────────────────────────────────
function MemoManager({ memos, today, onChange }: { memos: Memo[]; today: string; onChange: (m: Memo[]) => void }) {
  const [text, setText] = useState('');
  const [isTodo, setIsTodo] = useState(false); // 기본 = 메모(사용자 요청)
  const [date, setDate] = useState(today); // 날짜 지정(기본 오늘) — 사용자 요청
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const add = () => {
    if (text.trim() === '') return;
    onChange(addMemo(memos, { id: `m-${Date.now()}`, date: date || today, text: text.trim(), isTodo }));
    setText('');
  };
  // 할 일 완료 토글 — 완료 시 오늘 날짜로 완료 처리(그날 일기 '오늘 한 일'에 연동).
  const toggleDone = (id: string) => onChange(toggleMemo(memos, id, { completedDate: today }));
  const startEdit = (m: Memo) => {
    setEditingId(m.id);
    setEditText(m.text);
  };
  const commitEdit = () => {
    if (editingId == null) return;
    const t = editText.trim();
    if (t !== '') onChange(memos.map((m) => (m.id === editingId ? { ...m, text: t } : m)));
    setEditingId(null);
    setEditText('');
  };
  return (
    <Section gap={spacing.md}>
      <Card>
        <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder="새 메모 / 할 일"
            style={inputStyle}
          />
          <PillButton variant="primary" onClick={add} style={{ padding: '0 18px', flexShrink: 0 }}>
            추가
          </PillButton>
        </div>
        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          <ChoiceChip active={!isTodo} onClick={() => setIsTodo(false)}>메모</ChoiceChip>
          <ChoiceChip active={isTodo} onClick={() => setIsTodo(true)}>할 일</ChoiceChip>
          {/* 날짜 지정 — '할 일'일 때만(메모엔 날짜 없음, 사용자 요청) */}
          {isTodo && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="날짜 지정"
              style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: 130, padding: '8px 12px' }}
            />
          )}
        </div>
      </Card>

      {memos.length === 0 ? (
        <EmptyNote>아직 메모가 없어요.</EmptyNote>
      ) : (
        <Card padding={spacing.xs}>
          {memos.map((m, i) => (
            <div key={m.id}>
              {i > 0 ? <Divider /> : null}
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: `${spacing.sm}px` }}>
                {editingId === m.id ? (
                  <input
                    value={editText}
                    autoFocus
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditingId(null); } }}
                    onBlur={commitEdit}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    style={{ flex: 1, border: 'none', background: 'transparent', textAlign: 'left', fontSize: 15, color: m.checked ? peach.outline : peach.onSurface, textDecoration: m.checked ? 'line-through' : 'none', cursor: 'pointer', padding: 0, minWidth: 0 }}
                  >
                    {m.text}
                    {/* 날짜는 '할 일'에만 본문 옆 (M/D)로 — 예: 간식사기(6/30) (사용자 요청) */}
                    {m.isTodo ? <span style={{ color: peach.outline, fontWeight: 400 }}>({mdLabel(m.date)})</span> : null}
                  </button>
                )}
                {/* 완료한 항목 — 완료 날짜 입력(언제 완료했는지 → 그날 일기 '오늘 한 일'에 연동) */}
                {m.checked ? (
                  <input
                    type="date"
                    value={m.completedDate ?? today}
                    onChange={(e) => onChange(setMemoCompletedDate(memos, m.id, e.target.value))}
                    aria-label="완료한 날짜"
                    style={{ ...inputStyle, width: 'auto', flexShrink: 0, padding: '5px 8px', fontSize: 12 }}
                  />
                ) : null}
                {/* 완료 체크박스 — 오른쪽(사용자 요청). 체크하면 완료일=오늘로 시작, 위 입력에서 변경 가능 */}
                <button
                  type="button"
                  onClick={() => toggleDone(m.id)}
                  aria-label={m.checked ? '완료 해제' : '완료'}
                  style={{
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    borderRadius: 7,
                    border: `2px solid ${m.checked ? peach.primary : peach.outlineVariant}`,
                    background: m.checked ? peach.primary : 'transparent',
                    color: '#fff',
                    fontSize: 14,
                    lineHeight: 1,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {m.checked ? '✓' : ''}
                </button>
                <DeleteBtn onClick={() => onChange(removeMemo(memos, m.id))} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// 디데이 관리
// ─────────────────────────────────────────────────────────────
function DdayManager({ ddays, today, onChange }: { ddays: Dday[]; today: string; onChange: (d: Dday[]) => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const add = () => {
    if (title.trim() === '' || !isValidBirthDate(date)) return;
    const next: Dday = { id: `dday-${Date.now()}`, title: title.trim(), targetDate: date, size: 'small' };
    onChange([...ddays, next]);
    setTitle('');
    setDate('');
  };
  return (
    <Section gap={spacing.md}>
      <Card>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="디데이 이름 (예: 여행)" style={{ ...inputStyle, marginBottom: spacing.sm }} />
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            inputMode="numeric"
            style={inputStyle}
          />
          <PillButton variant="primary" onClick={add} style={{ padding: '0 18px', flexShrink: 0 }}>
            추가
          </PillButton>
        </div>
      </Card>

      {ddays.length === 0 ? (
        <EmptyNote>아직 디데이가 없어요.</EmptyNote>
      ) : (
        <Card padding={spacing.xs}>
          {ddays.map((dd, i) => {
            const lab = ddayLabel(dd.targetDate, today);
            return (
              <div key={dd.id}>
                {i > 0 ? <Divider /> : null}
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: `${spacing.sm}px` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: peach.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dd.title}</div>
                    <div style={{ fontSize: 12, color: peach.outline }}>{dd.targetDate}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: accent.coral }}>{lab.text}</span>
                  <DeleteBtn onClick={() => onChange(ddays.filter((x) => x.id !== dd.id))} />
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// 공용 작은 조각
// ─────────────────────────────────────────────────────────────
function ChoiceChip({ children, active, disabled, onClick }: { children: ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void }) {
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

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="삭제"
      onClick={onClick}
      style={{ border: 'none', background: 'transparent', color: peach.outline, fontSize: 18, cursor: 'pointer', padding: 4, flexShrink: 0 }}
    >
      ✕
    </button>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontSize: 14, color: peach.outline, textAlign: 'center', padding: `${spacing.lg}px 0` }}>{children}</p>;
}

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: `1.5px solid ${peach.outlineVariant}`,
  borderRadius: radius.md,
  background: peach.card,
  padding: `${spacing.sm + 1}px ${spacing.md}px`,
  fontSize: 15,
  color: peach.onSurface,
  outline: 'none',
  boxSizing: 'border-box',
};
