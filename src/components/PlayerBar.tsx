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
  Youtube,
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
  isVisualizerOpen,
  isLyricsOpen,
  isQueueOpen,
  isEqualizerOpen,
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
      <footer className="h-[72px] bg-black px-4 flex items-center justify-between shrink-0 select-none z-30">
        <div className="flex items-center gap-3 text-[#b3b3b3] text-xs w-1/3">
          <div className="w-14 h-14 rounded bg-[#181818] flex items-center justify-center">
            <Radio className="w-5 h-5 text-[#b3b3b3]" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Not Playing</p>
            <p className="text-xs text-[#b3b3b3]">Select a song to start listening</p>
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
    <footer className="h-[72px] bg-black px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Track Information */}
      <div className="flex items-center gap-3.5 w-[30%] min-w-[180px]">
        {/* Thumbnail Artwork */}
        <div
          onClick={() => toggleMiniPlayer()}
          className="w-14 h-14 rounded bg-[#181818] flex items-center justify-center shrink-0 relative overflow-hidden group shadow-md cursor-pointer"
          title="Toggle video stage"
        >
          {currentTrack.thumbnail ? (
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23181818"/><text x="50%" y="54%" font-family="sans-serif" font-weight="bold" font-size="24" fill="%231ed760" text-anchor="middle" dominant-baseline="middle">♪</text></svg>`;
              }}
            />
          ) : (
            <Radio className="w-6 h-6 text-white/50" />
          )}
        </div>

        {/* Title & Artist */}
        <div className="flex flex-col min-w-0 pr-1 max-w-[220px]">
          <span
            className="font-semibold text-sm text-white truncate hover:underline cursor-pointer"
            title={currentTrack.title}
          >
            {currentTrack.title}
          </span>
          <button
            onClick={() => onArtistClick && onArtistClick(currentTrack.artist)}
            className="text-left text-xs text-[#b3b3b3] hover:text-white hover:underline truncate transition-colors"
          >
            {currentTrack.artist}
          </button>
        </div>

        {/* Favorite / Like Button */}
        <button
          onClick={() => toggleLike(trackId, currentTrack)}
          className={`p-1.5 rounded-full transition-colors ml-1 ${
            isLiked ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
          }`}
          title={isLiked ? 'Remove from Liked Songs' : 'Save to Your Library'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1ed760]' : ''}`} />
        </button>
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex flex-col items-center gap-1.5 w-[40%] max-w-[722px]">
        {/* Buttons Row */}
        <div className="flex items-center gap-5">
          <button
            onClick={toggleShuffle}
            className={`p-1 transition-colors relative ${
              isShuffle ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
          >
            <Shuffle className="w-4 h-4" />
            {isShuffle && (
              <span className="w-1 h-1 rounded-full bg-[#1ed760] absolute -bottom-0.5 left-1/2 -translate-x-1/2" />
            )}
          </button>

          <button
            onClick={prevTrack}
            className="p-1 text-[#b3b3b3] hover:text-white transition-colors"
            title="Previous (Shift + ←)"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-1 text-[#b3b3b3] hover:text-white transition-colors"
            title="Next (Shift + →)"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-1 transition-colors relative ${
              repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            {repeatMode !== 'off' && (
              <span className="w-1 h-1 rounded-full bg-[#1ed760] absolute -bottom-0.5 left-1/2 -translate-x-1/2" />
            )}
          </button>
        </div>

        {/* Scrubber Bar */}
        <div className="w-full flex items-center gap-2 text-xs text-[#b3b3b3]">
          <span className="text-[11px] tabular-nums min-w-[35px] text-right">
            {formatTime(currentTime)}
          </span>

          <div className="relative flex-1 group flex items-center h-3">
            <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden relative">
              <div
                className="absolute left-0 top-0 bottom-0 bg-white group-hover:bg-[#1ed760] rounded-full"
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

          <span className="text-[11px] tabular-nums min-w-[35px] text-left">
            {formatTime(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* Right Tools: Now Playing View, Lyrics, Queue, Visualizer, EQ, Volume */}
      <div className="flex items-center justify-end gap-2 w-[30%] min-w-[180px]">
        <button
          onClick={() => toggleMiniPlayer()}
          className={`p-1.5 rounded transition-colors ${
            isMiniPlayerOpen ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
          }`}
          title="Now playing video view"
        >
          <Youtube className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleLyrics}
          className={`p-1.5 rounded transition-colors ${
            isLyricsOpen ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
          }`}
          title="Lyrics"
        >
          <Mic2 className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleQueue}
          className={`p-1.5 rounded transition-colors ${
            isQueueOpen ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
          }`}
          title="Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleVisualizer}
          className={`p-1.5 rounded transition-colors ${
            isVisualizerOpen ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
          }`}
          title="Audio Visualizer"
        >
          <Activity className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleEqualizer}
          className={`p-1.5 rounded transition-colors ${
            isEqualizerOpen ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
          }`}
          title="Equalizer"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Volume Slider with Mute */}
        <div className="flex items-center gap-2 group ml-1">
          <button
            onClick={toggleMute}
            className="text-[#b3b3b3] hover:text-white transition-colors"
            title="Mute (M)"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="w-24 h-1 bg-[#4d4d4d] rounded-full relative">
            <div
              className="h-full bg-white group-hover:bg-[#1ed760] rounded-full"
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
