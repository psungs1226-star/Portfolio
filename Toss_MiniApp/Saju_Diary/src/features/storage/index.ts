// Evry Times — 영속 계층 (단일 출처)
//
// CRITICAL #1: 데이터는 앱인토스 `Storage`(로컬)에만 저장한다.
// 외부 서버/네트워크 호출 금지. 모든 저장/조회는 이 모듈을 통해서만 일어난다.
//
// 설계:
// - 저수준: getJSON/setJSON/remove — JSON 직렬화 + Storage 어댑터 래핑.
// - 도메인 접근자: load*/save* — 타입 안전(타입은 src/types 단일 출처 재사용).
// - 스키마 버전 + 마이그레이션: 저장 데이터를 { schemaVersion, data } 봉투로 감싸고,
//   로드 시 버전이 낮으면 마이그레이션 훅 체인을 거친다(현재 v1, 훅은 항등이라도 자리 마련).

import { Storage as AitStorage } from '@apps-in-toss/web-framework';
import type { Settings, Diary, Memo, Dday } from '../../types';
import { EMPTY_STREAK, type StreakState } from '../../widgets/streak';

// ─────────────────────────────────────────────────────────────
// Storage 어댑터 (테스트 주입 가능)
// ─────────────────────────────────────────────────────────────

/**
 * 키-값 영속 어댑터. 앱인토스 Bedrock `Storage`와 동일 시그니처.
 * 테스트에서 메모리 mock을 주입하기 위해 추상화한다.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

// ─────────────────────────────────────────────────────────────
// 견고한 기본 어댑터 (AIT 브리지 자동 폴백)
// ─────────────────────────────────────────────────────────────
//
// CRITICAL #1: 폴백 경로는 전부 **기기 로컬**(localStorage → 인메모리 Map)뿐이다.
// 어떤 경로에서도 외부 서버/네트워크로 데이터를 보내지 않는다.
//
// 브라우저(토스 앱 밖)에선 AitStorage 네이티브 브리지가 없어 setItem이 throw/hang
// → 저장이 깨져 온보딩 "시작하기"가 먹통이 된다. 이를 막기 위해 첫 op에서 AitStorage
// 동작 여부를 **1회 프로브**(타임아웃 레이스)하고 결정을 캐시한다. 성공 시 AitStorage
// 전용, 실패/타임아웃/메서드 부재 시 localStorage→메모리로 폴백한다(split-brain 방지).

/** AitStorage 프로브 타임아웃(ms). hang 방어. */
const PROBE_TIMEOUT_MS = 600;

/** 폴백 라우팅 결정. 프로브 후 캐시되어 매 op마다 재프로브하지 않는다. */
type Backend = StorageAdapter;

const aitStorage = AitStorage as unknown as Partial<StorageAdapter>;

