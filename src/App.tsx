/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MusicPlayerProvider, useMusicPlayer } from './context/MusicPlayerContext';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { PlayerBar } from './components/PlayerBar';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { ArtistView } from './components/ArtistView';
import { VisualizerModal } from './components/VisualizerModal';
import { EqualizerModal } from './components/EqualizerModal';
import { LyricsModal } from './components/LyricsModal';
import { QueueDrawer } from './components/QueueDrawer';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ManifestoModal } from './components/ManifestoModal';
import { ApiExplorerModal } from './components/ApiExplorerModal';
import { LocalImportModal } from './components/LocalImportModal';
import { VideoModal } from './components/VideoModal';
import { TrackTable } from './components/TrackTable';
import { Track, FeaturedArtist } from './types/music';
import { Heart, HardDrive, Plus, X } from 'lucide-react';
import { youTubeEngine } from './audio/YouTubeEngine';

function AppContent() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    likedIds,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    playTrack,
    toggleLike,
    addToQueue,
    cacheStatus,
    clearCache,
    isMiniPlayerOpen,
    toggleMiniPlayer,
  } = useMusicPlayer();

  useEffect(() => {
    youTubeEngine.initPlayer('b33t-embedded-yt');
  }, []);

  // Navigation state
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedArtist, setSelectedArtist] = useState<FeaturedArtist | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [history, setHistory] = useState<string[]>(['home']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Modals state
  const [isVideoOpen, setIsVideoOpen] = useState<boolean>(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState<boolean>(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isManifestoOpen, setIsManifestoOpen] = useState<boolean>(false);
  const [isApiExplorerOpen, setIsApiExplorerOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  // Stored tracks for library
  const [storedTracks, setStoredTracks] = useState<Track[]>([]);

  useEffect(() => {
    // Initial fetch of tracks for library
    fetch('/api/trending')
      .then((res) => res.json())
      .then((data) => setStoredTracks(data))
      .catch(console.warn);
  }, []);

  const navigateTo = (view: string) => {
    setCurrentView(view);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), view]);
    setHistoryIndex((prev) => prev + 1);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentView(history[newIndex]);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentView(history[newIndex]);
    }
  };

  const closeAllOverlays = useCallback(() => {
    setIsVideoOpen(false);
    setIsVisualizerOpen(false);
    setIsEqualizerOpen(false);
    setIsLyricsOpen(false);
    setIsQueueOpen(false);
    setIsShortcutsOpen(false);
    setIsManifestoOpen(false);
    setIsApiExplorerOpen(false);
    setIsImportOpen(false);
  }, []);

  // Section 4.9: Global keyboard shortcuts (suppressed on INPUT / TEXTAREA / contentEditable)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        closeAllOverlays();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) {
          nextTrack();
        } else {
          seek(Math.min(duration, currentTime + 5));
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          prevTrack();
        } else {
          seek(Math.max(0, currentTime - 5));
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.1));
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.1));
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    currentTime,
    duration,
    volume,
    setVolume,
    toggleMute,
    closeAllOverlays,
  ]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0c] text-zinc-100 font-sans select-none">
      {/* 240px Collapsible Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={navigateTo}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <TopNav
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (currentView !== 'search') setCurrentView('search');
          }}
          onSearchSubmit={() => {
            if (currentView !== 'search') setCurrentView('search');
          }}
          onSearchFocus={() => {
            if (currentView !== 'search') setCurrentView('search');
          }}
          onClearSearch={() => {
            setSearchQuery('');
          }}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenEqualizer={() => setIsEqualizerOpen(true)}
          canGoBack={historyIndex > 0}
          canGoForward={historyIndex < history.length - 1}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
        />

        {/* Viewport content */}
        <main className="flex-1 overflow-y-auto min-h-0 bg-gradient-to-b from-[#121216]/50 to-[#0a0a0c]">
          {currentView === 'home' && (
            <HomeView
              onSelectArtist={(artist) => {
                setSelectedArtist(artist);
                setCurrentView('artist');
              }}
              onOpenManifesto={() => setIsManifestoOpen(true)}
              onOpenApiExplorer={() => setIsApiExplorerOpen(true)}
              onOpenVisualizer={() => setIsVisualizerOpen(true)}
              onOpenEqualizer={() => setIsEqualizerOpen(true)}
            />
          )}

          {currentView === 'search' && (
            <SearchView
              initialQuery={searchQuery}
              onSelectArtist={(artist) => {
                setSelectedArtist(artist);
                setCurrentView('artist');
              }}
              onArtistClick={(artistName) => {
                setSelectedArtist({
                  name: artistName,
                  monthly_listeners: '8.4M',
                  origin: 'Global',
                  bio: `Renowned creator of high-fidelity music discographies.`,
                  image: 'https://i.ytimg.com/vi/Or2sMfOcTtw/hqdefault.jpg',
                });
                setCurrentView('artist');
              }}
            />
          )}

          {currentView === 'artist' && selectedArtist && (
            <ArtistView
              artist={selectedArtist}
              onBack={() => setCurrentView('home')}
            />
          )}

          {currentView === 'liked' && (
            <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden p-6 md:p-10 bg-gradient-to-r from-indigo-950 via-[#121216] to-[#0a0a0c] border border-[#1e1e24] shadow-2xl flex items-end gap-6">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-800 flex items-center justify-center shrink-0 shadow-2xl">
                  <Heart className="w-16 h-16 fill-white text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <span className="text-xs uppercase font-mono tracking-wider text-purple-200">
                    Your Freedom Library
                  </span>
                  <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                    Liked Songs
                  </h1>
                  <p className="text-xs text-[#8a8a92]">
                    {likedIds.length} tracks saved locally on your workstation
                  </p>
                </div>
              </div>

              <div className="bg-[#121216] border border-[#1e1e24] rounded-xl p-2 shadow-inner">
                <TrackTable
                  tracks={storedTracks.filter((t) => likedIds.includes(t.video_id || t.id || ''))}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  likedTrackIds={likedIds}
                  onPlayTrack={playTrack}
                  onToggleLike={toggleLike}
                  onAddToQueue={addToQueue}
                />
              </div>
            </div>
          )}

          {currentView === 'library' && (
            <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    Your Freedom Library
                  </h1>
                  <p className="text-xs text-[#8a8a92] mt-0.5">
                    100% private, zero telemetry, local disk storage
                  </p>
                </div>

                <button
                  onClick={() => setIsImportOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1DB954] text-black font-bold text-xs hover:bg-[#00e0a0] transition-colors shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Import Audio</span>
                </button>
              </div>

              {/* Cache storage tile */}
              <div className="p-5 rounded-2xl bg-[#121216] border border-[#1e1e24] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-[#1DB954] flex items-center justify-center shrink-0">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      audio_cache/ (*.opus) Storage
                    </h2>
                    <p className="text-xs text-[#8a8a92]">
                      {cacheStatus?.track_count || 0} tracks cached for instant offline playback
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#00e0a0] font-bold px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30">
                    {((cacheStatus?.total_bytes || 0) / (1024 * 1024)).toFixed(1)} MB Active
                  </span>
                  <button
                    onClick={() => clearCache()}
                    className="px-3 py-1.5 rounded-lg bg-[#1a1a20] hover:bg-[#22222a] border border-[#1e1e24] text-xs text-[#8a8a92] hover:text-white transition-colors"
                  >
                    Flush Cache
                  </button>
                </div>
              </div>

              {/* Tracks Table */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-white tracking-tight">Catalog Tracks</h2>
                <div className="bg-[#121216] border border-[#1e1e24] rounded-xl p-2 shadow-inner">
                  <TrackTable
                    tracks={storedTracks}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedTrackIds={likedIds}
                    onPlayTrack={playTrack}
                    onToggleLike={toggleLike}
                    onAddToQueue={addToQueue}
                  />
                </div>
              </section>
            </div>
          )}

          {currentView === 'manifesto' && (
            <div className="p-6 md:p-8 max-w-5xl mx-auto">
              <ManifestoModal isOpen={true} onClose={() => setCurrentView('home')} />
            </div>
          )}

          {currentView === 'api-explorer' && (
            <div className="p-6 md:p-8 max-w-5xl mx-auto">
              <ApiExplorerModal isOpen={true} onClose={() => setCurrentView('home')} />
            </div>
          )}
        </main>

        {/* Fixed 96px PlayerBar */}
        <PlayerBar
          onToggleVideo={() => setIsVideoOpen(!isVideoOpen)}
          onToggleVisualizer={() => setIsVisualizerOpen(!isVisualizerOpen)}
          onToggleLyrics={() => setIsLyricsOpen(!isLyricsOpen)}
          onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
          onToggleEqualizer={() => setIsEqualizerOpen(!isEqualizerOpen)}
          isVideoOpen={isVideoOpen}
          isVisualizerOpen={isVisualizerOpen}
          isLyricsOpen={isLyricsOpen}
          isQueueOpen={isQueueOpen}
          isEqualizerOpen={isEqualizerOpen}
          onArtistClick={(name) => {
            setSelectedArtist({
              name,
              monthly_listeners: '4.8M',
              origin: 'East Africa / Global',
              bio: `Renowned music creator.`,
              image: 'https://i.ytimg.com/vi/Or2sMfOcTtw/hqdefault.jpg',
            });
            setCurrentView('artist');
          }}
        />
      </div>

      {/* Modals & Overlays */}
      <VideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
      />

      <VisualizerModal
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
      />

      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
      />

      <LyricsModal
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
      />

      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <LocalImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      {/* Embedded YouTube Audio Player & Mini-Stage */}
      <div
        id="b33t-embedded-yt-wrapper"
        className={`fixed z-30 transition-all duration-300 shadow-2xl overflow-hidden border border-[#1e1e24] bg-black ${
          isMiniPlayerOpen && currentTrack
            ? 'bottom-28 right-6 w-80 h-48 rounded-xl opacity-100 pointer-events-auto'
            : 'bottom-0 right-0 w-1 h-1 opacity-0 pointer-events-none'
        }`}
      >
        {isMiniPlayerOpen && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] text-zinc-300 border border-white/10 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-white">Full Track Stream</span>
            <button
              onClick={toggleMiniPlayer}
              className="ml-1 text-zinc-400 hover:text-white p-0.5 rounded"
              title="Minimize to background audio"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div id="b33t-embedded-yt" className="w-full h-full pointer-events-auto" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <MusicPlayerProvider>
      <AppContent />
    </MusicPlayerProvider>
  );
}
