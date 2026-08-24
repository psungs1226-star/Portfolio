/**
 * BirthInputs — 생일/시간/음력 입력 묶음(제어 컴포넌트).
 *
 * 온보딩·설정에서 공용으로 쓰는 사주 입력 UI. 저장은 하지 않는다(순수 표시·제어 —
 * 호출부가 storage 접근자로 저장, CRITICAL #1).
 *
 * - 생년월일: **숫자 마스킹 텍스트 입력**. 네이티브 date의 `연도.월.일` 로케일 플레이스홀더와
 *   숫자 오배치(예: `202512.`)를 버리고, 숫자만 받아 `YYYY.MM.DD`로 실시간 포맷한다.
 *   회색 예시(placeholder "예: 1990.01.01")로 형식을 안내한다(#3). 저장 계약은 `YYYY-MM-DD` 유지.
 * - 태어난 시간: **오전/오후 탭 + 시(1~12)·분 숫자 입력**(#3). 내부적으로 `HH:mm`(24h)으로
 *   합성해 SajuInput 계약을 유지한다. "시간을 몰라요" 옵션(TDS Switch, 기본 off)으로 숨길 수 있다.
 * - 음력: TDS Switch.
 *
 * 웹 React + inline style(theme/tokens). RN 프리미티브 금지(CRITICAL #5).
 */
import { useRef, useState, type CSSProperties } from 'react';
import { Switch, Paragraph } from '@toss/tds-mobile';
import { palette, spacing, radius, typography, warm, serene } from '../theme/tokens';
import { isValidBirthDate } from '../features/onboarding/preset';
import { todayDateString } from '../features/fortune/manse';

/** BirthInputs가 다루는 입력 상태(제어형). */
export interface BirthInputsValue {
  /** 생년월일 `YYYY-MM-DD`(빈 문자열 허용 — 미입력). */
  birthDate: string;
  /** 출생 시각 `HH:mm`(선택). */
  birthTime: string;
  /** 시간 모름 여부(기본 false = 입력 모드). */
  timeUnknown: boolean;
  /** 음력 입력 여부. */
  isLunar: boolean;
}

export interface BirthInputsProps extends BirthInputsValue {
  /** 입력 변경 시 변경분(patch)을 올려보낸다. 저장은 호출부 책임. */
  onChange: (patch: Partial<BirthInputsValue>) => void;
  /** 미래 생일 방지용 최대 날짜 `YYYY-MM-DD`. 기본 오늘(로컬). 테스트 주입용. */
  maxDate?: string;
  /**
   * 색 톤. `'serene'`이면 운세 글래스(반투명 흰)+골드 액센트 톤(온보딩 운세 단계),
   * 기본 `'warm'`(설정 화면 등 기존 톤 호환).
   */
  tone?: 'warm' | 'serene';
}

type Ampm = 'AM' | 'PM';

/** 숫자만 추출(최대 8자리) → `YYYY.MM.DD`로 점진적 표시(2025.12 ⭕ / 202512. ❌). */
function maskBirth(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  let out = d.slice(0, 4);
  if (d.length > 4) out += `.${d.slice(4, 6)}`;
  if (d.length > 6) out += `.${d.slice(6, 8)}`;
  return out;
}