/** 인메모리 Map 백엔드(SSR/최후 폴백). 기기 안에만 존재(외부 전송 0). */
function makeMemoryBackend(): Backend {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

/** localStorage 백엔드(있을 때만). 기기 로컬 — 외부 전송 0. */
function makeLocalStorageBackend(): Backend | null {
  try {
    if (typeof globalThis === 'undefined' || globalThis.localStorage == null) {
      return null;
    }
    const ls = globalThis.localStorage;
    // 사용 가능 여부 1회 확인(사파리 프라이빗 등에서 throw할 수 있음).
    const probeKey = 'evrytimes:__ls_probe__';
    ls.setItem(probeKey, '1');
    ls.removeItem(probeKey);
    return {
      getItem: (key) => ls.getItem(key),
      setItem: (key, value) => {
        ls.setItem(key, value);
      },
      removeItem: (key) => {
        ls.removeItem(key);
      },
    };
  } catch {
    return null;
  }
}

/** Promise를 타임아웃과 레이스. 시간 초과 시 reject. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('storage probe timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * AitStorage가 실제로 동작하는지 1회 확인한다.
 * 센티넬 키 setItem→getItem 왕복이 타임아웃 내에 일치하면 true.
 */
async function probeAitStorage(): Promise<boolean> {
  if (typeof aitStorage.setItem !== 'function' || typeof aitStorage.getItem !== 'function') {
    return false;
  }
  const key = 'evrytimes:__probe__';
  const value = String(Date.now());
  try {
    await withTimeout(Promise.resolve(aitStorage.setItem(key, value)), PROBE_TIMEOUT_MS);
    const back = await withTimeout(
      Promise.resolve(aitStorage.getItem(key)),
      PROBE_TIMEOUT_MS,
    );
    // 정리(실패해도 무시).
    try {
      if (typeof aitStorage.removeItem === 'function') {
        await withTimeout(Promise.resolve(aitStorage.removeItem(key)), PROBE_TIMEOUT_MS);
      }
    } catch {
      /* 정리 실패는 무시 */
    }
    return back === value;
  } catch {
    return false;
  }
}

/**
 * 자동 폴백 어댑터. 첫 op에서 백엔드를 1회 결정(프로브)하고 캐시한다.
 * - AitStorage 동작 → AitStorage 전용.
 * - 실패/타임아웃/부재 → localStorage(있으면) → 인메모리.
 * 결정 전에는 모든 op가 같은 프로브 Promise를 공유해 split-brain/중복 프로브를 막는다.
 */
function makeFallbackAdapter(): StorageAdapter {
  let resolved: Backend | null = null;
  let pending: Promise<Backend> | null = null;

  function resolveBackend(): Promise<Backend> {
    if (resolved != null) {
      return Promise.resolve(resolved);
    }
    if (pending == null) {
      pending = probeAitStorage().then((ok) => {
        const backend: Backend = ok
          ? (aitStorage as StorageAdapter)
          : (makeLocalStorageBackend() ?? makeMemoryBackend());
        resolved = backend;
        return backend;
      });
    }
    return pending;
  }

  return {
    async getItem(key) {
      const backend = await resolveBackend();
      return backend.getItem(key);
    },
    async setItem(key, value) {
      const backend = await resolveBackend();
      await backend.setItem(key, value);
    },
    async removeItem(key) {
      const backend = await resolveBackend();
      await backend.removeItem(key);
    },
  };
}

// 기본 어댑터 = 자동 폴백(로컬 전용). 주입이 없으면 이것을 쓴다.
const defaultAdapter: StorageAdapter = makeFallbackAdapter();

let adapter: StorageAdapter = defaultAdapter;

/**
 * 영속 어댑터를 교체한다(테스트 전용). 인자 없이 호출하면 기본 어댑터로 복귀.
 * 주입된 어댑터는 폴백 프로브를 **거치지 않고** 그대로 사용된다.
 */
export function setStorageAdapter(next?: StorageAdapter): void {
  adapter = next ?? defaultAdapter;
}

// ─────────────────────────────────────────────────────────────
// 키 네임스페이스 (CLAUDE.md: `evrytimes:*`)
// ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  settings: 'evrytimes:settings',
  diaries: 'evrytimes:diaries',
  memos: 'evrytimes:memos',
  ddays: 'evrytimes:ddays',
  /** 첫 실행 온보딩 완료 여부 플래그. */
  onboarded: 'evrytimes:onboarded',
  /**
   * 연속 출석(재방문) 상태. lastOpenDate + streakCount.
   * 재방문 UX("연속 N일") 표시 전용 — 외부 전송 X(CRITICAL #1), 리워드 X(CRITICAL #4).
   */
  streak: 'evrytimes:streak',
  /**
   * 오늘의 타로 한 장(그날 고른 자리). { date, pickedIndex }.
   * 하루 한 장 — 한 번 뽑으면 그날(새벽 5시 경계) 동안 같은 카드로 잠긴다. 로컬 전용(CRITICAL #1).
   */
  tarot: 'evrytimes:tarot',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// ─────────────────────────────────────────────────────────────
// 스키마 버전 + 마이그레이션
// ─────────────────────────────────────────────────────────────

/** 현재 스키마 버전. 데이터 모양이 바뀌면 올린다. */
export const SCHEMA_VERSION = 1;

/** 저장 봉투. 실데이터를 버전과 함께 감싼다. */
interface Envelope<T> {
  schemaVersion: number;
  data: T;
}

/**
 * 마이그레이션 훅. `fromVersion`에서 `fromVersion+1`로 데이터를 올린다.
 * 현재는 v1뿐이라 자리만 마련(항등). 새 버전 추가 시 여기에 from→to 훅을 등록한다.
 */
type Migration = (data: unknown) => unknown;

const migrations: Record<number, Migration> = {
  // 예: 1: (data) => ({ ...data, newField: defaultValue }),  // v1 -> v2
};

/** 봉투를 현재 버전까지 순차 마이그레이션한다. */
function migrate<T>(envelope: Envelope<unknown>): T {
  let version = envelope.schemaVersion;
  let data = envelope.data;
  while (version < SCHEMA_VERSION) {
    const hook = migrations[version];
    if (hook != null) {
      data = hook(data);
    }
    version += 1;
  }
  return data as T;
}

// ─────────────────────────────────────────────────────────────
// 저수준 JSON 래퍼
// ─────────────────────────────────────────────────────────────

/**
 * 키에서 JSON 값을 읽는다. 없거나 파싱 실패 시 `fallback`을 반환한다.
 * 봉투 형식이면 마이그레이션을 거치고, 봉투가 아닌(레거시) 값은 그대로 사용한다.
 */
export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  let raw: string | null;
  try {
    raw = await adapter.getItem(key);
  } catch {
    return fallback;
  }
  if (raw == null || raw === '') {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isEnvelope(parsed)) {
      return migrate<T>(parsed);
    }
    // 봉투 없는 레거시 값: 그대로 반환.
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** 값을 현재 스키마 버전 봉투로 감싸 JSON으로 저장한다. */
export async function setJSON<T>(key: string, value: T): Promise<void> {
  const envelope: Envelope<T> = { schemaVersion: SCHEMA_VERSION, data: value };
  await adapter.setItem(key, JSON.stringify(envelope));
}

/** 키를 삭제한다. */
export async function remove(key: string): Promise<void> {
  await adapter.removeItem(key);
}

function isEnvelope(value: unknown): value is Envelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    typeof (value as { schemaVersion: unknown }).schemaVersion === 'number' &&
    'data' in value
  );
}

