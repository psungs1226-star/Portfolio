/**
 * App — 앱 셸(첫 실행 온보딩 게이트 + 하단 4탭 네비게이션). "Peach Milk" 멀티스크린 IA.
 *
 * 탭 4개: 오늘(Today) · 운세(Fortune) · 기록(Diary) · MY. 라우터/상태 라이브러리 미사용(CRITICAL #5) —
 * useState 탭 전환. 운세/타로/날씨 상세는 각 탭 내부 서브뷰·시트로 흡수(풀스크린 오버레이 폐기).
 *
 * 첫 실행이면 OnboardingScreen, 완료 시 today 홈. 온보딩 완료 판정은 storage 접근자(loadOnboarded).
 *
 * NOTE(마이그레이션 중): fortune/my 탭은 P2/P4에서 전용 화면으로 교체 예정. 현재는 기존 화면을 임시 래핑.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  TodayScreen,
  DiaryTab,
  MyTab,
  FortuneTab,
  WeatherScreen,
  OnboardingScreen,
  type TabKey,
} from './screens';
import { BottomTabBar, TAB_BAR_HEIGHT } from './components';
import { loadOnboarded, loadSettings } from './features/storage';
import { peach } from './theme/tokens';
import type { CharacterKind, Region, SajuInput, Settings } from './types';
import './App.css';

/** 온보딩 진입 판정. null=판정 중(스토리지 로드 대기). */
type OnboardingGate = 'loading' | 'onboarding' | 'app';

function App() {
  const [gate, setGate] = useState<OnboardingGate>('loading');
  const [tab, setTab] = useState<TabKey>('today');
  const [saju, setSaju] = useState<SajuInput | undefined>(undefined);
  const [characterKind, setCharacterKind] = useState<CharacterKind>('rabbit');
  const [characterPhoto, setCharacterPhoto] = useState<string | undefined>(undefined);
  const [regions, setRegions] = useState<Region[]>([]);
  // 날씨 상세 오버레이(홈 슬림 행 탭 → 풀스크린 WeatherScreen).
  const [weatherOpen, setWeatherOpen] = useState(false);
  // 메모/디데이 관리 오버레이(홈에서 '관리' → 풀스크린 MyTab 해당 페이지). null=닫힘.
  const [manageOpen, setManageOpen] = useState<'memos' | 'ddays' | null>(null);
  // 온보딩 재진입(설정 → 처음부터 꾸미기). non-null이면 풀스크린 온보딩.
  const [reconfig, setReconfig] = useState<Settings | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 첫 실행 여부 = 온보딩 완료 플래그.
  useEffect(() => {
    let alive = true;
    loadOnboarded()
      .then((done) => alive && setGate(done ? 'app' : 'onboarding'))
      .catch(() => alive && setGate('onboarding'));
    return () => {
      alive = false;
    };
  }, []);

  // 운세 탭에 넘길 saju/캐릭터 로드. 탭 전환 시에도 재로드 → MY에서 캐릭터 바꾸면 운세 상세에도 반영.
  useEffect(() => {
    if (gate !== 'app') return;
    let alive = true;
    loadSettings()
      .then((s) => {
        if (!alive) return;
        setSaju(s.saju);
        setCharacterKind(s.characterKind ?? 'rabbit');
        setCharacterPhoto(s.characterPhoto);
        setRegions(s.weather?.regions ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [gate, refreshKey, tab]);

  // 온보딩 재진입: 현재 설정을 읽어 미리 채운 뒤 풀스크린 온보딩(데이터 보존, CRITICAL #1).
  const startReconfigure = () => {
    loadSettings()
      .then((s) => setReconfig(s))
      .catch(() => setReconfig({ widgets: [], weather: { regions: [] } }));
  };
  const finishReconfigure = () => {
    setReconfig(null);
    setRefreshKey((k) => k + 1);
  };

  const contentStyle: CSSProperties = {
    minHeight: '100vh',
    background: peach.surface,
    paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
    boxSizing: 'border-box',
  };

  if (gate === 'loading') {
    return <div style={{ minHeight: '100vh', background: peach.surface }} />;
  }

  if (gate === 'onboarding') {
    return <OnboardingScreen onDone={() => setGate('app')} />;
  }

  // 온보딩 재진입(처음부터 꾸미기): 기존 설정 prefill. 완료 시 탭 화면 재로드(refreshKey).
  if (reconfig != null) {
    return (
      <OnboardingScreen
        mode="reconfigure"
        initialSaju={reconfig.saju}
        preserveWeather={reconfig.weather}
        initialCharacterKind={reconfig.characterKind}
        initialUserName={reconfig.userName}
        initialCharacterName={reconfig.characterName}
        initialCharacterPhoto={reconfig.characterPhoto}
        onDone={finishReconfigure}
      />
    );
  }

  const goTab = (t: TabKey) => {
    setWeatherOpen(false);
    setManageOpen(null);
    setTab(t);
    // 탭 전환 시 항상 맨 위부터 보이게(운세 상세를 중간부터 보여주지 않게, 사용자 #3).
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };

  // 관리 오버레이 닫기 — 홈 데이터(메모/디데이) 재로드 위해 refreshKey 증가.
  const closeManage = () => {
    setManageOpen(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      <main style={contentStyle}>
        <div key={refreshKey}>
          {renderTab(tab, goTab, saju, characterKind, characterPhoto, startReconfigure, () => setWeatherOpen(true), setManageOpen)}
        </div>
      </main>
      <BottomTabBar active={tab} onChange={goTab} />
      {weatherOpen && regions.length > 0 ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: peach.surface }}>
          <WeatherScreen regions={regions} onClose={() => setWeatherOpen(false)} />
        </div>
      ) : null}
      {manageOpen != null ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: peach.surface, overflowY: 'auto' }}>
          <MyTab initialView={manageOpen} onExit={closeManage} />
        </div>
      ) : null}
    </>
  );
}

function renderTab(
  tab: TabKey,
  onNavigate: (next: TabKey) => void,
  saju: SajuInput | undefined,
  characterKind: CharacterKind,
  characterPhoto: string | undefined,
  onReconfigure: () => void,
  onOpenWeather: () => void,
  onManage: (v: 'memos' | 'ddays') => void,
) {
  switch (tab) {
    case 'today':
      return (
        <TodayScreen
          onNavigate={onNavigate}
          onOpenWeather={onOpenWeather}
          onManageMemos={() => onManage('memos')}
          onManageDdays={() => onManage('ddays')}
        />
      );
    case 'fortune':
      return (
        <FortuneTab
          saju={saju}
          characterKind={characterKind}
          characterPhoto={characterPhoto}
          onNavigate={onNavigate}
        />
      );
    case 'diary':
      return <DiaryTab />;
    case 'my':
      return <MyTab onReconfigure={onReconfigure} />;
    default:
      return null;
  }
}

export default App;
