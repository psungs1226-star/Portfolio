import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings, Diary, Memo, Dday } from '../../types';
import {
  STORAGE_KEYS,
  SCHEMA_VERSION,
  defaultSettings,
  getJSON,
  setJSON,
  remove,
  setStorageAdapter,
  loadSettings,
  saveSettings,
  loadDiaries,
  saveDiaries,
  loadMemos,
  saveMemos,
  loadDdays,
  saveDdays,
  type StorageAdapter,
} from './index';

// ── 메모리 mock 어댑터 (Bedrock Storage 시그니처 동일) ──
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

let mem: ReturnType<typeof createMemoryAdapter>;

beforeEach(() => {
  mem = createMemoryAdapter();
  setStorageAdapter(mem.adapter);
});

describe('low-level JSON wrapper', () => {
  it('round-trips an arbitrary value (set → get)', async () => {
    await setJSON('evrytimes:test', { a: 1, b: ['x', 'y'] });
    const got = await getJSON<{ a: number; b: string[] }>('evrytimes:test', {
      a: 0,
      b: [],
    });
    expect(got).toEqual({ a: 1, b: ['x', 'y'] });
  });

  it('wraps stored values in a schemaVersion envelope', async () => {
    await setJSON('evrytimes:test', { hello: 'world' });
    const raw = mem.store.get('evrytimes:test')!;
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.data).toEqual({ hello: 'world' });
  });

  it('returns fallback when key is missing', async () => {
    const fallback = { empty: true };
    const got = await getJSON('evrytimes:missing', fallback);
    expect(got).toEqual(fallback);
  });

  it('returns fallback on malformed JSON', async () => {
    mem.store.set('evrytimes:bad', '{not json');
    const fallback = [1, 2, 3];
    const got = await getJSON('evrytimes:bad', fallback);
    expect(got).toEqual(fallback);
  });

  it('returns fallback when adapter throws', async () => {
    setStorageAdapter({
      getItem: vi.fn(async () => {
        throw new Error('bridge down');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    const fallback = { safe: true };
    expect(await getJSON('evrytimes:x', fallback)).toEqual(fallback);
  });

  it('reads legacy (non-enveloped) values as-is', async () => {
    mem.store.set('evrytimes:legacy', JSON.stringify({ legacy: 1 }));
    const got = await getJSON('evrytimes:legacy', { legacy: 0 });
    expect(got).toEqual({ legacy: 1 });
  });

  it('remove deletes the key', async () => {
    await setJSON('evrytimes:test', 42);
    await remove('evrytimes:test');
    expect(mem.store.has('evrytimes:test')).toBe(false);
    expect(await getJSON('evrytimes:test', -1)).toBe(-1);
  });
});

describe('schema migration', () => {
  it('migrates an older envelope through the hook chain to current version', async () => {
    // 가상의 v0 봉투를 직접 써넣고, v0→...→current 로 마이그레이션되는지 검증.
    // 마이그레이션 로직은 schemaVersion < SCHEMA_VERSION 일 때 훅 체인을 돈다.
    mem.store.set(
      'evrytimes:test',
      JSON.stringify({ schemaVersion: 0, data: { value: 'old' } })
    );
    const got = await getJSON<{ value: string }>('evrytimes:test', { value: 'fallback' });
    // 현재 훅은 항등(v1 only) → 데이터 보존 + 크래시 없음.
    expect(got).toEqual({ value: 'old' });
  });

  it('passes through data already at the current version untouched', async () => {
    mem.store.set(
      'evrytimes:test',
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, data: { value: 'current' } })
    );
    const got = await getJSON<{ value: string }>('evrytimes:test', { value: 'fallback' });
    expect(got).toEqual({ value: 'current' });
  });
});

describe('defaults', () => {
  it('defaultSettings returns a safe empty Settings', () => {
    expect(defaultSettings()).toEqual({ widgets: [], weather: { regions: [] } });
  });

  it('loadSettings returns defaults when nothing stored', async () => {
    expect(await loadSettings()).toEqual(defaultSettings());
  });

  it('list loaders return empty arrays when nothing stored', async () => {
    expect(await loadDiaries()).toEqual([]);
    expect(await loadMemos()).toEqual([]);
    expect(await loadDdays()).toEqual([]);
  });
});

describe('domain accessors round-trip', () => {
  it('settings save → load', async () => {
    const settings: Settings = {
      widgets: [{ type: 'fortune', enabled: true, size: 'large', order: 0 }],
      weather: { regions: [{ name: '서울', lat: 37.5, lon: 127, nx: 60, ny: 127 }] },
      saju: { birthDate: '1990-01-01', isLunar: false, cached: { dayGan: '甲', dayWuXing: '木' } },
    };
    await saveSettings(settings);
    expect(await loadSettings()).toEqual(settings);
    expect(mem.adapter.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.settings,
      expect.any(String)
    );
  });

  it('diaries save → load', async () => {
    const diaries: Diary[] = [{ date: '2026-06-14', mood: 4, text: '좋은 하루' }];
    await saveDiaries(diaries);
    expect(await loadDiaries()).toEqual(diaries);
  });

  it('memos save → load', async () => {
    const memos: Memo[] = [
      { id: 'm1', date: '2026-06-14', text: '우유 사기', checked: false, isTodo: true },
    ];
    await saveMemos(memos);
    expect(await loadMemos()).toEqual(memos);
  });

  it('ddays save → load', async () => {
    const ddays: Dday[] = [{ id: 'd1', title: '시험', targetDate: '2026-07-01', size: 'medium' }];
    await saveDdays(ddays);
    expect(await loadDdays()).toEqual(ddays);
  });

  it('uses the evrytimes namespace for all keys', () => {
    expect(STORAGE_KEYS.settings).toBe('evrytimes:settings');
    expect(STORAGE_KEYS.diaries).toBe('evrytimes:diaries');
    expect(STORAGE_KEYS.memos).toBe('evrytimes:memos');
    expect(STORAGE_KEYS.ddays).toBe('evrytimes:ddays');
  });
});