/** 마스킹/숫자 입력 → 저장 계약 `YYYY-MM-DD`. 8자리 미만이면 ''(미입력). */
function birthToIso(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  return d.length < 8 ? '' : `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

/** `YYYY-MM-DD` → 표시용 `YYYY.MM.DD`. 빈/형식오류면 ''. */
function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m == null ? '' : `${m[1]}.${m[2]}.${m[3]}`;
}

/** `HH:mm`(24h) → 오전/오후 + 12시제 시·분. 빈/형식오류면 기본값. */
function parseTime(t: string): { ampm: Ampm; h12: string; min: string } {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (m == null) {
    return { ampm: 'AM', h12: '', min: '' };
  }
  const H = Number(m[1]);
  const ampm: Ampm = H >= 12 ? 'PM' : 'AM';
  let h12 = H % 12;
  if (h12 === 0) {
    h12 = 12;
  }
  return { ampm, h12: String(h12), min: m[2] };
}

/** 오전/오후 + 12시제 시·분 → `HH:mm`(24h). 시가 비면 ''(미입력). */
function composeTime(ampm: Ampm, h12: string, min: string): string {
  if (h12 === '') {
    return '';
  }
  const h = Number(h12);
  if (!Number.isFinite(h) || h < 1 || h > 12) {
    return '';
  }
  let h24 = h % 12; // 12 → 0
  if (ampm === 'PM') {
    h24 += 12;
  }
  const mNum = min === '' ? 0 : Math.min(59, Math.max(0, Number(min)));
  const mm = String(mNum).padStart(2, '0');
  return `${String(h24).padStart(2, '0')}:${mm}`;
}

export function BirthInputs({
  birthDate,
  birthTime,
  timeUnknown,
  isLunar,
  onChange,
  maxDate = todayDateString(),
  tone = 'warm',
}: BirthInputsProps) {
  // serene 톤: 운세 상세화면과 같은 글래스+골드. warm 톤: 기존(설정 화면 호환).
  const isSerene = tone === 'serene';
  const accentLine = isSerene ? serene.gold : warm.terracotta;
  const accentBg = isSerene ? 'rgba(197, 163, 88, 0.16)' : warm.honeyBg;
  const accentText = isSerene ? '#8A6D24' : warm.terracotta;
  const labelColor = isSerene ? serene.inkVariant : palette.textSecondary;
  const inputBg = isSerene ? 'rgba(255, 255, 255, 0.32)' : palette.fill;
  const inputBorder = isSerene ? 'rgba(197, 163, 88, 0.38)' : palette.border;
  const inputText = isSerene ? serene.ink : palette.textPrimary;
  // 생년월일 마스킹 텍스트(표시용)는 로컬 상태로 다루고, 8자리가 차면 birthDate(YYYY-MM-DD)로 올린다.
  const [dateText, setDateText] = useState(() => isoToDisplay(birthDate));
  const dateDigits = dateText.replace(/\D/g, '');
  const dateIso = birthToIso(dateText);
  // 8자리 미만이면 입력 중(에러 X). 다 채우면 달력 유효성 + 미래 생일 방지(maxDate) 검사.
  const birthValid =
    dateDigits.length < 8 || (isValidBirthDate(dateIso) && dateIso <= maxDate);

  const handleDateInput = (raw: string) => {
    const masked = maskBirth(raw);
    setDateText(masked);
    const iso = birthToIso(masked);
    // 달력상 유효하고 미래가 아닐 때만 저장값으로 올린다(아니면 미입력 취급).
    onChange({ birthDate: isValidBirthDate(iso) && iso <= maxDate ? iso : '' });
  };

  // 시간 sub-필드(오전/오후·시·분)는 로컬 상태로 다루고 birthTime(HH:mm)으로 합성해 올린다.
  const initTime = parseTime(birthTime);
  const [ampm, setAmpm] = useState<Ampm>(initTime.ampm);
  const [hour12, setHour12] = useState(initTime.h12);
  const [minute, setMinute] = useState(initTime.min);
  // 시 2자리를 채우면 분 입력으로 자동 이동(#4).
  const minuteRef = useRef<HTMLInputElement>(null);

  const fieldLabel: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: labelColor,
    marginBottom: spacing.xxs,
  };
  // 텍스트 input을 TDS 톤(box variant)에 맞춘 inline 스타일.
  const nativeInput = (hasError: boolean): CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: `${spacing.md}px ${spacing.md}px`,
    fontSize: 16,
    color: inputText,
    background: inputBg,
    border: `1px solid ${hasError ? palette.danger : inputBorder}`,
    borderRadius: radius.md,
    appearance: 'none',
    WebkitAppearance: 'none',
  });

  const numInput: CSSProperties = {
    width: 64,
    boxSizing: 'border-box',
    padding: `${spacing.md}px ${spacing.sm}px`,
    fontSize: 16,
    textAlign: 'center',
    color: inputText,
    background: inputBg,
    border: `1px solid ${inputBorder}`,
    borderRadius: radius.md,
    appearance: 'none',
    WebkitAppearance: 'none',
  };

  const ampmChip = (active: boolean): CSSProperties => ({
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.pill,
    border: `1px solid ${active ? accentLine : inputBorder}`,
    background: active ? accentBg : inputBg,
    color: active ? accentText : labelColor,
    fontSize: 14,
    fontWeight: active ? 800 : 500,
    cursor: 'pointer',
  });

  const toggleRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    cursor: 'pointer',
  };

  const updateAmpm = (v: Ampm) => {
    setAmpm(v);
    onChange({ birthTime: composeTime(v, hour12, minute) });
  };
  const updateHour = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 2);
    setHour12(clean);
    onChange({ birthTime: composeTime(ampm, clean, minute) });
    // 2자리를 채우면 분 칸으로 포커스를 옮긴다(#4).
    if (clean.length === 2) {
      minuteRef.current?.focus();
    }
  };
  const updateMinute = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 2);
    setMinute(clean);
    onChange({ birthTime: composeTime(ampm, hour12, clean) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      {/* 생년월일 — 숫자 마스킹 텍스트(YYYY.MM.DD) + 회색 예시 플레이스홀더(#3) */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="birth-date" style={fieldLabel}>
          생년월일
        </label>
        <input
          id="birth-date"
          type="text"
          inputMode="numeric"
          value={dateText}
          placeholder="예: 1990.01.01"
          maxLength={10}
          aria-label="생년월일"
          aria-invalid={!birthValid}
          onChange={(e) => handleDateInput(e.target.value)}
          style={nativeInput(!birthValid)}
        />
        {!birthValid ? (
          <Paragraph
            as="div"
            typography={typography.caption}
            color={palette.danger}
            style={{ marginTop: spacing.xxs }}
          >
            생년월일을 다시 확인해주세요.
          </Paragraph>
        ) : null}
      </div>

      {/* 음력 토글 */}
      <label style={toggleRow}>
        <Paragraph as="span" typography={typography.body}>
          음력으로 입력
        </Paragraph>
        <Switch
          checked={isLunar}
          onChange={() => onChange({ isLunar: !isLunar })}
          aria-label="음력으로 입력"
        />
      </label>

      {/* 태어난 시간 — 오전/오후 탭 + 시·분 숫자(#3). 기본은 입력 모드(timeUnknown=false). */}
      {!timeUnknown ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={fieldLabel}>태어난 시간</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: spacing.xs }}>
              <button
                type="button"
                style={ampmChip(ampm === 'AM')}
                onClick={() => updateAmpm('AM')}
                aria-pressed={ampm === 'AM'}
              >
                오전
              </button>
              <button
                type="button"
                style={ampmChip(ampm === 'PM')}
                onClick={() => updateAmpm('PM')}
                aria-pressed={ampm === 'PM'}
              >
                오후
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={hour12}
              placeholder="12"
              aria-label="태어난 시(1~12)"
              onChange={(e) => updateHour(e.target.value)}
              style={numInput}
            />
            <span style={{ fontSize: 16, color: palette.textTertiary }}>시</span>
            <input
              ref={minuteRef}
              type="text"
              inputMode="numeric"
              value={minute}
              placeholder="00"
              aria-label="태어난 분(0~59)"
              onChange={(e) => updateMinute(e.target.value)}
              style={numInput}
            />
            <span style={{ fontSize: 16, color: palette.textTertiary }}>분</span>
          </div>
        </div>
      ) : null}

      {/* "시간을 몰라요" — 부차 옵션(기본 off) */}
      <label style={toggleRow}>
        <Paragraph as="span" typography={typography.body}>
          태어난 시간을 몰라요
        </Paragraph>
        <Switch
          checked={timeUnknown}
          onChange={() => onChange({ timeUnknown: !timeUnknown })}
          aria-label="태어난 시간을 몰라요"
        />
      </label>
    </div>
  );
}
