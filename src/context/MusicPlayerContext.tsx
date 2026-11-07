import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { Media } from '@capacitor-community/media';
import { StatusBar, Style } from '@capacitor/status-bar';
import { audioEngine } from '../audio/AudioEngine';
import { youTubeEngine } from '../audio/YouTubeEngine';
import { nativeAudioEngine } from '../audio/NativeAudioEngine';
import { Track, CacheStatus, EqBandSettings } from '../types/music';
import { apiUrl, getApiHost, setApiHost } from '../utils/apiBase';

export { apiUrl, getApiHost, setApiHost };

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
  catalogTracks: Track[];
  likedIds: string[];
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  cacheStatus: CacheStatus | null;
  eqSettings: EqBandSettings;
  activeEqPreset: string;
  isFallbackStream: boolean;
  isMiniPlayerOpen: boolean;
  toggleMiniPlayer: () => void;
  playTrack: (track: Track, forceRestart?: boolean) => void;
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
  toggleLike: (videoId: string, trackObj?: Track) => void;
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
  const [usingAudioElementForCurrent, setUsingAudioElementForCurrent] = useState<boolean>(false);
  const [usingNativeAudioForCurrent, setUsingNativeAudioForCurrent] = useState<boolean>(() =>
    Capacitor.isNativePlatform()
  );

  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('b33t_volume');
    return saved ? parseFloat(saved) : 0.85;
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [trackHistory, setTrackHistory] = useState<Track[]>([]);
  const [catalogTracks, setCatalogTracks] = useState<Track[]>([]);

  const [likedIds, setLikedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('b33t_liked');
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        return parsed.map((id) =>
          id === 'mFBJtuQdcU4' ? 'mFBJtuQ1Llc' : id === '421w1j87f28' ? '421w1j87fEM' : id
        );
      } catch {}
    }
    return ['Or2sMfOcTtw', 'mFBJtuQ1Llc', '421w1j87fEM'];
  });

  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);

  const [eqSettings, setEqSettings] = useState<EqBandSettings>(() => {
    const saved = localStorage.getItem('b33t_eq');
    return saved ? JSON.parse(saved) : EQ_PRESETS[2].settings;
  });
  const [activeEqPreset, setActiveEqPreset] = useState<string>('Afrobeats Warmth');

  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState<boolean>(false);
  const toggleMiniPlayer = useCallback(() => {
    setIsMiniPlayerOpen((prev) => !prev);
  }, []);

  // Load initial trending catalog tracks so library, liked songs, and auto-advance always have tracks
  useEffect(() => {
    fetch(apiUrl('/api/trending'))
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Track[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setCatalogTracks((prev) => {
            const existingIds = new Set(prev.map((t) => t.video_id || t.id));
            const merged = [...prev];
            for (const item of data) {
              const id = item.video_id || item.id;
              if (id && !existingIds.has(id)) {
                existingIds.add(id);
                merged.push(item);
              }
            }
            return merged;
          });
        }
      })
      .catch(console.warn);
  }, []);

  const registerTrackInCatalog = useCallback((track: Track) => {
    const id = track.video_id || track.id;
    if (!id) return;
    setCatalogTracks((prev) => {
      if (prev.some((t) => (t.video_id || t.id) === id)) return prev;
      return [track, ...prev];
    });
  }, []);

  // Sync volume to AudioEngine, YouTubeEngine, NativeAudioEngine & localStorage
  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    audioEngine.setVolume(clamped);
    youTubeEngine.setVolume(clamped);
    nativeAudioEngine.setVolume(clamped);
    localStorage.setItem('b33t_volume', clamped.toString());
    if (isMuted && clamped > 0) {
      setIsMuted(false);
      audioEngine.setMuted(false);
      youTubeEngine.setMuted(false);
      nativeAudioEngine.setMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioEngine.setMuted(next);
      youTubeEngine.setMuted(next);
      nativeAudioEngine.setMuted(next);
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
      const res = await fetch(apiUrl('/api/cache'));
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
      const res = await fetch(apiUrl('/api/cache'), { method: 'DELETE' });
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

  const buildDirectStreamUrl = useCallback(
    (track: Track): string => {
      const trackId = track.video_id || track.id || 'audio';
      const upcomingIds = (queue.length > 0 ? queue : catalogTracks)
        .map((t) => t.video_id || t.id)
        .filter((id): id is string =>
          Boolean(id && id !== trackId && /^[a-zA-Z0-9_-]{11}$/.test(id))
        )
        .slice(0, 3)
        .join(',');

      const prewarmParam = upcomingIds ? `&prewarm=${encodeURIComponent(upcomingIds)}` : '';
      const streamPath = `/api/stream/${encodeURIComponent(trackId)}?title=${encodeURIComponent(
        track.title
      )}&artist=${encodeURIComponent(track.artist)}${prewarmParam}`;

      return track.streamUrl?.startsWith('blob:') || track.streamUrl?.startsWith('http')
        ? track.streamUrl
        : apiUrl(streamPath);
    },
    [queue, catalogTracks]
  );

  const fallbackToServerAudioStream = useCallback((track: Track) => {
    youTubeEngine.pause();
    audioEngine.setExternalPlaying(false);
    setUsingNativeAudioForCurrent(false);
    setUsingAudioElementForCurrent(true);

    const streamUrl = buildDirectStreamUrl(track);

    if (!track.streamUrl?.startsWith('blob:')) {
      // Cheap HEAD check: cached returns 'real', cold returns 'unknown' (no Piped quota burn)
      fetch(streamUrl, { method: 'HEAD' })
        .then((res) => {
          const streamType = res.headers.get('X-Stream-Type');
          if (streamType === 'fallback') {
            setIsFallbackStream(true);
          } else {
            // 'real' or 'unknown' -> proceed with GET and trust GET
            setIsFallbackStream(false);
          }
          refreshCache();
        })
        .catch(() => {});
    }

    audioEngine.setSrc(streamUrl);
    audioEngine.setVolume(volume);
    audioEngine.setMuted(isMuted);
    audioEngine.play().catch(console.warn);
  }, [volume, isMuted, buildDirectStreamUrl, refreshCache]);

  const playViaNativeAudioEngine = useCallback(
    (track: Track) => {
      youTubeEngine.pause();
      audioEngine.pause();
      audioEngine.setExternalPlaying(true);
      setIsFallbackStream(false);
      setUsingAudioElementForCurrent(false);
      setUsingNativeAudioForCurrent(true);

      const streamUrl = buildDirectStreamUrl(track);

      // Cheap HEAD check to update cache badge without blocking native ExoPlayer stream
      fetch(streamUrl, { method: 'HEAD' })
        .then((res) => {
          const streamType = res.headers.get('X-Stream-Type');
          setIsFallbackStream(streamType === 'fallback');
          refreshCache();
        })
        .catch(() => {});

      nativeAudioEngine.setVolume(volume);
      nativeAudioEngine.setMuted(isMuted);
      void nativeAudioEngine.loadAndPlay(track, streamUrl);
    },
    [volume, isMuted, buildDirectStreamUrl, refreshCache]
  );

  const isMobileDevice = () =>
    Capacitor.isNativePlatform() ||
    (typeof window !== 'undefined' &&
      (window.innerWidth < 768 ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
        window.location.search.includes('mode=android')));

  const togglePlay = useCallback(() => {
    if (!currentTrack) {
      if (catalogTracks.length > 0) {
        const first = catalogTracks[0];
        const incomingId = first.video_id || first.id || '';
        setCurrentTrack(first);
        setDuration(first.duration && first.duration > 35 ? first.duration : 180);
        setCurrentTime(0);
        const isValidYt = typeof incomingId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(incomingId);
        if (Capacitor.isNativePlatform() && !first.streamUrl?.startsWith('blob:')) {
          playViaNativeAudioEngine(first);
        } else if (!isMobileDevice() && isValidYt && !first.streamUrl?.startsWith('blob:') && !first.streamUrl?.startsWith('http')) {
          setIsFallbackStream(false);
          setUsingNativeAudioForCurrent(false);
          setUsingAudioElementForCurrent(false);
          audioEngine.pause();
          audioEngine.setExternalPlaying(true);
          youTubeEngine.loadVideo(incomingId);
          youTubeEngine.setVolume(volume);
          youTubeEngine.setMuted(isMuted);
          setIsPlaying(true);
          fetch(apiUrl(`/api/stream/${encodeURIComponent(incomingId)}?title=${encodeURIComponent(first.title)}&artist=${encodeURIComponent(first.artist)}`), { method: 'HEAD' })
            .then(() => refreshCache())
            .catch(() => {});
        } else {
          fallbackToServerAudioStream(first);
        }
      }
      return;
    }

    if (Capacitor.isNativePlatform() && usingNativeAudioForCurrent) {
      if (isPlaying) {
        nativeAudioEngine.pause();
        setIsPlaying(false);
        audioEngine.setExternalPlaying(false);
      } else {
        nativeAudioEngine.play();
        setIsPlaying(true);
        audioEngine.setExternalPlaying(true);
      }
      return;
    }

    const isYouTube = Boolean(
      currentTrack.video_id &&
      !currentTrack.streamUrl?.startsWith('blob:') &&
      !currentTrack.streamUrl?.startsWith('http') &&
      !usingAudioElementForCurrent &&
      !usingNativeAudioForCurrent
    );
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
  }, [currentTrack, isPlaying, usingAudioElementForCurrent, usingNativeAudioForCurrent, catalogTracks, volume, isMuted, playViaNativeAudioEngine, fallbackToServerAudioStream, refreshCache]);

  const seek = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    if (Capacitor.isNativePlatform() && usingNativeAudioForCurrent) {
      nativeAudioEngine.seek(seconds);
      return;
    }
    const isYouTube = Boolean(
      currentTrack?.video_id &&
      !currentTrack?.streamUrl?.startsWith('blob:') &&
      !currentTrack?.streamUrl?.startsWith('http') &&
      !usingAudioElementForCurrent &&
      !usingNativeAudioForCurrent
    );
    if (isYouTube) {
      youTubeEngine.seek(seconds);
    } else {
      audioEngine.seek(seconds);
    }
  }, [currentTrack, usingAudioElementForCurrent, usingNativeAudioForCurrent]);

  const playTrack = useCallback((track: Track, forceRestart = false) => {
    const incomingId = track.video_id || track.id || '';
    const currentId = currentTrack?.video_id || currentTrack?.id || '';

    // If clicking the already-active track without forceRestart, toggle play/pause
    if (!forceRestart && currentTrack && incomingId && incomingId === currentId) {
      togglePlay();
      return;
    }

    if (currentTrack && currentId !== incomingId) {
      setTrackHistory((prev) => [currentTrack, ...prev.slice(0, 29)]);
    }

    registerTrackInCatalog(track);
    setCurrentTrack(track);
    const initialDur = track.duration && track.duration > 35 ? track.duration : 180;
    setDuration(initialDur);
    setCurrentTime(0);

    const isValidYt = typeof incomingId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(incomingId);

    // 1. Local imported blob files always use HTML5 AudioEngine
    if (track.streamUrl?.startsWith('blob:')) {
      setIsFallbackStream(false);
      setUsingNativeAudioForCurrent(false);
      setUsingAudioElementForCurrent(true);
      youTubeEngine.pause();
      nativeAudioEngine.pause();
      audioEngine.setExternalPlaying(false);
      audioEngine.setSrc(track.streamUrl);
      audioEngine.setVolume(volume);
      audioEngine.setMuted(isMuted);
      audioEngine.play().catch(console.warn);
    }
    // 2. Capacitor Native Android/iOS: Stream direct URL via native ExoPlayer + MediaSessionService
    //    so audio never stops when the phone screen locks or app backgrounds
    else if (Capacitor.isNativePlatform()) {
      playViaNativeAudioEngine(track);
    }
    // 3. Explicit HTTP stream URL on web
    else if (track.streamUrl?.startsWith('http')) {
      setIsFallbackStream(false);
      setUsingNativeAudioForCurrent(false);
      setUsingAudioElementForCurrent(true);
      youTubeEngine.pause();
      audioEngine.setExternalPlaying(false);
      audioEngine.setSrc(track.streamUrl);
      audioEngine.setVolume(volume);
      audioEngine.setMuted(isMuted);
      audioEngine.play().catch(console.warn);
    }
    // 4. Mobile Web Browser (?mode=android or small viewport): HTML5 Audio stream
    else if (isMobileDevice()) {
      setIsFallbackStream(false);
      fallbackToServerAudioStream(track);
    }
    // 5. Desktop Web: YouTube IFrame Engine with automatic server stream fallback
    else if (isValidYt) {
      setIsFallbackStream(false);
      setUsingNativeAudioForCurrent(false);
      setUsingAudioElementForCurrent(false);
      audioEngine.pause();
      audioEngine.setExternalPlaying(true);
      youTubeEngine.loadVideo(incomingId);
      youTubeEngine.setVolume(volume);
      youTubeEngine.setMuted(isMuted);
      setIsPlaying(true);
      fetch(apiUrl(`/api/stream/${encodeURIComponent(incomingId)}?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`), { method: 'HEAD' })
        .then(() => refreshCache())
        .catch(() => {});
    } else {
      // Dynamic resolution for album tracks or search items without pre-resolved YouTube IDs
      setIsFallbackStream(false);
      fallbackToServerAudioStream(track);
    }

    setTimeout(() => refreshCache(), 2500);
  }, [currentTrack, togglePlay, registerTrackInCatalog, volume, isMuted, playViaNativeAudioEngine, fallbackToServerAudioStream, refreshCache]);

  // Next / Prev track handling
  const nextTrack = useCallback(() => {
    if (repeatMode === 'one' && currentTrack) {
      seek(0);
      if (!isPlaying) togglePlay();
      return;
    }

    if (queue.length > 0) {
      const pickIndex = isShuffle ? Math.floor(Math.random() * queue.length) : 0;
      const next = queue[pickIndex];
      setQueue((prev) => prev.filter((_, i) => i !== pickIndex));
      playTrack(next, true);
      return;
    }

    if (catalogTracks.length > 0) {
      const currentId = currentTrack?.video_id || currentTrack?.id;
      const currentIdx = catalogTracks.findIndex((t) => (t.video_id || t.id) === currentId);
      if (isShuffle) {
        const candidates = catalogTracks.filter((t) => (t.video_id || t.id) !== currentId);
        const pool = candidates.length > 0 ? candidates : catalogTracks;
        const randomNext = pool[Math.floor(Math.random() * pool.length)];
        playTrack(randomNext, true);
        return;
      } else if (currentIdx !== -1 && currentIdx + 1 < catalogTracks.length) {
        playTrack(catalogTracks[currentIdx + 1], true);
        return;
      } else if (repeatMode === 'all' && catalogTracks.length > 0) {
        playTrack(catalogTracks[0], true);
        return;
      }
    }

    if (repeatMode === 'all' && currentTrack) {
      seek(0);
      if (!isPlaying) togglePlay();
    } else {
      setIsPlaying(false);
      audioEngine.setExternalPlaying(false);
    }
  }, [queue, repeatMode, isShuffle, currentTrack, catalogTracks, isPlaying, seek, togglePlay, playTrack]);

  const prevTrack = useCallback(() => {
    if (currentTime > 4) {
      seek(0);
      return;
    }
    if (trackHistory.length > 0) {
      const prev = trackHistory[0];
      setTrackHistory((h) => h.slice(1));
      if (currentTrack) {
        setQueue((q) => [currentTrack, ...q]);
      }
      playTrack(prev, true);
      return;
    }
    seek(0);
  }, [currentTime, trackHistory, currentTrack, seek, playTrack]);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioEngine.audio;

    const onTimeUpdate = () => {
      if (!usingNativeAudioForCurrent && (usingAudioElementForCurrent || !currentTrack?.video_id || currentTrack.streamUrl?.startsWith('blob:'))) {
        setCurrentTime(audio.currentTime);
      }
    };

    const unsubscribeAudioEngineTime = audioEngine.onTimeUpdate((time) => {
      if (!usingNativeAudioForCurrent && (usingAudioElementForCurrent || !currentTrack?.video_id || currentTrack.streamUrl?.startsWith('blob:'))) {
        setCurrentTime(time);
      }
    });

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        if (!usingNativeAudioForCurrent && (usingAudioElementForCurrent || !currentTrack?.video_id || currentTrack.streamUrl?.startsWith('blob:'))) {
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
  }, [nextTrack, refreshCache, currentTrack, usingAudioElementForCurrent, usingNativeAudioForCurrent]);

  // NativeAudioEngine listeners for Capacitor Android/iOS background audio & lock-screen sync
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const unsubState = nativeAudioEngine.onStateChange((state) => {
      if (state === 'playing') {
        setIsPlaying(true);
        audioEngine.setExternalPlaying(true);
      } else if (state === 'paused' || state === 'stopped') {
        setIsPlaying(false);
        audioEngine.setExternalPlaying(false);
      } else if (state === 'ended') {
        nextTrack();
        refreshCache();
      }
    });

    const unsubTime = nativeAudioEngine.onTimeUpdate((curr, dur) => {
      if (usingNativeAudioForCurrent) {
        setCurrentTime(curr);
        if (dur > 0 && isFinite(dur)) {
          setDuration(dur);
        }
      }
    });

    const unsubError = nativeAudioEngine.onError((err, failedUrl) => {
      console.warn('[NativeAudioEngine] stream error, falling back to HTML5 stream:', failedUrl, err);
      if (currentTrack) {
        fallbackToServerAudioStream(currentTrack);
      }
    });

    return () => {
      unsubState();
      unsubTime();
      unsubError();
    };
  }, [nextTrack, refreshCache, currentTrack, usingNativeAudioForCurrent, fallbackToServerAudioStream]);

  // YouTube Engine listeners for full song streaming & automatic fallback on embed error
  useEffect(() => {
    const unsubState = youTubeEngine.onStateChange((state) => {
      if (usingNativeAudioForCurrent) return;
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
      if (!usingAudioElementForCurrent && !usingNativeAudioForCurrent) {
        setCurrentTime(curr);
        if (dur > 0 && isFinite(dur)) {
          setDuration(dur);
        }
      }
    });

    const unsubError = youTubeEngine.onError((_errCode, failedVideoId) => {
      if (usingNativeAudioForCurrent) return;
      if (currentTrack && (currentTrack.video_id === failedVideoId || !failedVideoId)) {
        fallbackToServerAudioStream(currentTrack);
      }
    });

    return () => {
      unsubState();
      unsubTime();
      unsubError();
    };
  }, [nextTrack, currentTrack, usingAudioElementForCurrent, usingNativeAudioForCurrent, fallbackToServerAudioStream]);

  // Configure Native StatusBar on Android / iOS initialization
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.hide().catch(() => {});
    }
  }, []);

  // Native Background Audio & Lock-Screen / Notification Shade MediaSession Hook
  useEffect(() => {
    if (!currentTrack) return;

    // 1. Trigger @capacitor-community/media native bridge when running inside Capacitor APK
    if (Capacitor.isNativePlatform()) {
      Media.getAlbums().catch(() => {});
    }

    // 2. Sync Track Metadata & Transport Controls with Android/iOS OS Notification Shade (MediaSession API)
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        const artworkUrl =
          currentTrack.thumbnail ||
          `https://i.ytimg.com/vi/${currentTrack.video_id || 'Or2sMfOcTtw'}/hqdefault.jpg`;

        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title || 'b33t Track',
          artist: currentTrack.artist || 'b33t Artist',
          album: currentTrack.album || 'b33t Stream',
          artwork: [
            { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
            { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
          ],
        });

        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

        navigator.mediaSession.setActionHandler('play', () => {
          if (!isPlaying) togglePlay();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (isPlaying) togglePlay();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          prevTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          nextTrack();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (typeof details.seekTime === 'number') {
            seek(details.seekTime);
          }
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const offset = details.seekOffset || 10;
          seek(Math.max(0, currentTime - offset));
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const offset = details.seekOffset || 10;
          seek(Math.min(duration || 180, currentTime + offset));
        });
      } catch (err) {
        console.warn('[MediaSession] metadata/action setup error:', err);
      }
    }
  }, [currentTrack, isPlaying, togglePlay, prevTrack, nextTrack, seek, currentTime, duration]);

  // Keep OS Notification Shade Scrubber Position Updated
  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      'mediaSession' in navigator &&
      typeof navigator.mediaSession.setPositionState === 'function' &&
      duration > 0 &&
      isFinite(duration)
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, currentTime),
          playbackRate: 1.0,
          position: Math.max(0, Math.min(currentTime, duration)),
        });
      } catch {}
    }
  }, [currentTime, duration]);

  const playAll = useCallback((tracks: Track[]) => {
    if (tracks.length === 0) return;
    tracks.forEach((t) => registerTrackInCatalog(t));
    playTrack(tracks[0], true);
    if (tracks.length > 1) {
      setQueue(tracks.slice(1));
    } else {
      setQueue([]);
    }
  }, [playTrack, registerTrackInCatalog]);

  const addToQueue = useCallback((track: Track) => {
    registerTrackInCatalog(track);
    setQueue((prev) => [...prev, track]);
  }, [registerTrackInCatalog]);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const toggleLike = useCallback((videoId: string, trackObj?: Track) => {
    if (!videoId) return;
    if (trackObj) {
      registerTrackInCatalog(trackObj);
    }
    setLikedIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
    );
  }, [registerTrackInCatalog]);

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
        catalogTracks,
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
