// @vitest-environment jsdom
/**
 * App 렌더 스모크 — 새 "Peach Milk" 4탭 IA(오늘·운세·기록·MY).
 *
 * 목표: SDK(Storage·위치·공유) 호출로 인한 마운트 크래시(white-screen) 회귀 방지 +
 *   탭 전환/날씨 오버레이가 throw 없이 렌더되는지.
 * 검증 수준: throw 없는 마운트 + 대표 텍스트/role 존재(픽셀/스냅샷 아님).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';

// 앱인토스 SDK 모킹: 인메모리 Storage + no-op 위치/공유.
vi.mock('@apps-in-toss/web-framework', () => {
  const mem = new Map<string, string>();
  return {
    Storage: {
      getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
    },
    getCurrentLocation: vi.fn(() => Promise.reject(new Error('no-permission'))),
    Accuracy: { Balanced: 'balanced', Low: 'low', High: 'high' },
    share: vi.fn(() => Promise.resolve()),
    getTossShareLink: vi.fn(() => Promise.resolve('')),
    contactsViral: vi.fn(() => () => {}),
  };
});

import App from '../App';
import { installMemoryStorage, resetStorage, renderApp, seedOnboarded } from './harness';
import { defaultPresetSettings } from '../features/onboarding/preset';
import type { Settings } from '../types';

let store: Map<string, string>;

beforeEach(() => {
  store = installMemoryStorage();
});

afterEach(() => {
  resetStorage();
  vi.clearAllMocks();
});

describe('App 마운트(콜드스타트)', () => {
  it('미온보딩이면 throw 없이 마운트되고 온보딩 화면이 뜬다', async () => {
    expect(() => renderApp(<App />)).not.toThrow();
    expect(await screen.findByText('건너뛰기')).toBeInTheDocument();
  });
});

describe('App 마운트(온보딩 완료) — 4탭 IA', () => {
  beforeEach(() => {
    const settings: Settings = {
      ...defaultPresetSettings(),
      saju: { birthDate: '1990-05-15', isLunar: false },
      weather: { regions: [{ name: '서울', lat: 37.5665, lon: 126.978, nx: 60, ny: 127 }] },
    };
    seedOnboarded(store, settings);
  });

  function tab(name: string) {
    const nav = screen.getByRole('navigation', { name: '하단 탭' });
    return within(nav).getByRole('tab', { name });
  }

  it('홈(오늘)이 throw 없이 렌더되고 운세 히어로 + 하단 탭바가 뜬다', async () => {
    expect(() => renderApp(<App />)).not.toThrow();
    expect(await screen.findByText('사주 다이어리')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '하단 탭' })).toBeInTheDocument();
  });

  it('운세·기록·MY 탭 전환이 throw 없이 렌더된다', async () => {
    renderApp(<App />);
    await screen.findByText('사주 다이어리');

    expect(() => tab('운세').click()).not.toThrow();
    expect(await screen.findByText('오늘 운세')).toBeInTheDocument();

    expect(() => tab('기록').click()).not.toThrow();
    expect(await screen.findByText('오늘 쓰기')).toBeInTheDocument();

    expect(() => tab('MY').click()).not.toThrow();
    expect(await screen.findByText('내 기록')).toBeInTheDocument();

    expect(() => tab('오늘').click()).not.toThrow();
    expect(await screen.findByText('사주 다이어리')).toBeInTheDocument();
  });

  it('홈 날씨 행을 탭하면 주간 날씨 상세가 열리고 뒤로가기로 닫힌다', async () => {
    renderApp(<App />);
    await screen.findByText('사주 다이어리');

    // 날씨 슬림 행(지역명 포함) = 클릭 가능한 Card(role=button).
    const buttons = screen.getAllByRole('button');
    const weatherRow = buttons.find((b) => b.textContent?.includes('서울'));
    expect(weatherRow).toBeTruthy();
    expect(() => weatherRow!.click()).not.toThrow();

    expect(await screen.findByText(/주간 날씨/)).toBeInTheDocument();
    expect(() => screen.getByRole('button', { name: '뒤로 가기' }).click()).not.toThrow();
    await waitFor(() => expect(screen.queryByText(/주간 날씨/)).not.toBeInTheDocument());
  });
});
