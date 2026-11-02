import React from 'react';
import { Play, Music, ArrowLeft } from 'lucide-react';
import { Playlist, Track } from '../types/music';
import { TrackTable } from './TrackTable';

interface PlaylistViewProps {
  playlist: Playlist;
  allTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedTrackIds: string[];
  onPlayTrack: (track: Track) => void;
  onPlayAll: (tracks: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  onAddToQueue: (track: Track) => void;
  onBack: () => void;
  onArtistClick?: (artist: string) => void;
}

function formatTotalTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  return `${mins} min`;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlist,
  allTracks,
  currentTrack,
  isPlaying,
  likedTrackIds,
  onPlayTrack,
  onPlayAll,
  onToggleLike,
  onAddToQueue,
  onBack,
  onArtistClick,
}) => {
  // Resolve tracks for this playlist
  const playlistTracks = allTracks.filter((t) => playlist.tracks.includes(t.video_id || t.id || ''));
  const totalSeconds = playlistTracks.reduce((acc, t) => acc + t.duration, 0);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Playlist Hero Header */}
      <div
        className={`relative rounded-2xl overflow-hidden p-6 md:p-10 bg-gradient-to-r ${playlist.coverGradient} border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-end gap-6`}
      >
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-black/40 border border-white/20 flex items-center justify-center shrink-0 shadow-2xl">
          <Music className="w-16 h-16 text-white/80" />
        </div>

        <div className="flex-1 space-y-2">
          <span className="text-xs uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-black/40 text-emerald-300 border border-emerald-500/30">
            {playlist.isCurated ? 'b33t Curated Playlist' : 'Freedom Playlist'}
          </span>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            {playlist.name}
          </h1>

          <p className="text-xs md:text-sm text-zinc-200/90 max-w-2xl leading-relaxed">
            {playlist.description}
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs text-white/90 font-mono">
            <span>{playlistTracks.length} tracks</span>
            <span>·</span>
            <span>{formatTotalTime(totalSeconds)}</span>
            <span>·</span>
            <span className="text-emerald-300">Native Opus 251</span>
          </div>
        </div>

        {playlistTracks.length > 0 && (
          <button
            onClick={() => onPlayAll(playlistTracks)}
            className="w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-black/40 shrink-0"
            title="Play All"
          >
            <Play className="w-6 h-6 fill-black ml-1" />
          </button>
        )}
      </div>

      {/* Tracks List */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight">Tracklist</h2>
        <div className="bg-[#08090d] border border-white/5 rounded-xl p-2 shadow-inner">
          <TrackTable
            tracks={playlistTracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedTrackIds={likedTrackIds}
            onPlayTrack={onPlayTrack}
            onToggleLike={onToggleLike}
            onAddToQueue={onAddToQueue}
            onArtistClick={onArtistClick}
          />
        </div>
      </section>
    </div>
  );
};
