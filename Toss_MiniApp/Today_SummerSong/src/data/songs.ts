import curatedSongsData from "./curatedSongs.json";

export type Mood = "상큼발랄" | "청량시원" | "설렘두근" | "센치감성";
export type Moment = "바다" | "드라이브" | "밤바다" | "비오는날";
export type ArtistGroup = "여돌" | "남돌" | "솔로" | "밴드" | "그룹" | "힙합" | "기타";

export type Song = {
  id: string;
  title: string;
  artist: string;
  year: number;
  mood: Mood;
  moments: Moment[];
  group: ArtistGroup;
  videoId: string;
  evidenceUrl?: string;
  selectionBasis?: string;
  tagReason?: string;
};

export const moods: Mood[] = ["상큼발랄", "청량시원", "설렘두근", "센치감성"];
export const moments: Moment[] = ["바다", "드라이브", "밤바다", "비오는날"];
export const songs = curatedSongsData as Song[];
export const summerSongs = songs;
