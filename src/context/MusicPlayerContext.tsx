import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { youTubeEngine } from '../audio/YouTubeEngine';
import { Track, CacheStatus, EqBandSettings } from '../types/music';

export const EQ_PRESETS: { name: string; settings: EqBandSettings }[] = [
  { name: 'Flat', settings: { band60: 0, band250: 0, band1000: 0, band4000: 0, band12000: 0 } },
  { name: 'Bass Boost', settings: { band60: 6.0, band250: 4.0, band1000: 0, band4000: 1.5, band12000: 2.0 } },
  { name: 'Afrobeats Warmth', settings: { band60: 5.5, band250: 3.5, band1000: 1.0, band4000: 2.5, band12000: 3.0 } },
  { name: 'Vocal Clarity', settings: { band60: -2.0, band250: 0.5, band1000: 3.5, band4000: 4.5, band12000: 3.0 } },
  { name: 'Acoustic Soul', settings: { band60: 2.0, band250: 3.0, band1000: 2.0, band4000: 3.5, band12000: 4.0 } },
  { name: 'Electronic / Club', settings: { band60: 7.0, band250: 2.5, band1000: -1.0, band4000: 4.0, band12000: 5.5 } },
];

interface MusicPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Track[];
  likedIds: string[];
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  cacheStatus: CacheStatus | null;
  eqSettings: EqBandSettings;
  activeEqPreset: string;
  isFallbackStream: boolean;
  isMiniPlayerOpen: boolean;
  toggleMiniPlayer: () => void;
  playTrack: (track: Track) => void;
  playAll: (tracks: Track[]) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleLike: (videoId: string) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setEqBand: (band: keyof EqBandSettings, value: number) => void;
  applyEqPreset: (presetName: string) => void;
  refreshCache: () => Promise<void>;
  clearCache: () => Promise<void>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export const MusicPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isFallbackStream, setIsFallbackStream] = useState<boolean>(false);

  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('b33t_volume');
    return saved ? parseFloat(saved) : 0.85;
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('b33t_liked');
    return saved ? JSON.parse(saved) : ['Or2sMfOcTtw', 'mFBJtuQdcU4', '421w1j87f28'];
  });

  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);

  const [eqSettings, setEqSettings] = useState<EqBandSettings>(() => {
    const saved = localStorage.getItem('b33t_eq');
    return saved ? JSON.parse(saved) : EQ_PRESETS[2].settings; // Afrobeats Warmth default
  });
  const [activeEqPreset, setActiveEqPreset] = useState<string>('Afrobeats Warmth');

  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState<boolean>(false);
  const toggleMiniPlayer = useCallback(() => {
    setIsMiniPlayerOpen((prev) => !prev);
  }, []);

  // Sync volume to AudioEngine, YouTubeEngine & localStorage
  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    audioEngine.setVolume(clamped);
    youTubeEngine.setVolume(clamped);
    localStorage.setItem('b33t_volume', clamped.toString());
    if (isMuted && clamped > 0) {
      setIsMuted(false);
      audioEngine.setMuted(false);
      youTubeEngine.setMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioEngine.setMuted(next);
      youTubeEngine.setMuted(next);
      return next;
    });
  }, []);

  // Sync likes to localStorage
  useEffect(() => {
    localStorage.setItem('b33t_liked', JSON.stringify(likedIds));
  }, [likedIds]);

  // Sync EQ
  useEffect(() => {
    localStorage.setItem('b33t_eq', JSON.stringify(eqSettings));
    audioEngine.setEq(eqSettings);
  }, [eqSettings]);

  // Fetch cache status
  const refreshCache = useCallback(async () => {
    try {
      const res = await fetch('/api/cache');
      if (res.ok) {
        const data = await res.json();
        setCacheStatus(data);
      }
    } catch (err) {
      console.warn('[Cache] refresh failed:', err);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      const res = await fetch('/api/cache', { method: 'DELETE' });
      if (res.ok) {
        await refreshCache();
      }
    } catch (err) {
      console.warn('[Cache] clear failed:', err);
    }
  }, [refreshCache]);

  useEffect(() => {
    refreshCache();
  }, [refreshCache]);

  // Next / Prev track handling
  const nextTrack = useCallback(() => {
    if (repeatMode === 'one' && currentTrack) {
      seek(0);
      togglePlay();
      return;
    }

    if (queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      playTrack(next);
      return;
    }

    if (repeatMode === 'all' && currentTrack) {
      seek(0);
      togglePlay();
    } else {
      setIsPlaying(false);
      audioEngine.setExternalPlaying(false);
    }
  }, [queue, repeatMode, currentTrack]);

  const prevTrack = useCallback(() => {
    if (currentTime > 4) {
      seek(0);
      return;
    }
    seek(0);
  }, [currentTime]);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioEngine.audio;

    const onTimeUpdate = () => {
      if (!currentTrack?.video_id || currentTrack.streamUrl?.startsWith('blob:')) {
        setCurrentTime(audio.currentTime);
      }
    };

    const unsubscribeAudioEngineTime = audioEngine.onTimeUpdate((time) => {
      if (!currentTrack?.video_id || currentTrack.streamUrl?.startsWith('blob:')) {
        setCurrentTime(time);
      }
    });

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        if (!currentTrack?.video_id || currentTrack.streamUrl?.startsWith('blob:')) {
          setDuration(audio.duration);
        }
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      nextTrack();
      refreshCache();
    };

    const onError = (e: Event) => {
      console.warn('[Audio] playback error event:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      unsubscribeAudioEngineTime();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [nextTrack, refreshCache, currentTrack]);

  // YouTube Engine listeners for full song streaming
  useEffect(() => {
    const unsubState = youTubeEngine.onStateChange((state) => {
      if (state === 'playing') {
        setIsPlaying(true);
        audioEngine.setExternalPlaying(true);
      } else if (state === 'paused') {
        setIsPlaying(false);
        audioEngine.setExternalPlaying(false);
      } else if (state === 'ended') {
        nextTrack();
      }
    });

    const unsubTime = youTubeEngine.onTimeUpdate((curr, dur) => {
      setCurrentTime(curr);
      if (dur > 0 && isFinite(dur)) {
        setDuration(dur);
      }
    });

    return () => {
      unsubState();
      unsubTime();
    };
  }, [nextTrack]);

  const playTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    const initialDur = track.duration && track.duration > 35 ? track.duration : 180;
    setDuration(initialDur);
    setCurrentTime(0);

    const trackId = track.video_id || track.id || '';
    const isValidYt = typeof trackId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(trackId);

    if (isValidYt && !track.streamUrl?.startsWith('blob:')) {
      setIsFallbackStream(false);
      audioEngine.pause();
      audioEngine.setExternalPlaying(true);
      youTubeEngine.loadVideo(trackId);
      youTubeEngine.setVolume(volume);
      youTubeEngine.setMuted(isMuted);
      setIsPlaying(true);
    } else if (track.streamUrl?.startsWith('blob:')) {
      youTubeEngine.pause();
      audioEngine.setExternalPlaying(false);
      audioEngine.setSrc(track.streamUrl);
      audioEngine.setVolume(volume);
      audioEngine.setMuted(isMuted);
      audioEngine.play().catch(console.warn);
    } else {
      // Dynamic resolution for album tracks or search items without pre-resolved YouTube IDs
      setIsFallbackStream(false);
      fetch(`/api/resolve_track?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.video_id) {
            audioEngine.pause();
            audioEngine.setExternalPlaying(true);
            youTubeEngine.loadVideo(data.video_id);
            youTubeEngine.setVolume(volume);
            youTubeEngine.setMuted(isMuted);
            setIsPlaying(true);
            setCurrentTrack((prev) => (prev ? { ...prev, video_id: data.video_id } : prev));
          } else {
            youTubeEngine.pause();
            audioEngine.setExternalPlaying(false);
            const streamUrl = `/api/stream/${encodeURIComponent(trackId || 'audio')}?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`;
            audioEngine.setSrc(streamUrl);
            audioEngine.play().catch(console.warn);
          }
        })
        .catch(() => {
          youTubeEngine.pause();
          audioEngine.setExternalPlaying(false);
          const streamUrl = `/api/stream/${encodeURIComponent(trackId || 'audio')}?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`;
          audioEngine.setSrc(streamUrl);
          audioEngine.play().catch(console.warn);
        });
    }

    setTimeout(() => refreshCache(), 2500);
  }, [queue, volume, isMuted, refreshCache]);

  const playAll = useCallback((tracks: Track[]) => {
    if (tracks.length === 0) return;
    playTrack(tracks[0]);
    if (tracks.length > 1) {
      setQueue(tracks.slice(1));
    }
  }, [playTrack]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    const isYouTube = Boolean(currentTrack.video_id && !currentTrack.streamUrl?.startsWith('blob:'));
    if (isYouTube) {
      if (isPlaying) {
        youTubeEngine.pause();
        setIsPlaying(false);
        audioEngine.setExternalPlaying(false);
      } else {
        youTubeEngine.play();
        setIsPlaying(true);
        audioEngine.setExternalPlaying(true);
      }
    } else {
      if (isPlaying) {
        audioEngine.pause();
      } else {
        audioEngine.play().catch(console.warn);
      }
    }
  }, [currentTrack, isPlaying]);

  const seek = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    const isYouTube = Boolean(currentTrack?.video_id && !currentTrack?.streamUrl?.startsWith('blob:'));
    if (isYouTube) {
      youTubeEngine.seek(seconds);
    } else {
      audioEngine.seek(seconds);
    }
  }, [currentTrack]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const toggleLike = useCallback((videoId: string) => {
    setLikedIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
    );
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const setEqBand = useCallback((band: keyof EqBandSettings, value: number) => {
    setEqSettings((prev) => {
      const updated = { ...prev, [band]: value };
      setActiveEqPreset('Custom');
      return updated;
    });
  }, []);

  const applyEqPreset = useCallback((presetName: string) => {
    const found = EQ_PRESETS.find((p) => p.name === presetName);
    if (found) {
      setEqSettings(found.settings);
      setActiveEqPreset(presetName);
    }
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        queue,
        likedIds,
        repeatMode,
        isShuffle,
        cacheStatus,
        eqSettings,
        activeEqPreset,
        isFallbackStream,
        isMiniPlayerOpen,
        toggleMiniPlayer,
        playTrack,
        playAll,
        togglePlay,
        seek,
        setVolume,
        toggleMute,
        nextTrack,
        prevTrack,
        addToQueue,
        removeFromQueue,
        clearQueue,
        toggleLike,
        toggleShuffle,
        cycleRepeat,
        setEqBand,
        applyEqPreset,
        refreshCache,
        clearCache,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};
