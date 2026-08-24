import { TossAds, getSchemeUri, loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { BottomNav } from "./components/BottomNav";
import { SongCard } from "./components/SongCard";
import { moments, moods, summerSongs as songs, type Moment, type Mood, type Song } from "./data/songs";
import {
  getDateKey,
  trackAnalyticsEvent,
  type AnalyticsSource,
} from "./lib/analytics";
import { loadFavoriteSongIds, saveFavoriteSongIds } from "./lib/favoritesStorage";
import { getNormalizedReferrer } from "./lib/referrer";
import {
  createSongSharePayload,
  shareSong,
} from "./lib/sharing";
import {
  filterSongsByMoment,
  filterSongsByMood,
  filterSongsByYear,
  createLaunchSeed,
  createListeningContext,
  getDailySong,
  getContextScore,
  hasCleanSongMetadata,
  getThumbnailUrl,
  getYears,
  getYoutubeMusicUrl,
  getYoutubeUrl,
  openExternalUrl,
  type ListeningContext,
  type WeatherCondition,
} from "./lib/songUtils";

type PlaylistType = "mood" | "moment" | "year";
type SortOrder = "latest" | "oldest" | "random";
type ViewMode = "grid2" | "grid4" | "grid1" | "compact";

const BANNER_AD_GROUP_ID =
  getEnvAdGroupId("VITE_AIT_BANNER_AD_GROUP_ID") ??
  getEnvAdGroupId("VITE_AIT_BANNER1_AD_GROUP_ID") ??
  getEnvAdGroupId("VITE_AIT_INLINE_AD_GROUP_ID") ??
  (import.meta.env.DEV ? "ait-ad-test-banner-id" : undefined);
const LINK_CLICK_AD_GROUP_ID =
  getEnvAdGroupId("VITE_AIT_FULLSCREEN_AD_GROUP_ID") ??
  (import.meta.env.DEV ? "ait-ad-test-interstitial-id" : undefined);

export type Screen =
  | { name: "home" }
  | { name: "mood" }
  | { name: "year" }
  | { name: "favorites" }
  | {
      name: "playlist";
      playlistType: PlaylistType;
      playlistKey: string;
      title: string;
      subtitle: string;
      songIds: string[];
      source: AnalyticsSource;
    }
  | { name: "song"; songId: string; source: AnalyticsSource };

function App() {
  const [screen, setScreen] = useState<Screen>(() => getInitialScreen());
  const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>([]);
  const [isFavoritesLoaded, setIsFavoritesLoaded] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");
  const [randomSeed, setRandomSeed] = useState(() => Date.now());
  const [launchSeed] = useState(() => createLaunchSeed());
  const [weather, setWeather] = useState<WeatherCondition>("unknown");
  const [viewMode, setViewMode] = useState<ViewMode>(() => getInitialViewMode());
  const launchDate = useMemo(() => new Date(), []);
  const listeningContext = useMemo(
    () => createListeningContext(launchSeed, launchDate, weather),
    [launchDate, launchSeed, weather],
  );
  const dailySong = useMemo(() => getDailySong(launchDate, songs, listeningContext), [launchDate, listeningContext]);
  const years = useMemo(() => getYears(songs), []);
  const favoriteIdSet = useMemo(() => new Set(favoriteSongIds), [favoriteSongIds]);
  const referrer = useMemo(() => getNormalizedReferrer(), []);
  const loggedDailySongIdRef = useRef<string | null>(null);
  const loggedPlaylistRef = useRef<string | null>(null);
  const openExternalUrlAfterAd = useLinkClickAd();

  useEffect(() => {
    loadFavoriteSongIds()
      .then((songIds) => {
        const validSongIds = new Set(songs.map((song) => song.id));
        setFavoriteSongIds(songIds.filter((songId) => validSongIds.has(songId)));
      })
      .catch((error) => {
        console.error("Failed to load favorite songs", error);
        setFavoriteSongIds([]);
      })
      .finally(() => {
        setIsFavoritesLoaded(true);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    getCurrentWeather()
      .then((nextWeather) => {
        if (isMounted) {
          setWeather(nextWeather);
        }
      })
      .catch(() => {
        if (isMounted) {
          setWeather("unknown");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    trackAnalyticsEvent({
      name: "home_viewed",
      params: { referrer, dailySongId: dailySong.id },
    });
  }, [dailySong.id, referrer]);

  useEffect(() => {
    if (loggedDailySongIdRef.current === dailySong.id) {
      return;
    }
    loggedDailySongIdRef.current = dailySong.id;
    trackAnalyticsEvent({
      name: "daily_song_viewed",
      params: { songId: dailySong.id, dateKey: getDateKey(new Date()) },
    });
  }, [dailySong.id]);

  useEffect(() => {
    if (screen.name !== "playlist") {
      return;
    }
    const logKey = `${screen.playlistType}:${screen.playlistKey}`;
    if (loggedPlaylistRef.current === logKey) {
      return;
    }
    loggedPlaylistRef.current = logKey;
    trackAnalyticsEvent({
      name: "playlist_viewed",
      params: { playlistType: screen.playlistType, playlistKey: screen.playlistKey },
    });
  }, [screen]);

  const navigate = (nextScreen: Screen) => {
    setScreen(nextScreen);
    if (nextScreen.name !== "playlist") {
      window.history.replaceState(null, "", `#${nextScreen.name}`);
    }
  };

  const openMood = (mood: Mood) => {
    const list = filterSongsByMood(songs, mood);
    setScreen({
      name: "playlist",
      playlistType: "mood",
      playlistKey: mood,
      title: mood,
      subtitle: `${list.length}곡`,
      songIds: list.map((song) => song.id),
      source: "mood_list",
    });
  };

  const openMoment = (moment: Moment) => {
    const list = filterSongsByMoment(songs, moment);
    setScreen({
      name: "playlist",
      playlistType: "moment",
      playlistKey: moment,
      title: moment,
      subtitle: `${list.length}곡`,
      songIds: list.map((song) => song.id),
      source: "moment_list",
    });
  };

  const openYear = (year: number) => {
    const list = getContextualYearSongs(year, listeningContext);
    setScreen({
      name: "playlist",
      playlistType: "year",
      playlistKey: String(year),
      title: `${year}년`,
      subtitle: `${list.length}곡`,
      songIds: list.map((song) => song.id),
      source: "year_list",
    });
  };

  const toggleFavorite = (songId: string, source: AnalyticsSource) => {
    setFavoriteSongIds((currentSongIds) => {
      const isCurrentlyFavorite = currentSongIds.includes(songId);
      const nextSongIds = currentSongIds.includes(songId)
        ? currentSongIds.filter((currentSongId) => currentSongId !== songId)
        : [songId, ...currentSongIds];

      trackAnalyticsEvent({
        name: isCurrentlyFavorite ? "favorite_removed" : "favorite_added",
        params: { songId, source },
      });

      saveFavoriteSongIds(nextSongIds).catch((error) => {
        console.error("Failed to save favorite songs", error);
      });

      return nextSongIds;
    });
  };

  const handleSongClick = (songId: string, source: AnalyticsSource) => {
    trackAnalyticsEvent({ name: "song_card_clicked", params: { songId, source } });
  };

  const handleOpenYoutube = (songId: string, source: AnalyticsSource, url: string) => {
    trackAnalyticsEvent({ name: "youtube_open_clicked", params: { songId, source } });
    openExternalUrlAfterAd(url, "YouTube");
  };

  const handleOpenYoutubeMusic = (songId: string, source: AnalyticsSource, url: string) => {
    trackAnalyticsEvent({ name: "youtube_music_open_clicked", params: { songId, source } });
    openExternalUrlAfterAd(url, "YouTube Music");
  };

  const handleShareSong = (song: (typeof songs)[number], source: AnalyticsSource) => {
    const payload = createSongSharePayload(song);
    trackAnalyticsEvent({
      name: "share_clicked",
      params: { shareType: "song", targetId: song.id, source },
    });
    shareSong(payload).catch((error) => {
      console.error("Failed to share song", error);
    });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <img className="app-logo" src="/app-logo-600.png" alt="" aria-hidden="true" />
        <div className="app-heading">
          <strong>오늘의 여름노래</strong>
          <span>{songs.length}곡</span>
        </div>
      </header>

      <div className="content-area">
        {screen.name === "home" && (
          <HomeScreen
            dailySong={dailySong}
            years={years}
            favoriteIdSet={favoriteIdSet}
            listeningContext={listeningContext}
            sortOrder={sortOrder}
            randomSeed={randomSeed}
            viewMode={viewMode}
            onSortOrderChange={(nextSortOrder) => {
              setSortOrder(nextSortOrder);
              if (nextSortOrder === "random") {
                setRandomSeed(Date.now());
              }
            }}
            onViewModeChange={setViewMode}
            onOpenMood={openMood}
            onOpenMoment={openMoment}
            onOpenYear={openYear}
            onSongClick={handleSongClick}
            onOpenYoutube={handleOpenYoutube}
            onOpenYoutubeMusic={handleOpenYoutubeMusic}
            onToggleFavorite={toggleFavorite}
            onShareSong={handleShareSong}
          />
        )}
        {screen.name === "mood" && (
          <MoodScreen
            favoriteIdSet={favoriteIdSet}
            sortOrder={sortOrder}
            randomSeed={randomSeed}
            viewMode={viewMode}
            onSortOrderChange={(nextSortOrder) => {
              setSortOrder(nextSortOrder);
              if (nextSortOrder === "random") {
                setRandomSeed(Date.now());
              }
            }}
            onViewModeChange={setViewMode}
            onOpenMood={openMood}
            onOpenMoment={openMoment}
            onSongClick={handleSongClick}
            onOpenYoutube={handleOpenYoutube}
            onOpenYoutubeMusic={handleOpenYoutubeMusic}
            onToggleFavorite={toggleFavorite}
            onShareSong={handleShareSong}
          />
        )}
        {screen.name === "year" && (
          <YearScreen years={years} listeningContext={listeningContext} onOpenYear={openYear} />
        )}
        {screen.name === "favorites" && (
          <FavoritesScreen
            favoriteSongIds={favoriteSongIds}
            favoriteIdSet={favoriteIdSet}
            isLoaded={isFavoritesLoaded}
            sortOrder={sortOrder}
            randomSeed={randomSeed}
            viewMode={viewMode}
            onSortOrderChange={(nextSortOrder) => {
              setSortOrder(nextSortOrder);
              if (nextSortOrder === "random") {
                setRandomSeed(Date.now());
              }
            }}
            onViewModeChange={setViewMode}
            onSongClick={handleSongClick}
            onOpenYoutube={handleOpenYoutube}
            onOpenYoutubeMusic={handleOpenYoutubeMusic}
            onToggleFavorite={toggleFavorite}
            onShareSong={handleShareSong}
          />
        )}
        {screen.name === "playlist" && (
          <PlaylistScreen
            screen={screen}
            favoriteIdSet={favoriteIdSet}
            sortOrder={sortOrder}
            randomSeed={randomSeed}
            viewMode={viewMode}
            onSortOrderChange={(nextSortOrder) => {
              setSortOrder(nextSortOrder);
              if (nextSortOrder === "random") {
                setRandomSeed(Date.now());
              }
            }}
            onViewModeChange={setViewMode}
            onBack={() => navigate({ name: "home" })}
            onSongClick={handleSongClick}
            onOpenYoutube={handleOpenYoutube}
            onOpenYoutubeMusic={handleOpenYoutubeMusic}
            onToggleFavorite={toggleFavorite}
            onShareSong={handleShareSong}
          />
        )}
        {screen.name === "song" && (
          <SharedSongScreen
            songId={screen.songId}
            favoriteIdSet={favoriteIdSet}
            onBack={() => navigate({ name: "home" })}
            onSongClick={handleSongClick}
            onOpenYoutube={handleOpenYoutube}
            onOpenYoutubeMusic={handleOpenYoutubeMusic}
            onToggleFavorite={toggleFavorite}
            onShareSong={handleShareSong}
          />
        )}
      </div>

      <div className="app-bottom-area">
        <AdSlot />
        <BottomNav active={screen.name} onNavigate={navigate} />
      </div>

    </div>
  );
}

function getInitialScreen(): Screen {
  const sharedScreen = getSharedEntryScreen();
  if (sharedScreen != null) {
    return sharedScreen;
  }

  const hash = window.location.hash.replace("#", "");
  if (hash === "mood" || hash === "year" || hash === "favorites") {
    return { name: hash };
  }
  return { name: "home" };
}

function getInitialViewMode(): ViewMode {
  const viewMode = new URLSearchParams(window.location.search).get("view");

  if (
    viewMode === "grid2" ||
    viewMode === "grid4" ||
    viewMode === "grid1" ||
    viewMode === "compact"
  ) {
    return viewMode;
  }

  return "grid2";
}

function getEnvAdGroupId(key: string) {
  const value = import.meta.env[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function useLinkClickAd() {
  const isAdLoadedRef = useRef(false);
  const loadPromiseRef = useRef<Promise<boolean> | null>(null);
  const cancelLoadRef = useRef<(() => void) | undefined>();
  const cancelShowRef = useRef<(() => void) | undefined>();

  const loadAd = useCallback(() => {
    if (
      LINK_CLICK_AD_GROUP_ID == null ||
      loadFullScreenAd.isSupported() !== true ||
      showFullScreenAd.isSupported() !== true
    ) {
      return Promise.resolve(false);
    }

    if (isAdLoadedRef.current) {
      return Promise.resolve(true);
    }

    if (loadPromiseRef.current != null) {
      return loadPromiseRef.current;
    }

    const loadPromise = new Promise<boolean>((resolve) => {
      let isSettled = false;
      const finish = (isLoaded: boolean) => {
        if (isSettled) {
          return;
        }
        isSettled = true;
        window.clearTimeout(timeoutId);
        cancelLoadRef.current?.();
        cancelLoadRef.current = undefined;
        loadPromiseRef.current = null;
        isAdLoadedRef.current = isLoaded;
        resolve(isLoaded);
      };
      const timeoutId = window.setTimeout(() => finish(false), 10000);

      cancelLoadRef.current = loadFullScreenAd({
        options: { adGroupId: LINK_CLICK_AD_GROUP_ID },
        onEvent: (event) => {
          if (event.type === "loaded") {
            finish(true);
          }
        },
        onError: () => finish(false),
      });
    });

    loadPromiseRef.current = loadPromise;
    return loadPromise;
  }, []);

  useEffect(() => {
    void loadAd();

    return () => {
      cancelLoadRef.current?.();
      cancelShowRef.current?.();
    };
  }, [loadAd]);

  return useCallback(
    async (url: string, label: string) => {
      const isAdLoaded = await loadAd();

      if (isAdLoaded) {
        await new Promise<void>((resolve) => {
          let isSettled = false;
          const finish = () => {
            if (isSettled) {
              return;
            }
            isSettled = true;
            window.clearTimeout(timeoutId);
            cancelShowRef.current?.();
            cancelShowRef.current = undefined;
            isAdLoadedRef.current = false;
            void loadAd();
            resolve();
          };
          const timeoutId = window.setTimeout(finish, 30000);

          cancelShowRef.current = showFullScreenAd({
            options: { adGroupId: LINK_CLICK_AD_GROUP_ID! },
            onEvent: (event) => {
              if (event.type === "dismissed" || event.type === "failedToShow") {
                finish();
              }
            },
            onError: finish,
          });
        });
      }

      openExternalUrl(url).catch((error) => {
        console.error(`Failed to open ${label}`, error);
      });
    },
    [loadAd],
  );
}

async function getCurrentWeather(): Promise<WeatherCondition> {
  if (typeof navigator === "undefined" || navigator.geolocation == null) {
    return "unknown";
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 1000 * 60 * 30,
      timeout: 1600,
    });
  });

  const params = new URLSearchParams({
    latitude: String(position.coords.latitude),
    longitude: String(position.coords.longitude),
    current: "weather_code,temperature_2m",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (response.ok !== true) {
    return "unknown";
  }

  const payload = (await response.json()) as {
    current?: {
      weather_code?: number;
      temperature_2m?: number;
    };
  };

  return mapWeatherCode(payload.current?.weather_code, payload.current?.temperature_2m);
}

function mapWeatherCode(weatherCode?: number, temperature?: number): WeatherCondition {
  if (typeof temperature === "number" && temperature >= 29) {
    return "hot";
  }
  if (weatherCode == null) {
    return "unknown";
  }
  if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 99)) {
    return "rain";
  }
  if (weatherCode >= 1 && weatherCode <= 3) {
    return "cloudy";
  }
  if (weatherCode === 0) {
    return "clear";
  }
  return "unknown";
}

function getSharedEntryScreen(): Screen | null {
  const path = getInitialEntryPath();
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "song" && parts[1] != null && songs.some((song) => song.id === parts[1])) {
    return { name: "song", songId: parts[1], source: "shared_entry" };
  }

  if (parts[0] === "playlist" && parts[1] != null && parts[2] != null) {
    const playlistType = parts[1] as PlaylistType;
    const playlistKey = decodeURIComponent(parts[2]);
    if (playlistType === "mood" && moods.includes(playlistKey as Mood)) {
      const list = filterSongsByMood(songs, playlistKey as Mood);
      return {
        name: "playlist",
        playlistType,
        playlistKey,
        title: playlistKey,
        subtitle: `${list.length}곡`,
        songIds: list.map((song) => song.id),
        source: "shared_entry",
      };
    }
    if (playlistType === "moment" && moments.includes(playlistKey as Moment)) {
      const list = filterSongsByMoment(songs, playlistKey as Moment);
      return {
        name: "playlist",
        playlistType,
        playlistKey,
        title: playlistKey,
        subtitle: `${list.length}곡`,
        songIds: list.map((song) => song.id),
        source: "shared_entry",
      };
    }
    if (playlistType === "year" && Number.isInteger(Number(playlistKey))) {
      const list = filterSongsByYear(songs, Number(playlistKey));
      return {
        name: "playlist",
        playlistType,
        playlistKey,
        title: `${playlistKey}년`,
        subtitle: `${list.length}곡`,
        songIds: list.map((song) => song.id),
        source: "shared_entry",
      };
    }
  }

  return null;
}

function getInitialEntryPath() {
  const hashPath = window.location.hash.replace(/^#/, "").split("?")[0];
  if (hashPath.startsWith("/")) {
    return hashPath;
  }

  try {
    const schemePath = new URL(getSchemeUri()).pathname;
    if (schemePath !== "") {
      return schemePath;
    }
  } catch {
    // Browser dev mode does not expose the Toss scheme URI.
  }

  return window.location.pathname;
}

function HomeScreen({
  dailySong,
  years,
  favoriteIdSet,
  listeningContext,
  sortOrder,
  randomSeed,
  viewMode,
  onSortOrderChange,
  onViewModeChange,
  onOpenMood,
  onOpenMoment,
  onOpenYear,
  onSongClick,
  onOpenYoutube,
  onOpenYoutubeMusic,
  onToggleFavorite,
  onShareSong,
}: {
  dailySong: (typeof songs)[number];
  years: number[];
  favoriteIdSet: Set<string>;
  listeningContext: ListeningContext;
  sortOrder: SortOrder;
  randomSeed: number;
  viewMode: ViewMode;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  onOpenMood: (mood: Mood) => void;
  onOpenMoment: (moment: Moment) => void;
  onOpenYear: (year: number) => void;
  onSongClick: (songId: string, source: AnalyticsSource) => void;
  onOpenYoutube: (songId: string, source: AnalyticsSource, url: string) => void;
  onOpenYoutubeMusic: (songId: string, source: AnalyticsSource, url: string) => void;
  onToggleFavorite: (songId: string, source: AnalyticsSource) => void;
  onShareSong: (song: (typeof songs)[number], source: AnalyticsSource) => void;
}) {
  const recommendedSongs = getSortedSongs(
    getRecommendedSongs(songs, dailySong, listeningContext),
    sortOrder,
    randomSeed,
  );
  const visibleRecommendedSongs =
    viewMode === "grid2" ? recommendedSongs.slice(0, 2) : recommendedSongs;
  const dailyYoutubeUrl = getYoutubeUrl(dailySong.videoId);
  const dailyYoutubeMusicUrl = getYoutubeMusicUrl(dailySong.videoId);

  return (
    <main className="screen home-screen">
      <section className="home-hero">
        <img
          className="home-hero-image"
          src="/assets/summer-hero.jpg"
          alt=""
          aria-hidden="true"
        />
        <div className="home-hero-shade" aria-hidden="true" />
        <div className="home-hero-content">
          <p className="eyebrow">오늘의 곡 · {songs.length}곡 중 추천</p>
          <h1>{dailySong.title}</h1>
          <p className="hero-subtitle">
            {dailySong.artist} · {dailySong.year} · {dailySong.mood}
          </p>
        </div>
        <div className="daily-panel" onClick={() => onSongClick(dailySong.id, "home_daily")}>
          <div>
            <p className="daily-panel-label">지금 바로 듣기</p>
            <strong>{dailySong.artist}</strong>
          </div>
          <div className="daily-actions">
            <button
              className="hero-action primary"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenYoutube(dailySong.id, "home_daily", dailyYoutubeUrl);
              }}
            >
              <img className="brand-asset" src="/assets/brand/youtube.svg" alt="" aria-hidden="true" />
              영상
            </button>
            <button
              className="hero-action"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenYoutubeMusic(dailySong.id, "home_daily", dailyYoutubeMusicUrl);
              }}
            >
              <img className="brand-asset round" src="/assets/brand/youtube-music.svg" alt="" aria-hidden="true" />
              뮤직
            </button>
            <button
              className={favoriteIdSet.has(dailySong.id) ? "hero-icon-action active" : "hero-icon-action"}
              type="button"
              aria-label={favoriteIdSet.has(dailySong.id) ? `${dailySong.title} 찜 해제` : `${dailySong.title} 찜하기`}
              aria-pressed={favoriteIdSet.has(dailySong.id)}
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(dailySong.id, "home_daily");
              }}
            >
              ♥
            </button>
          </div>
        </div>
      </section>

      <CategorySection
        title="무드로 듣기"
        variant="mood"
        items={moods}
        onClick={(item) => onOpenMood(item as Mood)}
      />
      <CategorySection
        title="순간으로 듣기"
        variant="moment"
        items={moments}
        onClick={(item) => onOpenMoment(item as Moment)}
      />

      <section className="section featured-section">
        <div className="section-title-row">
          <h2>지금 많이 들을 곡</h2>
          <span>바로 듣기</span>
        </div>
        <ListControls
          sortOrder={sortOrder}
          viewMode={viewMode}
          onSortOrderChange={onSortOrderChange}
          onViewModeChange={onViewModeChange}
        />
        <div className={`featured-row view-${viewMode}`}>
          {visibleRecommendedSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              compact={viewMode === "grid2" || viewMode === "grid4"}
              viewMode={viewMode}
              isFavorite={favoriteIdSet.has(song.id)}
              source="home_playlist"
              onSongClick={onSongClick}
              onOpenYoutube={onOpenYoutube}
              onOpenYoutubeMusic={onOpenYoutubeMusic}
              onToggleFavorite={onToggleFavorite}
              onShareSong={onShareSong}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title-row">
          <h2>그 해 여름</h2>
        </div>
        <div className="summer-hit-grid">
          {getSummerHitYears(years, listeningContext).map((hit) => (
            <button
              key={hit.year}
              className="summer-hit-card"
              type="button"
              aria-label={`${hit.year}년 여름 대표곡 ${hit.title} 듣기`}
              onClick={() => onOpenYear(hit.year)}
            >
              <img src={getThumbnailUrl(hit.videoId)} alt="" />
              <span className="summer-hit-year">{hit.year}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function MoodScreen({
  favoriteIdSet,
  sortOrder,
  randomSeed,
  viewMode,
  onSortOrderChange,
  onViewModeChange,
  onOpenMood,
  onOpenMoment,
  onSongClick,
  onOpenYoutube,
  onOpenYoutubeMusic,
  onToggleFavorite,
  onShareSong,
}: {
  favoriteIdSet: Set<string>;
  sortOrder: SortOrder;
  randomSeed: number;
  viewMode: ViewMode;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  onOpenMood: (mood: Mood) => void;
  onOpenMoment: (moment: Moment) => void;
  onSongClick: (songId: string, source: AnalyticsSource) => void;
  onOpenYoutube: (songId: string, source: AnalyticsSource, url: string) => void;
  onOpenYoutubeMusic: (songId: string, source: AnalyticsSource, url: string) => void;
  onToggleFavorite: (songId: string, source: AnalyticsSource) => void;
  onShareSong: (song: (typeof songs)[number], source: AnalyticsSource) => void;
}) {
  const sortedSongs = getSortedSongs(songs, sortOrder, randomSeed);

  return (
    <main className="screen">
      <VisualHeader
        asset="/assets/generated/nav-mood.jpg"
        eyebrow="무드와 순간"
        title="지금 분위기에 맞춰 골라요"
        description="상큼한 시작부터 밤바다 감성까지 바로 이어지는 여름노래"
      />
      <CategorySection
        title="무드"
        variant="mood"
        items={moods}
        onClick={(item) => onOpenMood(item as Mood)}
      />
      <CategorySection
        title="순간"
        variant="moment"
        items={moments}
        onClick={(item) => onOpenMoment(item as Moment)}
      />
      <section className="section">
        <div className="section-title-row">
          <h2>전체 곡</h2>
          <span>{songs.length}곡</span>
        </div>
        <ListControls
          sortOrder={sortOrder}
          viewMode={viewMode}
          onSortOrderChange={onSortOrderChange}
          onViewModeChange={onViewModeChange}
        />
        <div className={`song-list view-${viewMode}`}>
          {sortedSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              viewMode={viewMode}
              isFavorite={favoriteIdSet.has(song.id)}
              source="mood_list"
              onSongClick={onSongClick}
              onOpenYoutube={onOpenYoutube}
              onOpenYoutubeMusic={onOpenYoutubeMusic}
              onToggleFavorite={onToggleFavorite}
              onShareSong={onShareSong}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function YearScreen({
  years,
  listeningContext,
  onOpenYear,
}: {
  years: number[];
  listeningContext: ListeningContext;
  onOpenYear: (year: number) => void;
}) {
  return (
    <main className="screen">
      <VisualHeader
        asset="/assets/generated/nav-year.jpg"
        eyebrow="그 해 여름"
        title="연도별 추억 플레이리스트"
        description="요즘 곡부터 다시 듣고 싶은 여름 히트곡까지"
      />
      <section className="section">
        <div className="section-title-row">
          <h2>연도별로 듣기</h2>
        </div>
        <div className="year-timeline-grid">
          {years.map((year) => {
            const hit = getSummerHitForYear(year, listeningContext);
            return (
              <button
                key={year}
                className="year-card"
                type="button"
                onClick={() => onOpenYear(year)}
              >
                {hit != null && <img src={getThumbnailUrl(hit.videoId)} alt="" />}
                <span className="year-card-label">{year}</span>
                <strong>{filterSongsByYear(songs, year).length}곡</strong>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function FavoritesScreen({
  favoriteSongIds,
  favoriteIdSet,
  isLoaded,
  sortOrder,
  randomSeed,
  viewMode,
  onSortOrderChange,
  onViewModeChange,
  onSongClick,
  onOpenYoutube,
  onOpenYoutubeMusic,
  onToggleFavorite,
  onShareSong,
}: {
  favoriteSongIds: string[];
  favoriteIdSet: Set<string>;
  isLoaded: boolean;
  sortOrder: SortOrder;
  randomSeed: number;
  viewMode: ViewMode;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  onSongClick: (songId: string, source: AnalyticsSource) => void;
  onOpenYoutube: (songId: string, source: AnalyticsSource, url: string) => void;
  onOpenYoutubeMusic: (songId: string, source: AnalyticsSource, url: string) => void;
  onToggleFavorite: (songId: string, source: AnalyticsSource) => void;
  onShareSong: (song: (typeof songs)[number], source: AnalyticsSource) => void;
}) {
  const favoriteSongs = getSortedSongs(
    favoriteSongIds
      .map((songId) => songs.find((song) => song.id === songId))
      .filter((song): song is (typeof songs)[number] => song != null),
    sortOrder,
    randomSeed,
  );

  return (
    <main className="screen">
      <VisualHeader
        asset="/assets/generated/nav-favorites.jpg"
        eyebrow="내가 저장한 곡"
        title="다시 들을 여름노래"
        description="찜한 곡은 이 기기에 저장돼요"
      />
      <section className="section">
        <div className="section-title-row">
          <h2>찜한 여름노래</h2>
          <span>{favoriteSongs.length}곡</span>
        </div>
        {!isLoaded ? (
          <section className="empty-state">
            <div className="empty-mark">...</div>
            <h2>찜 목록을 불러오고 있어요</h2>
            <p>잠시만 기다려 주세요.</p>
          </section>
        ) : favoriteSongs.length === 0 ? (
          <section className="empty-state">
            <div className="empty-mark">찜</div>
            <h2>아직 찜한 곡이 없어요</h2>
            <p>오늘 듣고 싶은 여름노래를 모아두세요.</p>
          </section>
        ) : (
          <>
          <ListControls
            sortOrder={sortOrder}
            viewMode={viewMode}
            onSortOrderChange={onSortOrderChange}
            onViewModeChange={onViewModeChange}
          />
          <div className={`song-list view-${viewMode}`}>
            {favoriteSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                viewMode={viewMode}
                isFavorite={favoriteIdSet.has(song.id)}
                source="favorites"
                onSongClick={onSongClick}
                onOpenYoutube={onOpenYoutube}
                onOpenYoutubeMusic={onOpenYoutubeMusic}
                onToggleFavorite={onToggleFavorite}
                onShareSong={onShareSong}
              />
            ))}
          </div>
          </>
        )}
      </section>
    </main>
  );
}

function PlaylistScreen({
  screen,
  favoriteIdSet,
  sortOrder,
  randomSeed,
  viewMode,
  onSortOrderChange,
  onViewModeChange,
  onBack,
  onSongClick,
  onOpenYoutube,
  onOpenYoutubeMusic,
  onToggleFavorite,
  onShareSong,
}: {
  screen: Extract<Screen, { name: "playlist" }>;
  favoriteIdSet: Set<string>;
  sortOrder: SortOrder;
  randomSeed: number;
  viewMode: ViewMode;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  onBack: () => void;
  onSongClick: (songId: string, source: AnalyticsSource) => void;
  onOpenYoutube: (songId: string, source: AnalyticsSource, url: string) => void;
  onOpenYoutubeMusic: (songId: string, source: AnalyticsSource, url: string) => void;
  onToggleFavorite: (songId: string, source: AnalyticsSource) => void;
  onShareSong: (song: (typeof songs)[number], source: AnalyticsSource) => void;
}) {
  const playlistSongs = getPlaylistSongs(screen, sortOrder, randomSeed);

  return (
    <main className="screen">
      <section className="section playlist-header">
        <button className="text-link" type="button" onClick={onBack}>
          홈으로
        </button>
        <h2>{screen.title}</h2>
        <p>{screen.subtitle} · 공식 영상으로 이동</p>
      </section>
      {playlistSongs.length === 0 ? (
        <section className="empty-state">
          <h2>곡이 없어요</h2>
          <p>다른 필터를 선택해 주세요.</p>
        </section>
      ) : (
        <>
        <ListControls
          sortOrder={sortOrder}
          viewMode={viewMode}
          onSortOrderChange={onSortOrderChange}
          onViewModeChange={onViewModeChange}
        />
        <div className={`song-list view-${viewMode}`}>
          {playlistSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              viewMode={viewMode}
              isFavorite={favoriteIdSet.has(song.id)}
              source={screen.source}
              onSongClick={onSongClick}
              onOpenYoutube={onOpenYoutube}
              onOpenYoutubeMusic={onOpenYoutubeMusic}
              onToggleFavorite={onToggleFavorite}
              onShareSong={onShareSong}
            />
          ))}
        </div>
        </>
      )}
    </main>
  );
}

function SharedSongScreen({
  songId,
  favoriteIdSet,
  onBack,
  onSongClick,
  onOpenYoutube,
  onOpenYoutubeMusic,
  onToggleFavorite,
  onShareSong,
}: {
  songId: string;
  favoriteIdSet: Set<string>;
  onBack: () => void;
  onSongClick: (songId: string, source: AnalyticsSource) => void;
  onOpenYoutube: (songId: string, source: AnalyticsSource, url: string) => void;
  onOpenYoutubeMusic: (songId: string, source: AnalyticsSource, url: string) => void;
  onToggleFavorite: (songId: string, source: AnalyticsSource) => void;
  onShareSong: (song: (typeof songs)[number], source: AnalyticsSource) => void;
}) {
  const song = songs.find((currentSong) => currentSong.id === songId);

  return (
    <main className="screen">
      <section className="section playlist-header">
        <button className="text-link" type="button" onClick={onBack}>
          홈으로
        </button>
        <h2>공유받은 여름노래</h2>
        <p>앱 안에서 곡을 확인한 뒤 공식 영상으로 이동해요</p>
      </section>
      {song == null ? (
        <section className="empty-state">
          <h2>곡을 찾을 수 없어요</h2>
          <p>홈에서 다른 여름노래를 골라보세요.</p>
        </section>
      ) : (
        <SongCard
          song={song}
          isFavorite={favoriteIdSet.has(song.id)}
          source="shared_entry"
          onSongClick={onSongClick}
          onOpenYoutube={onOpenYoutube}
          onOpenYoutubeMusic={onOpenYoutubeMusic}
          onToggleFavorite={onToggleFavorite}
          onShareSong={onShareSong}
        />
      )}
    </main>
  );
}

function CategorySection({
  title,
  variant,
  items,
  onClick,
}: {
  title: string;
  variant: "mood" | "moment";
  items: string[];
  onClick: (item: string) => void;
}) {
  return (
    <section className="section">
      <div className="section-title-row">
        <h2>{title}</h2>
      </div>
      <div className="category-grid">
        {items.map((item) => (
          <div key={item} className="category-card-wrap">
            <button className="category-card" type="button" onClick={() => onClick(item)}>
              <span
                className={`category-art ${getCategoryClassName(item)}`}
                style={{ backgroundImage: `url(${getCategoryImage(variant, item)})` }}
                aria-hidden="true"
              />
              <span className="category-copy">
                <strong>{item}</strong>
                <small>{getCategoryCaption(variant, item)}</small>
              </span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ListControls({
  sortOrder,
  viewMode,
  onSortOrderChange,
  onViewModeChange,
}: {
  sortOrder: SortOrder;
  viewMode: ViewMode;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
}) {
  return (
    <div className="list-controls">
      <label className="sort-control">
        <span>정렬</span>
        <select
          value={sortOrder}
          onClick={() => {
            if (sortOrder === "random") {
              onSortOrderChange("random");
            }
          }}
          onChange={(event) => onSortOrderChange(event.target.value as SortOrder)}
        >
          <option value="latest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="random">랜덤</option>
        </select>
      </label>
      <div className="view-mode-control" role="group" aria-label="보기">
        <span>보기</span>
        {(["grid2", "grid4", "grid1", "compact"] as const).map((mode) => (
          <button
            key={mode}
            className={viewMode === mode ? "active" : ""}
            type="button"
            aria-label={getViewModeLabel(mode)}
            aria-pressed={viewMode === mode}
            onClick={() => onViewModeChange(mode)}
          >
            <span className={`view-icon view-icon-${mode}`} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

function getViewModeLabel(viewMode: ViewMode) {
  if (viewMode === "grid2") {
    return "2단 보기";
  }
  if (viewMode === "grid4") {
    return "4단 보기";
  }
  if (viewMode === "grid1") {
    return "1단 보기";
  }
  return "간략히 보기";
}

function AdSlot() {
  const adGroupId = BANNER_AD_GROUP_ID;
  const adRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (
      adGroupId == null ||
      TossAds.initialize.isSupported() !== true ||
      TossAds.attachBanner.isSupported() !== true
    ) {
      return;
    }

    TossAds.initialize({
      callbacks: {
        onInitialized: () => setIsInitialized(true),
        onInitializationFailed: (error) => {
          console.error("Failed to initialize banner ad", error);
        },
      },
    });
  }, [adGroupId]);

  useEffect(() => {
    if (
      adGroupId == null ||
      !isInitialized ||
      adRef.current == null ||
      TossAds.attachBanner.isSupported() !== true
    ) {
      return;
    }

    const attachedAd = TossAds.attachBanner(adGroupId, adRef.current, {
      theme: "auto",
      variant: "card",
      tone: "grey",
      callbacks: {
        onAdFailedToRender: (payload) => {
          console.error("Failed to render banner ad", payload.error);
        },
        onNoFill: () => {
          if (import.meta.env.DEV) {
            console.warn("No banner ad inventory is currently available");
          }
        },
      },
    });

    return () => {
      attachedAd.destroy();
    };
  }, [adGroupId, isInitialized]);

  if (adGroupId == null) {
    return null;
  }

  return (
    <section className="ad-section" aria-label="광고">
      <div ref={adRef} className="ad-slot" />
    </section>
  );
}

function VisualHeader({
  asset,
  eyebrow,
  title,
  description,
}: {
  asset: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="visual-header">
      <img className="visual-header-image" src={asset} alt="" aria-hidden="true" />
      <div className="visual-header-copy">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
    </section>
  );
}

function getRecommendedSongs(songList: Song[], dailySong: Song, context: ListeningContext) {
  const sessionKey = `${getDateKey(new Date())}:${context.seed}:${context.hour}:${context.day}:${context.weather}`;
  const rankedSongs = songList
    .filter((song) => song.id !== dailySong.id && hasCleanSongMetadata(song))
    .map((song) => ({
      song,
      score: getRecommendationScore(song, sessionKey, context),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.song.id.localeCompare(b.song.id);
    });

  const selectedSongs: Song[] = [];
  const artistCounts = new Map<string, number>();
  const moodCounts = new Map<Mood, number>();
  const momentCounts = new Map<Moment, number>();

  for (const { song } of rankedSongs) {
    const artistKey = normalizeArtistName(song.artist);
    const artistCount = artistCounts.get(artistKey) ?? 0;
    const moodCount = moodCounts.get(song.mood) ?? 0;
    const hasCrowdedMoment = song.moments.some((moment) => (momentCounts.get(moment) ?? 0) >= 8);

    if (selectedSongs.length < 12 && artistCount >= 1) {
      continue;
    }
    if (selectedSongs.length < 16 && moodCount >= 6) {
      continue;
    }
    if (selectedSongs.length < 16 && hasCrowdedMoment) {
      continue;
    }

    selectedSongs.push(song);
    artistCounts.set(artistKey, artistCount + 1);
    moodCounts.set(song.mood, moodCount + 1);
    for (const moment of song.moments) {
      momentCounts.set(moment, (momentCounts.get(moment) ?? 0) + 1);
    }

    if (selectedSongs.length >= 24) {
      break;
    }
  }

  return selectedSongs;
}

function getRecommendationScore(song: Song, sessionKey: string, context: ListeningContext) {
  const moodScoreByMood: Record<Mood, number> = {
    청량시원: 1,
    상큼발랄: 0.94,
    설렘두근: 0.78,
    센치감성: 0.7,
  };
  const momentScore =
    song.moments.includes("바다") || song.moments.includes("드라이브")
      ? 1
      : song.moments.includes("밤바다")
        ? 0.82
        : 0.72;
  const generationFitScore = getGenerationFitScore(song.year);
  const contextScore = getContextScore(song, context);
  const rotationScore = getSeededRatio(`${sessionKey}:${song.id}`);

  return (
    moodScoreByMood[song.mood] * 0.24 +
    momentScore * 0.22 +
    generationFitScore * 0.2 +
    contextScore * 0.2 +
    rotationScore * 0.14
  );
}

function getGenerationFitScore(year: number) {
  if (year >= 2018 && year <= 2024) {
    return 1;
  }
  if (year >= 2015 && year <= 2017) {
    return 0.9;
  }
  if (year >= 2025) {
    return 0.84;
  }
  return 0.74;
}

function getSeededRatio(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function normalizeArtistName(artist: string) {
  return artist
    .replace(/\([^)]*\)/g, "")
    .replace(/[가-힣]+$/g, "")
    .trim()
    .toLowerCase();
}

function getPlaylistSongs(screen: Extract<Screen, { name: "playlist" }>, sortOrder: SortOrder, randomSeed: number) {
  const songById = new Map(songs.map((song) => [song.id, song]));
  const orderedSongs = screen.songIds
    .map((songId) => songById.get(songId))
    .filter((song): song is Song => song != null);

  if (screen.playlistType === "year" && sortOrder === "latest") {
    return orderedSongs;
  }

  return getSortedSongs(orderedSongs, sortOrder, randomSeed);
}

function getContextualYearSongs(year: number, context: ListeningContext) {
  const yearSongs = filterSongsByYear(songs, year);
  const cleanSongs = yearSongs.filter(hasCleanSongMetadata);
  const rankedSongs = (cleanSongs.length > 0 ? cleanSongs : yearSongs)
    .map((song) => ({
      song,
      score: getYearSongScore(song, year, context),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.song.id.localeCompare(b.song.id);
    })
    .map(({ song }) => song);

  const rankedIdSet = new Set(rankedSongs.map((song) => song.id));
  const fallbackSongs = yearSongs.filter((song) => rankedIdSet.has(song.id) !== true);

  return [...rankedSongs, ...fallbackSongs];
}

function getYearSongScore(song: Song, year: number, context: ListeningContext) {
  const sessionKey = `${year}:${context.seed}:${context.hour}:${context.day}:${context.weather}`;
  const contextScore = getContextScore(song, context);
  const summerMomentScore =
    song.moments.includes("바다") || song.moments.includes("드라이브")
      ? 1
      : song.moments.includes("밤바다")
        ? 0.86
        : 0.76;
  const moodScore =
    song.mood === "청량시원"
      ? 1
      : song.mood === "상큼발랄"
        ? 0.95
        : song.mood === "설렘두근"
          ? 0.84
          : 0.78;
  const rotationScore = getSeededRatio(`${sessionKey}:${song.id}`);

  return contextScore * 0.36 + summerMomentScore * 0.26 + moodScore * 0.18 + rotationScore * 0.2;
}

function getSummerHitYears(years: number[], context: ListeningContext) {
  return years
    .map((year) => getSummerHitForYear(year, context))
    .filter((hit): hit is { year: number; title: string; videoId: string } => hit != null)
    .slice(0, 8);
}

function getSummerHitForYear(year: number, context: ListeningContext) {
  const summerHits: Record<number, { year: number; title: string; videoId: string }> = {
    2024: { year: 2024, title: "Supernova", videoId: "phuiiNCxRMg" },
    2023: { year: 2023, title: "Super Shy", videoId: "ArmDp-zijuc" },
    2022: { year: 2022, title: "Attention", videoId: "js1CtxSY38I" },
    2021: { year: 2021, title: "Butter", videoId: "WMweEpGlu_U" },
    2020: { year: 2020, title: "Dynamite", videoId: "gdZLi9oWNZg" },
    2019: { year: 2019, title: "짐살라빔", videoId: "YBnGBb1wg98" },
    2018: { year: 2018, title: "Love Scenario", videoId: "vecSVX1QYbQ" },
    2017: { year: 2017, title: "비도 오고 그래서", videoId: "afxLaQiLu-o" },
  };

  const contextualSong = getContextualYearSongs(year, context)[0];
  if (contextualSong != null) {
    return { year, title: contextualSong.title, videoId: contextualSong.videoId };
  }

  const fallbackSong = summerHits[year] ?? songs.find((song) => song.year === year);
  return fallbackSong != null ? { year, title: fallbackSong.title, videoId: fallbackSong.videoId } : null;
}

function getSortedSongs<T extends { id: string; year: number }>(
  songList: T[],
  sortOrder: SortOrder,
  randomSeed: number,
) {
  if (sortOrder === "random") {
    return shuffleWithSeed(songList, randomSeed);
  }

  return [...songList].sort((a, b) => {
    const yearCompare = sortOrder === "latest" ? b.year - a.year : a.year - b.year;
    if (yearCompare !== 0) {
      return yearCompare;
    }
    return sortOrder === "latest" ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
  });
}

function shuffleWithSeed<T>(items: T[], seed: number) {
  const nextItems = [...items];
  let value = seed || 1;

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    value = (value * 1664525 + 1013904223) % 4294967296;
    const swapIndex = value % (index + 1);
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function getCategoryClassName(item: string) {
  const classNames: Record<string, string> = {
    상큼발랄: "category-art-fresh",
    청량시원: "category-art-cool",
    설렘두근: "category-art-heart",
    센치감성: "category-art-sentimental",
    바다: "category-art-sea",
    드라이브: "category-art-drive",
    밤바다: "category-art-night",
    비오는날: "category-art-rain",
  };
  return classNames[item] ?? "category-art-fresh";
}

function getCategoryImage(variant: "mood" | "moment", item: string) {
  if (variant === "mood") {
    const imageByMood: Record<string, string> = {
      상큼발랄: "/assets/categories/mood-fresh.jpg",
      청량시원: "/assets/categories/mood-cool.jpg",
      설렘두근: "/assets/categories/mood-heart.jpg",
      센치감성: "/assets/categories/mood-sentimental.jpg",
    };
    return imageByMood[item] ?? "/assets/categories/mood-fresh.jpg";
  }

  const imageByMoment: Record<string, string> = {
    바다: "/assets/categories/moment-sea.jpg",
    드라이브: "/assets/categories/moment-drive.jpg",
    밤바다: "/assets/categories/moment-night.jpg",
    비오는날: "/assets/categories/moment-rain.jpg",
  };

  return imageByMoment[item] ?? "/assets/categories/moment-sea.jpg";
}

function getCategoryCaption(variant: "mood" | "moment", item: string) {
  if (variant === "mood") {
    return `${filterSongsByMood(songs, item as Mood).length}곡`;
  }
  return `${filterSongsByMoment(songs, item as Moment).length}곡`;
}

export default App;
