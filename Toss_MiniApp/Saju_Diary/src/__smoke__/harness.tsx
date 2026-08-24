/**
 * 렌더 스모크 공용 하니스.
 *
 * - 인메모리 StorageAdapter(앱인토스 Storage 시그니처 동일)를 만들어
 *   storage 모듈에 주입(setStorageAdapter)한다 → 마운트 시 Storage 호출이 크래시 없이 동작.
 * - TDSMobileAITProvider로 감싸 실제 main.tsx와 동일한 컨텍스트에서 마운트한다.
 * - settings 등 프리셋을 미리 주입할 수 있게 seed 유틸을 제공한다.
 *
 * 주의: `@apps-in-toss/web-framework`는 각 스모크 테스트 파일에서 vi.mock으로 모킹한다
 * (인메모리 Storage·no-op SDK). 이 하니스는 storage 어댑터 주입과 Provider 래핑만 담당한다.
 */
import type { ReactElement } from 'react';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { render } from '@testing-library/react';
import {
  setStorageAdapter,
  STORAGE_KEYS,
  type StorageAdapter,
} from '../features/storage';
import type { Settings } from '../types';

/** 메모리 키-값 어댑터(Storage 시그니처). */
export function createMemoryAdapter() {
  const store = new Map<string, string>();
  const adapter: StorageAdapter = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  return { adapter, store };
}

/**
 * storage 모듈이 저장하는 봉투 형식({ schemaVersion, data })으로 직접 시드한다.
 * (saveSettings 등 async 접근자를 거치지 않고 동기적으로 초기 상태를 만든다.)
 */
export function seedEnvelope(
  store: Map<string, string>,
  key: string,
  data: unknown,
  schemaVersion = 1,
): void {
  store.set(key, JSON.stringify({ schemaVersion, data }));
}

/** 온보딩 완료 + settings 프리셋을 한 번에 시드. */
export function seedOnboarded(store: Map<string, string>, settings: Settings): void {
  seedEnvelope(store, STORAGE_KEYS.onboarded, true);
  seedEnvelope(store, STORAGE_KEYS.settings, settings);
}

/** 메모리 어댑터를 storage 모듈에 주입하고 store를 돌려준다. */
export function installMemoryStorage() {
  const { adapter, store } = createMemoryAdapter();
  setStorageAdapter(adapter);
  return store;
}

/** 기본 어댑터로 복귀(테스트 격리). */
export function resetStorage(): void {
  setStorageAdapter();
}

/** TDS Provider로 감싸 마운트한다. */
export function renderApp(ui: ReactElement) {
  return render(<TDSMobileAITProvider>{ui}</TDSMobileAITProvider>);
}
