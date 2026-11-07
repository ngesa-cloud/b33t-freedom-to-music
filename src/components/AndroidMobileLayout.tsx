import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  Home,
  Search,
  Library,
  Share2,
  Play,
  Pause,
  Heart,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ChevronDown,
  Mic2,
  Sliders,
  Activity,
  ListMusic,
  Download,
  Monitor,
  Plus,
  Volume2,
  VolumeX,
  Server,
  Check,
} from 'lucide-react';
import { useMusicPlayer, getApiHost, setApiHost } from '../context/MusicPlayerContext';
import { FeaturedArtist } from '../types/music';
import { HomeView } from './HomeView';
import { SearchView } from './SearchView';
import { ArtistView } from './ArtistView';
import { TrackTable } from './TrackTable';

interface AndroidMobileLayoutProps {
  currentView: string;
  onNavigate: (view: string) => void;
  selectedArtist: FeaturedArtist | null;
  onSelectArtist: (artist: FeaturedArtist) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenShareModal: () => void;
  onOpenLyrics: () => void;
  onOpenEqualizer: () => void;
  onOpenVisualizer: () => void;
  onOpenQueue: () => void;
  onOpenImport: () => void;
  onExitAndroidMode?: () => void;
  isDesktopPreview?: boolean;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const AndroidMobileLayout: React.FC<AndroidMobileLayoutProps> = ({
  currentView,
  onNavigate,
  selectedArtist,
  onSelectArtist,
  searchQuery,
  onSearchChange,
  onOpenShareModal,
  onOpenLyrics,
  onOpenEqualizer,
  onOpenVisualizer,
  onOpenQueue,
  onOpenImport,
  onExitAndroidMode,
  isDesktopPreview = false,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    likedIds,
    catalogTracks,
    repeatMode,
    isShuffle,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    playTrack,
    toggleLike,
    addToQueue,
    toggleShuffle,
    cycleRepeat,
  } = useMusicPlayer();

  const [isNowPlayingExpanded, setIsNowPlayingExpanded] = useState(false);
  const [showLanSettings, setShowLanSettings] = useState(false);
  const [lanHostInput, setLanHostInput] = useState<string>(() => getApiHost());
  const [lanSaved, setLanSaved] = useState(false);
  const [lanStatus, setLanStatus] = useState<'checking' | 'online' | 'unreachable'>('checking');
  const [detectedLanUrl, setDetectedLanUrl] = useState<string>('');
  const mainScrollRef = useRef<HTMLElement | null>(null);

  const checkServerConnectivity = async (targetHost?: string) => {
    setLanStatus('checking');
    const base = targetHost !== undefined
      ? targetHost.trim().replace(/\/+$/, '')
      : Capacitor.isNativePlatform()
      ? getApiHost()
      : '';
    const pingEndpoint = base ? `${base}/api/ping` : '/api/ping';
    const publicUrlEndpoint = base ? `${base}/api/public_url` : '/api/public_url';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch(pingEndpoint, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        setLanStatus('online');
        fetch(publicUrlEndpoint)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.lanServerUrl) setDetectedLanUrl(d.lanServerUrl);
          })
          .catch(() => {});
        return true;
      }
    } catch {
      clearTimeout(timer);
    }
    setLanStatus('unreachable');
    if (Capacitor.isNativePlatform()) {
      setShowLanSettings(true);
    }
    return false;
  };

  // Hide or overlay native Capacitor StatusBar on Android mobile layout & verify LAN backend
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.hide().catch(() => {});
    }
    checkServerConnectivity();
  }, []);

  // Register Android hardware back button handler
  useEffect(() => {
    (window as any).handleAndroidBack = () => {
      if (isNowPlayingExpanded) {
        setIsNowPlayingExpanded(false);
        return true;
      }
      if (currentView !== 'home') {
        onNavigate('home');
        return true;
      }
      return false;
    };
    return () => {
      delete (window as any).handleAndroidBack;
    };
  }, [isNowPlayingExpanded, currentView, onNavigate]);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentView, selectedArtist]);

  const handleSaveLanHost = async () => {
    setApiHost(lanHostInput);
    setLanSaved(true);
    const ok = await checkServerConnectivity(lanHostInput);
    setTimeout(() => {
      setLanSaved(false);
      if (ok) setShowLanSettings(false);
    }, 1000);
  };

  const openArtistProfileByName = (rawName: string, fallbackImg?: string) => {
    const primaryName = rawName.split(/\s+(?:ft\.|feat\.|x|&|,)\s+/i)[0].replace(/_/g, ' ').trim() || rawName;
    setIsNowPlayingExpanded(false);
    onSelectArtist({
      name: primaryName,
      monthly_listeners: '1.8M',
      origin: 'Global Recording Artist',
      bio: `${primaryName} official discography, top tracks, and full-length releases.`,
      image: fallbackImg || '',
    });
    onNavigate('artist');
  };

  const effectiveDuration =
    duration > 0 ? duration : currentTrack?.duration || 180;
  const progressPercent = Math.min(
    100,
    Math.max(0, (currentTime / effectiveDuration) * 100)
  );
  const trackId = currentTrack?.video_id || currentTrack?.id || '';
  const isLiked = trackId ? likedIds.includes(trackId) : false;

  const likedTracksList = catalogTracks.filter((t) =>
    likedIds.includes(t.video_id || t.id || '')
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] text-white overflow-hidden relative select-none">
      {/* Top Android Bar */}
      <header className="safe-top px-4 pb-2.5 bg-[#121212]/95 backdrop-blur-md border-b border-white/5 shrink-0 z-20 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('home')}
              className="w-8 h-8 rounded-full bg-[#1ed760] text-black font-extrabold text-sm flex items-center justify-center shadow shrink-0"
            >
              B
            </button>
            <div className="shrink-0">
              <span className="font-extrabold text-sm tracking-tight text-white block leading-none">
                b33t
              </span>
              <span className="text-[10px] text-[#1ed760] font-semibold block leading-tight">
                Android Edition
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* LAN Server IP Settings Toggle */}
            <button
              onClick={() => setShowLanSettings((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                showLanSettings
                  ? 'bg-[#1ed760] text-black'
                  : lanStatus === 'unreachable'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[#282828] hover:bg-[#333333] text-white'
              }`}
              title="Server IP (LAN)"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  lanStatus === 'online'
                    ? 'bg-[#1ed760]'
                    : lanStatus === 'unreachable'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-zinc-400'
                }`}
              />
              <Server className="w-3 h-3" />
              <span>LAN IP</span>
            </button>

            <a
              href="/download/b33t-music.apk"
              download="b33t-music.apk"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#1ed760] text-black font-extrabold text-[11px] shadow cursor-pointer"
            >
              <Download className="w-3 h-3 stroke-[2.5]" />
              <span>APK</span>
            </a>

            <button
              onClick={onOpenShareModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#282828] hover:bg-[#333333] text-white font-bold text-[11px] transition-colors cursor-pointer"
            >
              <Share2 className="w-3 h-3 text-[#1ed760]" />
              <span>Share</span>
            </button>

            {isDesktopPreview && onExitAndroidMode && (
              <button
                onClick={onExitAndroidMode}
                className="p-1.5 rounded-full bg-[#282828] hover:bg-[#333333] text-[#b3b3b3] hover:text-white transition-colors"
                title="Return to Desktop Web Player"
              >
                <Monitor className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible LAN Server IP Bar on Mobile */}
        {showLanSettings && (
          <div className="p-2.5 rounded-xl bg-[#1a1a20] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#b3b3b3]">
                Server IP (LAN):{' '}
                <span
                  className={
                    lanStatus === 'online'
                      ? 'text-[#1ed760]'
                      : lanStatus === 'unreachable'
                      ? 'text-amber-400'
                      : 'text-zinc-400'
                  }
                >
                  {lanStatus === 'online'
                    ? '● Connected'
                    : lanStatus === 'unreachable'
                    ? '● Unreachable (check laptop IP)'
                    : '● Checking...'}
                </span>
              </span>
              {detectedLanUrl && detectedLanUrl !== lanHostInput && (
                <button
                  type="button"
                  onClick={() => {
                    setLanHostInput(detectedLanUrl);
                    setApiHost(detectedLanUrl);
                    checkServerConnectivity(detectedLanUrl);
                  }}
                  className="text-[#1ed760] font-mono hover:underline cursor-pointer"
                >
                  Use {detectedLanUrl}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={lanHostInput}
                onChange={(e) => setLanHostInput(e.target.value)}
                placeholder="http://192.168.1.100:3000"
                className="flex-1 min-w-0 bg-[#121216] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#1ed760]"
              />
              <button
                onClick={handleSaveLanHost}
                className="px-3 py-1.5 rounded-lg bg-[#1ed760] text-black font-extrabold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {lanSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Scrollable Android Viewport */}
      <main
        ref={mainScrollRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden pb-36 min-h-0 bg-[#121212] text-white"
      >
        {currentView === 'home' && (
          <HomeView
            isMobile={true}
            onSelectArtist={(artist) => {
              onSelectArtist(artist);
              onNavigate('artist');
            }}
            onNavigate={onNavigate}
            onOpenManifesto={() => {}}
            onOpenApiExplorer={() => {}}
            onOpenVisualizer={onOpenVisualizer}
            onOpenEqualizer={onOpenEqualizer}
          />
        )}

        {currentView === 'search' && (
          <SearchView
            isMobile={true}
            initialQuery={searchQuery}
            onQueryChange={onSearchChange}
            onSelectArtist={(artist) => {
              onSelectArtist(artist);
              onNavigate('artist');
            }}
            onArtistClick={(artistName) => {
              openArtistProfileByName(artistName);
            }}
          />
        )}

        {currentView === 'artist' && selectedArtist && (
          <ArtistView
            isMobile={true}
            artist={selectedArtist}
            onBack={() => onNavigate('home')}
          />
        )}

        {currentView === 'liked' && (
          <div className="p-4 space-y-6 w-full min-w-0">
            <div className="rounded-xl p-5 bg-gradient-to-b from-[#5038a0] to-[#181818] flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center shrink-0 shadow-lg">
                <Heart className="w-10 h-10 fill-white text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold uppercase text-white/80 block">
                  Playlist
                </span>
                <h1 className="text-2xl font-black text-white truncate">Liked Songs</h1>
                <p className="text-xs text-[#b3b3b3]">
                  {likedTracksList.length} songs
                </p>
              </div>
            </div>

            <div className="w-full min-w-0">
              <TrackTable
                isMobile={true}
                tracks={likedTracksList}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                likedTrackIds={likedIds}
                onPlayTrack={playTrack}
                onToggleLike={toggleLike}
                onAddToQueue={addToQueue}
                onArtistClick={(artistName) => openArtistProfileByName(artistName)}
              />
            </div>
          </div>
        )}

        {currentView === 'library' && (
          <div className="p-4 space-y-5 w-full min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-extrabold text-white truncate">
                Your Library
              </h1>
              <button
                onClick={onOpenImport}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1ed760] text-black font-bold text-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Import Audio</span>
              </button>
            </div>

            {/* Pinned Liked Songs Card */}
            <div
              onClick={() => onNavigate('liked')}
              className="flex items-center gap-3.5 p-2.5 rounded-lg bg-[#181818] active:bg-[#282828] cursor-pointer"
            >
              <div className="w-14 h-14 rounded bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 fill-white text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">Liked Songs</p>
                <p className="text-xs text-[#b3b3b3] truncate">
                  Playlist • {likedTracksList.length} songs
                </p>
              </div>
            </div>

            <div className="w-full min-w-0">
              <TrackTable
                isMobile={true}
                tracks={catalogTracks}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                likedTrackIds={likedIds}
                onPlayTrack={playTrack}
                onToggleLike={toggleLike}
                onAddToQueue={addToQueue}
                onArtistClick={(artistName) => openArtistProfileByName(artistName)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Spotify Android Floating Mini-Player (Docked right above Bottom Nav & Safe Area) */}
      {currentTrack && (
        <div
          onClick={() => setIsNowPlayingExpanded(true)}
          className="safe-bottom-miniplayer fixed md:absolute left-2 right-2 bg-[#282828] rounded-md px-2.5 py-2 flex items-center justify-between shadow-[0_8px_24px_rgba(0,0,0,0.8)] z-30 cursor-pointer overflow-hidden"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-10 h-10 rounded object-cover shrink-0 bg-[#181818]"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {currentTrack.title}
              </p>
              <p className="text-[11px] text-[#b3b3b3] truncate">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-2 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => toggleLike(trackId, currentTrack)}
              className={`p-2 ${
                isLiked ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
              }`}
              aria-label="Like song"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#1ed760]' : ''}`} />
            </button>
            <button
              onClick={togglePlay}
              className="p-2 text-white"
              aria-label="Play or Pause"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white" />
              )}
            </button>
          </div>

          {/* Thin Spotify Android bottom progress bar on mini-player */}
          <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1ed760] rounded-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Spotify Android Bottom Tab Navigation (Sits above Android system navigation bar) */}
      <nav className="safe-bottom-nav fixed md:absolute left-0 right-0 h-[56px] bg-gradient-to-t from-black via-black/95 to-black/85 backdrop-blur-md border-t border-white/5 flex items-center justify-around px-2 z-30">
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${
            currentView === 'home' ? 'text-white' : 'text-[#b3b3b3]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button
          onClick={() => onNavigate('search')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${
            currentView === 'search' ? 'text-white' : 'text-[#b3b3b3]'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Search</span>
        </button>

        <button
          onClick={() => onNavigate('library')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${
            currentView === 'library' || currentView === 'liked'
              ? 'text-white'
              : 'text-[#b3b3b3]'
          }`}
        >
          <Library className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Your Library</span>
        </button>

        <button
          onClick={onOpenShareModal}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[#1ed760]"
        >
          <Download className="w-5 h-5" />
          <span className="text-[10px] font-bold">Get APK</span>
        </button>
      </nav>

      {/* Full-Screen Android Now Playing Sheet */}
      {isNowPlayingExpanded && currentTrack && (
        <div className="mobile-safe-area fixed md:absolute inset-0 z-40 bg-gradient-to-b from-[#2b3530] via-[#121212] to-black flex flex-col justify-between p-6 overflow-y-auto">
          {/* Sheet Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsNowPlayingExpanded(false)}
              className="p-2 -ml-2 text-white"
              aria-label="Collapse player"
            >
              <ChevronDown className="w-7 h-7" />
            </button>
            <button
              onClick={() => openArtistProfileByName(currentTrack.artist, currentTrack.thumbnail)}
              className="text-center"
            >
              <span className="text-[10px] uppercase tracking-widest text-[#b3b3b3] font-bold block">
                Playing from b33t
              </span>
              <span className="text-xs font-bold text-white hover:text-[#1ed760] transition-colors">
                {currentTrack.artist}
              </span>
            </button>
            <button
              onClick={onOpenShareModal}
              className="p-2 -mr-2 text-[#1ed760]"
              aria-label="Share APK"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Center Album Art */}
          <div className="my-auto py-3 flex items-center justify-center">
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-full max-w-[270px] aspect-square rounded-xl object-cover shadow-[0_16px_40px_rgba(0,0,0,0.75)]"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Track Info + Scrubber + Transport */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold text-white truncate">
                  {currentTrack.title}
                </h2>
                <button
                  onClick={() => openArtistProfileByName(currentTrack.artist, currentTrack.thumbnail)}
                  className="text-sm text-[#b3b3b3] hover:text-white underline-offset-2 hover:underline truncate block text-left"
                >
                  {currentTrack.artist}
                </button>
              </div>
              <button
                onClick={() => toggleLike(trackId, currentTrack)}
                className={`p-2 ${
                  isLiked ? 'text-[#1ed760]' : 'text-[#b3b3b3]'
                }`}
              >
                <Heart
                  className={`w-6 h-6 ${isLiked ? 'fill-[#1ed760]' : ''}`}
                />
              </button>
            </div>

            {/* Scrubber */}
            <div className="space-y-1.5">
              <div className="relative h-4 flex items-center">
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1ed760] rounded-full"
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
              <div className="flex items-center justify-between text-[11px] text-[#b3b3b3] font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(effectiveDuration)}</span>
              </div>
            </div>

            {/* Transport Row */}
            <div className="flex items-center justify-between px-2">
              <button
                onClick={toggleShuffle}
                className={`p-2 relative ${
                  isShuffle ? 'text-[#1ed760]' : 'text-[#b3b3b3]'
                }`}
              >
                <Shuffle className="w-5 h-5" />
                {isShuffle && (
                  <span className="w-1 h-1 rounded-full bg-[#1ed760] absolute bottom-0.5 left-1/2 -translate-x-1/2" />
                )}
              </button>

              <button onClick={prevTrack} className="p-2 text-white">
                <SkipBack className="w-7 h-7 fill-current" />
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl active:scale-95 transition-transform"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-black" />
                ) : (
                  <Play className="w-7 h-7 fill-black ml-0.5" />
                )}
              </button>

              <button onClick={nextTrack} className="p-2 text-white">
                <SkipForward className="w-7 h-7 fill-current" />
              </button>

              <button
                onClick={cycleRepeat}
                className={`p-2 relative ${
                  repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-[#b3b3b3]'
                }`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
                {repeatMode !== 'off' && (
                  <span className="w-1 h-1 rounded-full bg-[#1ed760] absolute bottom-0.5 left-1/2 -translate-x-1/2" />
                )}
              </button>
            </div>

            {/* Volume Control Row */}
            <div className="flex items-center gap-3 px-2">
              <button
                onClick={toggleMute}
                className="text-[#b3b3b3] hover:text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <div className="flex-1 h-1 bg-white/20 rounded-full relative">
                <div
                  className="h-full bg-white rounded-full"
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

            {/* Bottom Audio Tools Row */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[#b3b3b3]">
              <button
                onClick={onOpenLyrics}
                className="flex items-center gap-1.5 text-xs font-semibold hover:text-white py-1"
              >
                <Mic2 className="w-4 h-4 text-[#1ed760]" />
                <span>Lyrics</span>
              </button>

              <button
                onClick={onOpenEqualizer}
                className="flex items-center gap-1.5 text-xs font-semibold hover:text-white py-1"
              >
                <Sliders className="w-4 h-4 text-[#1ed760]" />
                <span>5-Band EQ</span>
              </button>

              <button
                onClick={onOpenVisualizer}
                className="flex items-center gap-1.5 text-xs font-semibold hover:text-white py-1"
              >
                <Activity className="w-4 h-4 text-[#1ed760]" />
                <span>Visualizer</span>
              </button>

              <button
                onClick={onOpenQueue}
                className="flex items-center gap-1.5 text-xs font-semibold hover:text-white py-1"
              >
                <ListMusic className="w-4 h-4 text-[#1ed760]" />
                <span>Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
