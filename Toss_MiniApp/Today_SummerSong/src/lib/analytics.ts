import { eventLog } from "@apps-in-toss/web-framework";

export type Referrer = "direct" | "share_song" | "share_playlist" | "challenge_surface" | "unknown";

export type AnalyticsSource =
  | "home_daily"
  | "home_playlist"
  | "mood_list"
  | "moment_list"
  | "year_list"
  | "favorites"
  | "shared_entry";

export type AnalyticsEvent =
  | { name: "home_viewed"; params: { referrer: Referrer; dailySongId: string } }
  | { name: "daily_song_viewed"; params: { songId: string; dateKey: string } }
  | { name: "song_card_clicked"; params: { songId: string; source: AnalyticsSource } }
  | { name: "youtube_open_clicked"; params: { songId: string; source: AnalyticsSource } }
  | { name: "youtube_music_open_clicked"; params: { songId: string; source: AnalyticsSource } }
  | { name: "favorite_added"; params: { songId: string; source: AnalyticsSource } }
  | { name: "favorite_removed"; params: { songId: string; source: AnalyticsSource } }
  | {
      name: "share_clicked";
      params: { shareType: "song" | "mood" | "moment" | "year"; targetId: string; source: AnalyticsSource };
    }
  | { name: "playlist_viewed"; params: { playlistType: "mood" | "moment" | "year"; playlistKey: string } };

export function trackAnalyticsEvent(event: AnalyticsEvent) {
  eventLog({
    log_name: event.name,
    log_type: "event",
    params: event.params,
  }).catch((error) => {
    if (import.meta.env.DEV) {
      console.warn("Failed to log analytics event", event, error);
    }
  });
}

export function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

