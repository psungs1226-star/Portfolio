import { getTossShareLink, share } from "@apps-in-toss/web-framework";
import config from "../../granite.config";
import type { Moment, Mood, Song } from "../data/songs";

export type SongSharePayload = {
  type: "song";
  songId: string;
  title: string;
  artist: string;
  entryPath: `/song/${string}`;
  shareText: string;
};

export type PlaylistSharePayload = {
  type: "mood" | "moment" | "year";
  key: string;
  label: string;
  entryPath: `/playlist/${string}`;
  shareText: string;
};

export const shareTextCandidates = {
  song: [
    "오늘은 이 여름노래 어때요? {artist} - {title}",
    "지금 듣기 좋은 여름노래를 보냈어요. {artist} - {title}",
  ],
  playlist: [
    "지금 듣기 좋은 {label} 여름 플레이리스트",
    "{label} 분위기에 맞는 여름노래를 모았어요",
  ],
} as const;

export function createSongSharePayload(song: Song): SongSharePayload {
  return {
    type: "song",
    songId: song.id,
    title: song.title,
    artist: song.artist,
    entryPath: `/song/${song.id}`,
    shareText: shareTextCandidates.song[0]
      .replace("{artist}", song.artist)
      .replace("{title}", song.title),
  };
}

export function createPlaylistSharePayload(
  type: "mood" | "moment" | "year",
  key: Mood | Moment | string,
  label: string,
): PlaylistSharePayload {
  return {
    type,
    key,
    label,
    entryPath: `/playlist/${type}/${encodeURIComponent(key)}`,
    shareText: shareTextCandidates.playlist[0].replace("{label}", label),
  };
}

export async function shareSong(payload: SongSharePayload) {
  await sharePayload(payload.entryPath, payload.shareText, "share_song");
}

export async function sharePlaylist(payload: PlaylistSharePayload) {
  await sharePayload(payload.entryPath, payload.shareText, "share_playlist");
}

async function sharePayload(
  entryPath: SongSharePayload["entryPath"] | PlaylistSharePayload["entryPath"],
  shareText: string,
  referrer: "share_song" | "share_playlist",
) {
  const deepLink = `intoss://${config.appName}${entryPath}?referrer=${referrer}`;
  const tossLink = await getTossShareLink(deepLink);
  const message = `${shareText}\n${tossLink}`;

  try {
    await share({ message });
  } catch (error) {
    if (import.meta.env.DEV && navigator.share != null) {
      await navigator.share({ text: message });
      return;
    }
    throw error;
  }
}

