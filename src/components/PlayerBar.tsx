import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Activity,
  Mic2,
  ListMusic,
  Sliders,
  Radio,
  Check,
  Youtube,
  AlertTriangle,
} from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface PlayerBarProps {
  onToggleVisualizer: () => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onToggleEqualizer: () => void;
  onToggleVideo?: () => void;
  isVisualizerOpen: boolean;
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
  isEqualizerOpen: boolean;
  isVideoOpen?: boolean;
  onArtistClick?: (artist: string) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  onToggleVisualizer,
  onToggleLyrics,
  onToggleQueue,
  onToggleEqualizer,
  onToggleVideo,
  isVisualizerOpen,
  isLyricsOpen,
  isQueueOpen,
  isEqualizerOpen,
  isVideoOpen = false,
  onArtistClick,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    likedIds,
    repeatMode,
    isShuffle,
    isFallbackStream,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    toggleLike,
    toggleShuffle,
    cycleRepeat,
    isMiniPlayerOpen,
    toggleMiniPlayer,
  } = useMusicPlayer();

  if (!currentTrack) {
    return (
      <footer className="h-24 bg-[#0a0a0c]/95 backdrop-blur-md border-t border-[#1e1e24] px-6 flex items-center justify-between shrink-0 select-none z-30">
        <div className="flex items-center gap-3 text-[#8a8a92] text-xs">
          <div className="w-12 h-12 rounded-lg bg-[#121216] border border-[#1e1e24] flex items-center justify-center">
            <Radio className="w-5 h-5 text-[#8a8a92]" />
          </div>
          <div>
            <p className="font-medium text-white">b33t Engine Ready</p>
            <p className="text-[11px] text-[#8a8a92]">Select any track or search to stream with uncompressed Opus 251</p>
          </div>
        </div>
      </footer>
    );
  }

  const effectiveDuration = duration > 0 ? duration : currentTrack.duration || 180;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));
  const trackId = currentTrack.video_id || currentTrack.id || '';
  const isLiked = likedIds.includes(trackId);

  return (
    <footer className="h-24 bg-[#0a0a0c]/95 backdrop-blur-md border-t border-[#1e1e24] px-4 md:px-6 flex items-center justify-between shrink-0 select-none z-30 shadow-2xl">
      {/* Left: Track Information */}
      <div className="flex items-center gap-3 w-1/3 min-w-[240px]">
        {/* Thumbnail Artwork */}
        <div
          onClick={() => toggleMiniPlayer()}
          className="w-14 h-14 rounded-lg bg-[#1a1a20] border border-[#1e1e24] flex items-center justify-center shrink-0 relative overflow-hidden group shadow-md cursor-pointer hover:border-[#1DB954]/50 transition-colors"
          title="Click to toggle mini video stage"
        >
          {currentTrack.thumbnail ? (
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%231a1a20"/><text x="50%" y="54%" font-family="sans-serif" font-weight="bold" font-size="24" fill="%231DB954" text-anchor="middle" dominant-baseline="middle">♪</text></svg>`;
              }}
            />
          ) : (
            <Radio className="w-6 h-6 text-white/50" />
          )}

          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1">
              <span className="w-1 h-3.5 bg-[#1DB954] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-5 bg-[#1DB954] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-2.5 bg-[#1DB954] rounded-full animate-bounce" />
            </div>
          )}
        </div>

        {/* Title, Artist, and High-Fi Opus / Honest Fallback Badge */}
        <div className="flex flex-col min-w-0 pr-1 max-w-[220px]">
          <span
            className="font-bold text-sm text-white truncate hover:underline cursor-pointer"
            title={currentTrack.title}
          >
            {currentTrack.title}
          </span>
          <button
            onClick={() => onArtistClick && onArtistClick(currentTrack.artist)}
            className="text-left text-xs text-[#8a8a92] hover:text-white truncate transition-colors"
          >
            {currentTrack.artist}
          </button>
          <div className="flex items-center gap-1.5 mt-1">
            {isFallbackStream ? (
              <button
                onClick={onToggleVideo}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 flex items-center gap-1.5 transition-colors shrink-0"
                title="YouTube bot-check active on server IP. Click to watch unblocked official video & audio."
              >
                <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span>Demo Fallback</span>
                {onToggleVideo && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-red-600/30 text-red-300">
                    Watch
                  </span>
                )}
              </button>
            ) : (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-[#1DB954] border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <Check className="w-2.5 h-2.5" />
                Opus 251
              </span>
            )}
          </div>
        </div>

        {/* Favorite / Like Button */}
        <button
          onClick={() => toggleLike(trackId)}
          className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ml-1 ${
            isLiked ? 'text-[#1DB954]' : 'text-[#8a8a92] hover:text-white'
          }`}
          title={isLiked ? 'Liked' : 'Save to Library'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
        </button>
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-2xl px-4">
        {/* Buttons Row */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={`p-1.5 rounded-full transition-colors ${
              isShuffle ? 'text-[#1DB954]' : 'text-[#8a8a92] hover:text-white'
            }`}
            title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={prevTrack}
            className="p-1.5 text-zinc-300 hover:text-white transition-colors"
            title="Previous Track (Shift + ←)"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-white/10"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-1.5 text-zinc-300 hover:text-white transition-colors"
            title="Next Track (Shift + →)"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-1.5 rounded-full transition-colors ${
              repeatMode !== 'off' ? 'text-[#1DB954]' : 'text-[#8a8a92] hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Real Progress Bar */}
        <div className="w-full flex items-center gap-3 text-xs text-[#8a8a92]">
          <span className="font-mono text-[11px] tabular-nums w-10 text-right">
            {formatTime(currentTime)}
          </span>

          <div className="relative flex-1 group flex items-center h-4">
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden relative group-hover:h-1.5 transition-all">
              <div
                className="absolute left-0 top-0 bottom-0 bg-white group-hover:bg-[#1DB954] rounded-full transition-colors"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={effectiveDuration}
              step={0.5}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>

          <span className="font-mono text-[11px] tabular-nums w-10 text-left">
            {formatTime(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* Right Tools: Video, Visualizer, Lyrics, EQ, Queue, Volume */}
      <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[200px]">
        <button
          onClick={() => toggleMiniPlayer()}
          className={`p-2 rounded-lg transition-colors ${
            isMiniPlayerOpen ? 'bg-red-500/20 text-red-500' : 'text-[#8a8a92] hover:text-white'
          }`}
          title={isMiniPlayerOpen ? 'Minimize Video Stage' : 'Expand Video Stage'}
        >
          <Youtube className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleVisualizer}
          className={`p-2 rounded-lg transition-colors ${
            isVisualizerOpen ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-[#8a8a92] hover:text-white'
          }`}
          title="Live Audio Visualizer"
        >
          <Activity className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleLyrics}
          className={`p-2 rounded-lg transition-colors ${
            isLyricsOpen ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-[#8a8a92] hover:text-white'
          }`}
          title="Synchronized Lyrics"
        >
          <Mic2 className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleEqualizer}
          className={`p-2 rounded-lg transition-colors ${
            isEqualizerOpen ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-[#8a8a92] hover:text-white'
          }`}
          title="5-Band Equalizer"
        >
          <Sliders className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleQueue}
          className={`p-2 rounded-lg transition-colors ${
            isQueueOpen ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-[#8a8a92] hover:text-white'
          }`}
          title="Up Next Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Volume Slider with Mute */}
        <div className="flex items-center gap-2 group ml-1">
          <button
            onClick={toggleMute}
            className="text-[#8a8a92] hover:text-white transition-colors"
            title="Mute / Unmute (M)"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="w-20 h-1 bg-zinc-800 rounded-full relative group-hover:h-1.5 transition-all">
            <div
              className="h-full bg-white group-hover:bg-[#1DB954] rounded-full"
              style={{ width: `${isMuted ? 0 : volume * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
