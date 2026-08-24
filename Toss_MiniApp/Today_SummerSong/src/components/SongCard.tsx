import type { Song } from "../data/songs";
import type { AnalyticsSource } from "../lib/analytics";
import { getThumbnailUrl, getYoutubeMusicUrl, getYoutubeUrl } from "../lib/songUtils";

type SongCardProps = {
  song: Song;
  compact?: boolean;
  viewMode?: "grid2" | "grid4" | "grid1" | "compact";
  isFavorite: boolean;
  source: AnalyticsSource;
  onSongClick: (songId: string, source: AnalyticsSource) => void;
  onOpenYoutube: (songId: string, source: AnalyticsSource, url: string) => void;
  onOpenYoutubeMusic: (songId: string, source: AnalyticsSource, url: string) => void;
  onToggleFavorite: (songId: string, source: AnalyticsSource) => void;
  onShareSong: (song: Song, source: AnalyticsSource) => void;
};

export function SongCard({
  song,
  compact = false,
  viewMode = "grid2",
  isFavorite,
  source,
  onSongClick,
  onOpenYoutube,
  onOpenYoutubeMusic,
  onToggleFavorite,
  onShareSong,
}: SongCardProps) {
  const youtubeUrl = getYoutubeUrl(song.videoId);
  const youtubeMusicUrl = getYoutubeMusicUrl(song.videoId);
  const isIconOnlyView = viewMode === "grid2" || viewMode === "grid4" || viewMode === "grid1" || viewMode === "compact";

  return (
    <article
      className={[
        "song-card",
        compact ? "compact" : "",
        viewMode === "grid4" ? "grid4-view" : "",
        viewMode === "grid1" ? "grid1-view" : "",
        viewMode === "compact" ? "compact-view" : "",
      ].filter(Boolean).join(" ")}
      onClick={() => onSongClick(song.id, source)}
    >
      <img className="song-thumb" src={getThumbnailUrl(song.videoId)} alt="" />
      <div className="song-body">
        <div className="song-meta">
          <span>{song.year}</span>
          <span>{song.mood}</span>
          <span>{song.group}</span>
        </div>
        <h3>{song.title}</h3>
        <p>{song.artist}</p>
        <div className="tag-row">
          {song.moments.map((moment) => (
            <span key={moment} className="tag">
              {moment}
            </span>
          ))}
        </div>
        <div className="song-actions">
          <button
            className="cta-button primary"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenYoutube(song.id, source, youtubeUrl);
            }}
          >
            <img className="brand-asset" src="/assets/brand/youtube.svg" alt="" aria-hidden="true" />
            {!isIconOnlyView && (
              <>
                <span className="cta-label cta-label-full">영상보기</span>
                <span className="cta-label cta-label-short">영상</span>
              </>
            )}
          </button>
          <button
            className="cta-button secondary"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenYoutubeMusic(song.id, source, youtubeMusicUrl);
            }}
          >
            <img className="brand-asset round" src="/assets/brand/youtube-music.svg" alt="" aria-hidden="true" />
            {!isIconOnlyView && <span className="cta-label">뮤직</span>}
          </button>
          <button
            className={isFavorite ? "favorite-button active" : "favorite-button"}
            type="button"
            aria-label={isFavorite ? `${song.title} 찜 해제` : `${song.title} 찜하기`}
            aria-pressed={isFavorite}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(song.id, source);
            }}
          >
            ♥
          </button>
          <button
            className="share-button"
            type="button"
            aria-label={`${song.title} 공유하기`}
            onClick={(event) => {
              event.stopPropagation();
              onShareSong(song, source);
            }}
          >
            <span className="share-icon" aria-hidden="true" />
            <span className="share-label">공유</span>
          </button>
        </div>
      </div>
    </article>
  );
}
