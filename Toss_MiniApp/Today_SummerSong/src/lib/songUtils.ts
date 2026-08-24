import { openURL } from "@apps-in-toss/web-framework";
import type { Moment, Mood, Song } from "../data/songs";

export type WeatherCondition = "clear" | "cloudy" | "rain" | "hot" | "unknown";

export type ListeningContext = {
  seed: number;
  hour: number;
  day: number;
  weather: WeatherCondition;
};

export function getYoutubeUrl(videoId: string) {
  return `https://youtu.be/${videoId}`;
}

export function getYoutubeMusicUrl(videoId: string) {
  return `https://music.youtube.com/watch?v=${videoId}`;
}

export function getThumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getDailySong(date: Date, songList: Song[], context: ListeningContext) {
  const sessionKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}:${context.seed}:${context.hour}:${context.day}:${context.weather}`;
  const years = songList.map((song) => song.year);
  const newestYear = Math.max(...years);
  const oldestYear = Math.min(...years);
  const yearRange = Math.max(1, newestYear - oldestYear);

  const cleanSongList = songList.filter(hasCleanSongMetadata);
  const candidateSongs = cleanSongList.length > 0 ? cleanSongList : songList;

  return [...candidateSongs].sort((a, b) => {
    const aScore = getDailySongScore(a, sessionKey, oldestYear, yearRange, context);
    const bScore = getDailySongScore(b, sessionKey, oldestYear, yearRange, context);

    if (bScore !== aScore) {
      return bScore - aScore;
    }
    return a.id.localeCompare(b.id);
  })[0];
}

export function hasCleanSongMetadata(song: Song) {
  const text = `${song.title} ${song.artist}`;
  const roughMetadataPattern =
    /official|produced by|prod\.|studio choom|music festival|summer movie|bonus chapter|track\b|performance|dance practice|stage|fancam|@|\[|\]|tomorrow x together official|\/$|\s\)$/i;

  return roughMetadataPattern.test(text) !== true;
}

function getDailySongScore(
  song: Song,
  sessionKey: string,
  oldestYear: number,
  yearRange: number,
  context: ListeningContext,
) {
  const sessionScore = getSeededRatio(`${sessionKey}:${song.id}`);
  const recencyScore = (song.year - oldestYear) / yearRange;
  const summerContextScore = Math.min(song.moments.length / 3, 1);
  const contextScore = getContextScore(song, context);

  return sessionScore * 0.58 + contextScore * 0.22 + recencyScore * 0.12 + summerContextScore * 0.08;
}

export function createListeningContext(seed: number, date: Date, weather: WeatherCondition): ListeningContext {
  return {
    seed,
    hour: date.getHours(),
    day: date.getDay(),
    weather,
  };
}

export function createLaunchSeed() {
  const cryptoValue = new Uint32Array(1);
  if (typeof window !== "undefined" && window.crypto != null) {
    window.crypto.getRandomValues(cryptoValue);
  }
  return Date.now() ^ cryptoValue[0];
}

export function getContextScore(song: Song, context: ListeningContext) {
  const hourScore = getHourScore(song, context.hour);
  const dayScore = getDayScore(song, context.day);
  const weatherScore = getWeatherScore(song, context.weather);

  return hourScore * 0.38 + dayScore * 0.22 + weatherScore * 0.4;
}

function getHourScore(song: Song, hour: number) {
  if (hour >= 6 && hour < 11) {
    return song.mood === "상큼발랄" || song.mood === "청량시원" ? 1 : 0.72;
  }
  if (hour >= 11 && hour < 17) {
    return song.moments.includes("바다") || song.moments.includes("드라이브") ? 1 : 0.76;
  }
  if (hour >= 17 && hour < 22) {
    return song.mood === "설렘두근" || song.moments.includes("드라이브") ? 1 : 0.78;
  }
  return song.mood === "센치감성" || song.moments.includes("밤바다") ? 1 : 0.68;
}

function getDayScore(song: Song, day: number) {
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) {
    return song.moments.includes("바다") || song.moments.includes("드라이브") ? 1 : 0.78;
  }
  return song.mood === "청량시원" || song.mood === "상큼발랄" ? 1 : 0.82;
}

function getWeatherScore(song: Song, weather: WeatherCondition) {
  if (weather === "rain") {
    return song.moments.includes("비오는날") || song.mood === "센치감성" ? 1 : 0.62;
  }
  if (weather === "hot") {
    return song.mood === "청량시원" || song.moments.includes("바다") ? 1 : 0.74;
  }
  if (weather === "clear") {
    return song.moments.includes("바다") || song.mood === "상큼발랄" ? 1 : 0.78;
  }
  if (weather === "cloudy") {
    return song.mood === "센치감성" || song.moments.includes("밤바다") ? 1 : 0.76;
  }
  return 0.86;
}

function getSeededRatio(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

export function filterSongsByMood(songList: Song[], mood: Mood) {
  return songList.filter((song) => song.mood === mood);
}

export function filterSongsByMoment(songList: Song[], moment: Moment) {
  return songList.filter((song) => song.moments.includes(moment));
}

export function filterSongsByYear(songList: Song[], year: number) {
  return songList.filter((song) => song.year === year);
}

export function getYears(songList: Song[]) {
  return Array.from(new Set(songList.map((song) => song.year))).sort(
    (a, b) => b - a,
  );
}

export async function openExternalUrl(url: string) {
  try {
    await openURL(url);
  } catch (error) {
    if (import.meta.env.DEV) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    throw error;
  }
}
