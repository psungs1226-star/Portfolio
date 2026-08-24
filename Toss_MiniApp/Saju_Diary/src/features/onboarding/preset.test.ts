import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WidgetType } from '../../types';
import {
  WIDGET_ORDER,
  DEFAULT_WIDGET_SIZE,
  buildWidgetConfigs,
  defaultPresetSettings,
  settingsFromOnboarding,
  isValidBirthDate,
  type OnboardingResult,
} from './preset';
import {
  setStorageAdapter,
  loadSettings,
  saveSettings,
  loadOnboarded,
  saveOnboarded,
  type StorageAdapter,
} from '../storage';

// ── 메모리 mock 어댑터 (storage 라운드트립용) ──
function createMemoryAdapter() {
  const store = new Map<string, string>();
  const adapter: StorageAdapter = {
    getItem: vi.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
  return { adapter, store };
}

function enabledTypesOf(widgets: { type: WidgetType; enabled: boolean }[]): WidgetType[] {
  return widgets.filter((w) => w.enabled).map((w) => w.type);
}

describe('buildWidgetConfigs', () => {
  it('always emits all widget types in fixed order', () => {
    const configs = buildWidgetConfigs(['memo']);
    expect(configs.map((c) => c.type)).toEqual([...WIDGET_ORDER]);
    expect(configs.map((c) => c.order)).toEqual(WIDGET_ORDER.map((_, i) => i));
  });

  it('marks only selected types enabled', () => {
    const configs = buildWidgetConfigs(['weather', 'dday']);
    expect(enabledTypesOf(configs)).toEqual(['weather', 'dday']);
  });

  it('uses default sizes (weather/fortune compact)', () => {
    const configs = buildWidgetConfigs(['weather', 'fortune']);
    const byType = Object.fromEntries(configs.map((c) => [c.type, c.size]));
    expect(byType.weather).toBe(DEFAULT_WIDGET_SIZE.weather);
    expect(byType.fortune).toBe(DEFAULT_WIDGET_SIZE.fortune);
    expect(byType.weather).toBe('small');
  });
});

describe('defaultPresetSettings (빈 홈 금지)', () => {
  it('enables weather/fortune/dday/memo/diary/tarot so home is never empty', () => {
    const s = defaultPresetSettings();
    expect(enabledTypesOf(s.widgets).sort()).toEqual(['dday', 'diary', 'fortune', 'memo', 'tarot', 'weather']);
  });

  it('does not require saju (no birthdate gate)', () => {
    const s = defaultPresetSettings();
    expect(s.saju).toBeUndefined();
  });

  it('has empty weather regions (location asked later)', () => {
    expect(defaultPresetSettings().weather.regions).toEqual([]);
  });
});

describe('settingsFromOnboarding', () => {
  it('falls back to activation preset when nothing selected (빈 홈 금지)', () => {
    const s = settingsFromOnboarding({ selectedWidgets: [] });
    expect(enabledTypesOf(s.widgets).length).toBeGreaterThan(0);
    expect(enabledTypesOf(s.widgets).sort()).toEqual(['dday', 'diary', 'fortune', 'memo', 'tarot', 'weather']);
  });

  it('always keeps diary enabled (온보딩 토글 없음, #11)', () => {
    const s = settingsFromOnboarding({ selectedWidgets: ['fortune'] });
    expect(enabledTypesOf(s.widgets)).toContain('diary');
    expect(enabledTypesOf(s.widgets)).toContain('fortune');
  });

  it('respects memo turned off (memo는 더 이상 강제하지 않음, #2)', () => {
    const s = settingsFromOnboarding({ selectedWidgets: ['weather'] });
    expect(enabledTypesOf(s.widgets)).not.toContain('memo');
    // 일기는 항상 켜져 빈 홈이 되지 않는다.
    expect(enabledTypesOf(s.widgets)).toContain('diary');
  });

  it('auto-enables fortune when birthdate provided even if not selected (#10)', () => {
    const s = settingsFromOnboarding({
      selectedWidgets: ['weather'],
      saju: { birthDate: '1990-01-01', isLunar: false },
    });
    expect(enabledTypesOf(s.widgets)).toContain('fortune');
    expect(s.saju?.birthDate).toBe('1990-01-01');
  });

  it('does NOT save saju when fortune chosen but no birthdate (not a hard gate)', () => {
    const s = settingsFromOnboarding({ selectedWidgets: ['fortune'] });
    expect(enabledTypesOf(s.widgets)).toContain('fortune');
    expect(s.saju).toBeUndefined();
  });

  it('saves saju when birthdate provided', () => {
    const result: OnboardingResult = {
      selectedWidgets: ['fortune'],
      saju: { birthDate: '1990-03-15', isLunar: true, birthTime: '23:30' },
    };
    const s = settingsFromOnboarding(result);
    expect(s.saju).toEqual({ birthDate: '1990-03-15', isLunar: true, birthTime: '23:30' });
  });

  it('omits birthTime when not provided', () => {
    const s = settingsFromOnboarding({
      selectedWidgets: ['fortune'],
      saju: { birthDate: '2000-12-01', isLunar: false },
    });
    expect(s.saju).toEqual({ birthDate: '2000-12-01', isLunar: false });
    expect(s.saju?.birthTime).toBeUndefined();
  });

  it('applies size overrides for dday/memo', () => {
    const s = settingsFromOnboarding({
      selectedWidgets: ['dday', 'memo'],
      sizes: { dday: 'large', memo: 'small' },
    });
    const byType = Object.fromEntries(s.widgets.map((w) => [w.type, w.size]));
    expect(byType.dday).toBe('large');
    expect(byType.memo).toBe('small');
  });
});

describe('isValidBirthDate', () => {
  it('accepts valid YYYY-MM-DD', () => {
    expect(isValidBirthDate('1990-01-01')).toBe(true);
    expect(isValidBirthDate('2024-02-29')).toBe(true); // leap year
  });

  it('rejects bad format', () => {
    expect(isValidBirthDate('1990-1-1')).toBe(false);
    expect(isValidBirthDate('19900101')).toBe(false);
    expect(isValidBirthDate('')).toBe(false);
  });

  it('rejects out-of-range days/months', () => {
    expect(isValidBirthDate('2023-02-29')).toBe(false); // non-leap
    expect(isValidBirthDate('2020-13-01')).toBe(false);
    expect(isValidBirthDate('2020-04-31')).toBe(false);
  });
});

describe('온보딩 산출 → storage 라운드트립 (빈 홈 금지 검증)', () => {
  beforeEach(() => {
    const { adapter } = createMemoryAdapter();
    setStorageAdapter(adapter);
  });

  it('loadSettings returns a non-empty preset after onboarding (no empty home)', async () => {
    await saveSettings(settingsFromOnboarding({ selectedWidgets: [] }));
    await saveOnboarded(true);

    const loaded = await loadSettings();
    expect(enabledTypesOf(loaded.widgets).length).toBeGreaterThan(0);
    expect(await loadOnboarded()).toBe(true);
  });

  it('defaults onboarded flag to false on first run', async () => {
    setStorageAdapter(createMemoryAdapter().adapter);
    expect(await loadOnboarded()).toBe(false);
  });

  it('persists saju birthdate through storage', async () => {
    await saveSettings(
      settingsFromOnboarding({
        selectedWidgets: ['fortune'],
        saju: { birthDate: '1988-08-08', isLunar: false },
      }),
    );
    const loaded = await loadSettings();
    expect(loaded.saju?.birthDate).toBe('1988-08-08');
  });
});
