import React from 'react';
import { Play, Pause, Heart, Plus, Clock, HardDrive, Music, Loader2 } from 'lucide-react';
import { Track } from '../types/music';

interface TrackTableProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedTrackIds: string[];
  resolvingTrackIds?: string[];
  onPlayTrack: (track: Track) => void;
  onToggleLike: (videoId: string, track?: Track) => void;
  onAddToQueue: (track: Track) => void;
  onArtistClick?: (artist: string) => void;
  isMobile?: boolean;
}

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec < 0) return '3:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const DEFAULT_TRACK_THUMBNAIL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%231a1a20"/><text x="50%" y="54%" font-family="sans-serif" font-weight="bold" font-size="24" fill="%231DB954" text-anchor="middle" dominant-baseline="middle">♪</text></svg>`;

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  likedTrackIds,
  resolvingTrackIds = [],
  onPlayTrack,
  onToggleLike,
  onAddToQueue,
  onArtistClick,
  isMobile = false,
}) => {
  if (tracks.length === 0) {
    return (
      <div className="py-12 text-center text-[#8a8a92]">
        <Music className="w-10 h-10 mx-auto mb-2 text-zinc-600 stroke-[1.5]" />
        <p className="text-sm font-semibold text-white">No tracks found</p>
        <p className="text-xs text-[#8a8a92] mt-1">Try another search or import a track to your library</p>
      </div>
    );
  }

  return (
    <div className="w-full select-none text-white">
      {/* Header */}
      <div
        className={`grid ${
          isMobile
            ? 'grid-cols-[28px_minmax(0,1fr)_auto] gap-2.5 px-2.5'
            : 'grid-cols-[28px_minmax(0,1fr)_auto] sm:grid-cols-[36px_minmax(0,1fr)_90px_100px] md:grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_90px_100px] gap-2.5 sm:gap-4 px-2.5 sm:px-4'
        } py-2 border-b border-[#1e1e24] text-[11px] font-semibold uppercase tracking-wider text-[#b3b3b3]`}
      >
        <div className="text-center">#</div>
        <div className="min-w-0">Title</div>
        {!isMobile && <div className="hidden md:block min-w-0">Album</div>}
        {!isMobile && <div className="text-center hidden sm:block">Fidelity</div>}
        <div className="text-right flex items-center justify-end gap-1">
          <Clock className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#1e1e24]/40">
        {tracks.map((track, idx) => {
          const hasVideoId = Boolean(track.video_id && track.video_id.trim().length > 0);
          const trackId = track.video_id || track.id || `${track.title}-${idx}`;
          const isResolving =
            resolvingTrackIds.includes(trackId) ||
            (track.id ? resolvingTrackIds.includes(track.id) : false);
          const isCurrent =
            Boolean(currentTrack) &&
            ((hasVideoId && (currentTrack?.video_id || currentTrack?.id) === track.video_id) ||
              (track.id && (currentTrack?.id || currentTrack?.video_id) === track.id) ||
              (currentTrack?.title === track.title && currentTrack?.artist === track.artist));
          const isLiked = likedTrackIds.includes(trackId);
          const thumb =
            track.thumbnail ||
            (hasVideoId ? `https://i.ytimg.com/vi/${track.video_id}/hqdefault.jpg` : DEFAULT_TRACK_THUMBNAIL);
          const displayNumber = track.track_number ?? idx + 1;

          return (
            <div
              key={`${trackId}-${idx}`}
              onClick={() => {
                if (!isResolving) onPlayTrack(track);
              }}
              className={`group grid ${
                isMobile
                  ? 'grid-cols-[28px_minmax(0,1fr)_auto] gap-2.5 px-2.5'
                  : 'grid-cols-[28px_minmax(0,1fr)_auto] sm:grid-cols-[36px_minmax(0,1fr)_90px_100px] md:grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_90px_100px] gap-2.5 sm:gap-4 px-2.5 sm:px-4'
              } py-2.5 rounded-lg items-center text-xs transition-colors cursor-pointer ${
                isCurrent
                  ? 'bg-white/[0.08] text-[#1DB954]'
                  : 'hover:bg-[#1a1a20] text-white'
              }`}
            >
              {/* # or Play button */}
              <div className="text-center flex items-center justify-center">
                {isResolving ? (
                  <button
                    disabled
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[#b3b3b3] opacity-80 cursor-wait"
                    title="Resolving audio stream..."
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1DB954]" />
                  </button>
                ) : (
                  <>
                    <span className={`tabular-nums font-mono ${isCurrent ? 'hidden' : 'group-hover:hidden'} text-[#b3b3b3]`}>
                      {displayNumber}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                        isCurrent ? 'text-[#1DB954]' : 'hidden group-hover:flex text-white'
                      }`}
                      title={isCurrent && isPlaying ? 'Pause' : 'Play'}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail, Title, Artist */}
              <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                <img
                  src={thumb}
                  alt={track.title}
                  className="w-10 h-10 rounded object-cover shrink-0 shadow-sm border border-[#1e1e24] bg-[#181818]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_TRACK_THUMBNAIL;
                  }}
                />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p
                    className={`font-semibold text-sm truncate cursor-pointer hover:underline ${
                      isCurrent ? 'text-[#1DB954]' : 'text-white'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isResolving) onPlayTrack(track);
                    }}
                  >
                    {track.title}
                  </p>
                  <p className="text-xs text-[#b3b3b3] truncate mt-0.5">
                    <span
                      className="text-[#b3b3b3] hover:text-white cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onArtistClick) onArtistClick(track.artist);
                      }}
                    >
                      {track.artist}
                    </span>
                  </p>
                </div>
              </div>

              {/* Album (hidden in mobile mode) */}
              {!isMobile && (
                <div className="hidden md:block min-w-0 truncate text-[#b3b3b3]">
                  <span className="text-[#b3b3b3] hover:text-white cursor-pointer">{track.album || 'Single'}</span>
                </div>
              )}

              {/* Fidelity / Opus 251 (hidden in mobile mode) */}
              {!isMobile && (
                <div className="text-center hidden sm:flex items-center justify-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-[#00e0a0] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20"
                    title="Native Opus 251 Stream"
                  >
                    <HardDrive className="w-2.5 h-2.5" />
                    Opus 251
                  </span>
                </div>
              )}

              {/* Duration & Actions */}
              <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike(trackId, track);
                  }}
                  className={`p-1 rounded hover:bg-white/10 transition-colors ${
                    isLiked
                      ? 'text-[#1DB954]'
                      : isMobile
                      ? 'opacity-80 text-[#b3b3b3] hover:text-white'
                      : 'opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-[#b3b3b3] hover:text-white'
                  }`}
                  title={isLiked ? 'Unlike' : 'Save to Library'}
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
                </button>

                {!isMobile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToQueue(track);
                    }}
                    className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 p-1 text-[#b3b3b3] hover:text-white hover:bg-white/10 rounded transition-all"
                    title="Add to Queue"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}

                <span className="font-mono text-xs text-[#b3b3b3] tabular-nums w-9 sm:w-10 text-right">
                  {formatDuration(track.duration)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
