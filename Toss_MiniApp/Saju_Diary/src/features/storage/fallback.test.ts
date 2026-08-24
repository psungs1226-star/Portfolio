// 기본(주입 없는) 어댑터의 자동 폴백 동작 검증.
// CRITICAL #1: 모든 폴백 경로는 기기 로컬(localStorage/메모리)뿐 — 외부 전송 없음.
//
// `@apps-in-toss/web-framework`의 Storage를 케이스별로 mock해서
// 프로브 성공/실패 분기와 localStorage→메모리 폴백을 검증한다.
// localStorage는 환경 의존을 피하려고 globalThis에 직접 제어 가능한 stub을 주입한다.
// 각 테스트는 모듈 상태(프로브 캐시)를 새로 격리하려고 vi.resetModules() + 동적 import를 쓴다.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 동적 mock 제어용: 각 테스트가 AitStorage setItem/getItem 동작을 주입한다.
let aitImpl: {
  setItem: (key: string, value: string) => unknown;
  getItem: (key: string) => unknown;
  removeItem?: (key: string) => unknown;
} | null;

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {
    setItem: (key: string, value: string) => aitImpl?.setItem(key, value),
    getItem: (key: string) => aitImpl?.getItem(key),
    removeItem: (key: string) => aitImpl?.removeItem?.(key),
  },
}));

// 제어 가능한 localStorage stub(기기 로컬 — 외부 전송 없음).
interface LSStub {
  store: Map<string, string>;
  ls: {
    getItem: (k: string) => string | null;
    setItem: (k: string, v: string) => void;
    removeItem: (k: string) => void;
    clear: () => void;
  };
}

function installLocalStorage(opts: { disabled?: boolean } = {}): LSStub {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      if (opts.disabled) throw new Error('localStorage disabled');
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  (globalThis as { localStorage?: unknown }).localStorage = ls;
  return { store, ls };
}

function removeLocalStorage(): void {
  delete (globalThis as { localStorage?: unknown }).localStorage;
}

beforeEach(() => {
  vi.resetModules();
  aitImpl = null;
  removeLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
  removeLocalStorage();
});

describe('default adapter — AitStorage probe fails (browser scenario)', () => {
  it('falls back to localStorage when AitStorage throws (set still succeeds, no throw)', async () => {
    // 브라우저: 네이티브 브리지 없음 → setItem/getItem throw.
    aitImpl = {
      setItem: () => {
        throw new Error('bridge down');
      },
      getItem: () => {
        throw new Error('bridge down');
      },
    };
    const { store } = installLocalStorage();

    const { setJSON, getJSON, STORAGE_KEYS } = await import('./index');

    // setItem이 throw하지 않고 저장돼야 한다(온보딩 "시작하기"가 전환되는 근거).
    await expect(setJSON(STORAGE_KEYS.onboarded, true)).resolves.toBeUndefined();
    expect(await getJSON(STORAGE_KEYS.onboarded, false)).toBe(true);

    // 실제로 localStorage(기기 로컬)에 들어갔는지 확인.
    const raw = store.get(STORAGE_KEYS.onboarded);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!).data).toBe(true);
  });

  it('falls back to in-memory when both AitStorage and localStorage are unavailable', async () => {
    aitImpl = {
      setItem: () => {
        throw new Error('bridge down');
      },
      getItem: () => {
        throw new Error('bridge down');
      },
    };
    // localStorage 자체가 없는 환경(SSR 등).
    removeLocalStorage();

    const { setJSON, getJSON } = await import('./index');

    await expect(setJSON('evrytimes:mem', { v: 1 })).resolves.toBeUndefined();
    // 메모리 백엔드로 왕복.
    expect(await getJSON<{ v: number }>('evrytimes:mem', { v: 0 })).toEqual({ v: 1 });
  });

  it('falls back to in-memory when localStorage exists but is disabled (private mode)', async () => {
    aitImpl = {
      setItem: () => {
        throw new Error('bridge down');
      },
      getItem: () => {
        throw new Error('bridge down');
      },
    };
    // localStorage는 있으나 setItem이 throw → makeLocalStorageBackend가 null → 메모리.
    const { store } = installLocalStorage({ disabled: true });

    const { setJSON, getJSON } = await import('./index');

    await expect(setJSON('evrytimes:mem2', { v: 7 })).resolves.toBeUndefined();
    expect(await getJSON<{ v: number }>('evrytimes:mem2', { v: 0 })).toEqual({ v: 7 });
    // 비활성 localStorage엔 도메인 키가 들어가지 않는다.
    expect(store.has('evrytimes:mem2')).toBe(false);
  });
});

describe('default adapter — AitStorage probe succeeds (in-app scenario)', () => {
  it('uses AitStorage exclusively; writes do not leak to localStorage', async () => {
    const aitStore = new Map<string, string>();
    const setItem = vi.fn((key: string, value: string) => {
      aitStore.set(key, value);
    });
    aitImpl = {
      setItem,
      getItem: (key: string) => (aitStore.has(key) ? aitStore.get(key)! : null),
      removeItem: (key: string) => {
        aitStore.delete(key);
      },
    };
    const { store: lsStore } = installLocalStorage();

    const { setJSON, getJSON, STORAGE_KEYS } = await import('./index');

    await setJSON(STORAGE_KEYS.onboarded, true);
    expect(await getJSON(STORAGE_KEYS.onboarded, false)).toBe(true);

    // AitStorage로 저장됨.
    expect(setItem).toHaveBeenCalled();
    expect(aitStore.has(STORAGE_KEYS.onboarded)).toBe(true);
    // localStorage로 새지 않음(도메인 키 기준).
    expect(lsStore.has(STORAGE_KEYS.onboarded)).toBe(false);
  });
});