// ─────────────────────────────────────────────────────────────
// 기본값 (빈 상태)
// ─────────────────────────────────────────────────────────────

/** settings가 없을 때 반환할 안전한 기본 Settings. */
export function defaultSettings(): Settings {
  return {
    widgets: [],
    weather: { regions: [] },
  };
}

// ─────────────────────────────────────────────────────────────
// 도메인 접근자 (타입 안전)
// ─────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<Settings> {
  return getJSON<Settings>(STORAGE_KEYS.settings, defaultSettings());
}

export async function saveSettings(settings: Settings): Promise<void> {
  await setJSON(STORAGE_KEYS.settings, settings);
}

export async function loadDiaries(): Promise<Diary[]> {
  return getJSON<Diary[]>(STORAGE_KEYS.diaries, []);
}

export async function saveDiaries(diaries: Diary[]): Promise<void> {
  await setJSON(STORAGE_KEYS.diaries, diaries);
}

export async function loadMemos(): Promise<Memo[]> {
  return getJSON<Memo[]>(STORAGE_KEYS.memos, []);
}

export async function saveMemos(memos: Memo[]): Promise<void> {
  await setJSON(STORAGE_KEYS.memos, memos);
}

export async function loadDdays(): Promise<Dday[]> {
  return getJSON<Dday[]>(STORAGE_KEYS.ddays, []);
}

export async function saveDdays(ddays: Dday[]): Promise<void> {
  await setJSON(STORAGE_KEYS.ddays, ddays);
}

/**
 * 첫 실행 온보딩 완료 여부.
 * 기본값 false → 첫 진입 시 온보딩 표시. 완료하면 true로 저장한다.
 */
export async function loadOnboarded(): Promise<boolean> {
  return getJSON<boolean>(STORAGE_KEYS.onboarded, false);
}

export async function saveOnboarded(done: boolean): Promise<void> {
  await setJSON(STORAGE_KEYS.onboarded, done);
}

/**
 * 연속 출석 상태 로드. 없으면 빈 상태(EMPTY_STREAK)를 반환한다.
 * 재방문 동기부여 UX 전용 — 외부 전송 없음(CRITICAL #1).
 */
export async function loadStreak(): Promise<StreakState> {
  return getJSON<StreakState>(STORAGE_KEYS.streak, EMPTY_STREAK);
}

export async function saveStreak(state: StreakState): Promise<void> {
  await setJSON(STORAGE_KEYS.streak, state);
}

/** 오늘의 타로 뽑기 기록 — 그날 고른 카드 자리. 같은 날이면 그 카드로 잠긴다. */
export interface TarotPick {
  /** 뽑은 날짜 `YYYY-MM-DD`(새벽 5시 경계). */
  date: string;
  /** 사용자가 고른 카드 자리(0-based). */
  pickedIndex: number;
}

/**
 * 오늘의 타로 뽑기를 로드한다. 없거나(미뽑기) date가 오늘과 다르면 null로 취급하도록
 * 호출부(TarotScreen)가 date를 비교한다. 외부 전송 없음(CRITICAL #1).
 */
export async function loadTarotPick(): Promise<TarotPick | null> {
  return getJSON<TarotPick | null>(STORAGE_KEYS.tarot, null);
}

export async function saveTarotPick(pick: TarotPick): Promise<void> {
  await setJSON(STORAGE_KEYS.tarot, pick);
}
