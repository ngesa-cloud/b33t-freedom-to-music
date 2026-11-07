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
import { AndroidAppModal } from './components/AndroidAppModal';
import { AndroidMobileLayout } from './components/AndroidMobileLayout';
import { TrackTable } from './components/TrackTable';
import { FeaturedArtist } from './types/music';
import { Heart, Plus, X, WifiOff } from 'lucide-react';
import { youTubeEngine } from './audio/YouTubeEngine';
import { useOnlineStatus } from './hooks/usePWAInstall';

function AppContent() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    likedIds,
    catalogTracks,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    playTrack,
    toggleLike,
    addToQueue,
    isMiniPlayerOpen,
    toggleMiniPlayer,
  } = useMusicPlayer();

  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!(window as any).Capacitor?.isNativePlatform?.()) {
      youTubeEngine.initPlayer('b33t-embedded-yt');
    }
  }, []);

  // Detect mobile viewport or ?mode=android query parameter
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  const [isAndroidModeManual, setIsAndroidModeManual] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'android' || params.get('app') === 'android';
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState<boolean>(false);

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
    setIsAndroidModalOpen(false);
  }, []);

  // Global keyboard shortcuts (suppressed on INPUT / TEXTAREA / contentEditable)
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

  const likedTracksList = catalogTracks.filter((t) =>
    likedIds.includes(t.video_id || t.id || '')
  );

  const showAndroidExperience = isMobileViewport || isAndroidModeManual;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-zinc-100 font-sans select-none">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-black px-4 py-1 text-xs font-bold flex items-center justify-center gap-2 shrink-0 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode — Playing cached tracks & local library</span>
        </div>
      )}

      {showAndroidExperience ? (
        <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
          {/* If previewing on a large desktop screen, frame it cleanly or let it fill mobile screens */}
          <div
            className={
              !isMobileViewport && isAndroidModeManual
                ? 'w-[412px] h-[92vh] max-h-[880px] rounded-[36px] border-[6px] border-[#282828] shadow-[0_24px_80px_rgba(30,215,96,0.15)] overflow-hidden relative bg-[#121212]'
                : 'w-full h-full overflow-hidden relative bg-[#121212]'
            }
          >
            <AndroidMobileLayout
              currentView={currentView}
              onNavigate={navigateTo}
              selectedArtist={selectedArtist}
              onSelectArtist={setSelectedArtist}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenShareModal={() => setIsAndroidModalOpen(true)}
              onOpenLyrics={() => setIsLyricsOpen(true)}
              onOpenEqualizer={() => setIsEqualizerOpen(true)}
              onOpenVisualizer={() => setIsVisualizerOpen(true)}
              onOpenQueue={() => setIsQueueOpen(true)}
              onOpenImport={() => setIsImportOpen(true)}
              isDesktopPreview={!isMobileViewport && isAndroidModeManual}
              onExitAndroidMode={() => setIsAndroidModeManual(false)}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Spotify Global Top Bar */}
          <TopNav
            currentView={currentView}
            onNavigateHome={() => navigateTo('home')}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              if (currentView !== 'search') navigateTo('search');
            }}
            onSearchSubmit={() => {
              if (currentView !== 'search') navigateTo('search');
            }}
            onSearchFocus={() => {
              if (currentView !== 'search') navigateTo('search');
            }}
            onClearSearch={() => {
              setSearchQuery('');
            }}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onOpenImport={() => setIsImportOpen(true)}
            onOpenEqualizer={() => setIsEqualizerOpen(true)}
            onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
            onToggleAndroidMode={() => setIsAndroidModeManual(true)}
            canGoBack={historyIndex > 0}
            canGoForward={historyIndex < history.length - 1}
            onGoBack={handleGoBack}
            onGoForward={handleGoForward}
          />

          {/* Middle Split: Left "Your Library" Island + Right Main Viewport Island */}
          <div className="flex-1 flex gap-2 px-2 min-h-0 overflow-hidden">
            <Sidebar
              currentView={currentView}
              onNavigate={navigateTo}
              onOpenImport={() => setIsImportOpen(true)}
              onSelectArtist={(artist) => {
                setSelectedArtist(artist);
                navigateTo('artist');
              }}
            />

            {/* Main View Island (#121212 rounded-lg scrollable container) */}
            <main className="flex-1 overflow-y-auto min-h-0 bg-[#121212] rounded-lg relative">
              {currentView === 'home' && (
                <HomeView
                  onSelectArtist={(artist) => {
                    setSelectedArtist(artist);
                    navigateTo('artist');
                  }}
                  onNavigate={navigateTo}
                  onOpenManifesto={() => setIsManifestoOpen(true)}
                  onOpenApiExplorer={() => setIsApiExplorerOpen(true)}
                  onOpenVisualizer={() => setIsVisualizerOpen(true)}
                  onOpenEqualizer={() => setIsEqualizerOpen(true)}
                />
              )}

              {currentView === 'search' && (
                <SearchView
                  initialQuery={searchQuery}
                  onQueryChange={setSearchQuery}
                  hideInlineSearch={true}
                  onSelectArtist={(artist) => {
                    setSelectedArtist(artist);
                    navigateTo('search');
                    navigateTo('artist');
                  }}
                  onArtistClick={(artistName) => {
                    const cleanName = artistName
                      .split(/,|&|\bfeat\.?|\bft\.?/i)[0]
                      .replace(/_/g, ' ')
                      .trim();
                    setSelectedArtist({
                      name: cleanName || artistName,
                      monthly_listeners: '1.8M',
                      origin: 'Global',
                      bio: `${cleanName || artistName} official recording discography.`,
                      image: '',
                    });
                    navigateTo('artist');
                  }}
                />
              )}

              {currentView === 'artist' && selectedArtist && (
                <ArtistView
                  artist={selectedArtist}
                  onBack={handleGoBack}
                />
              )}

              {currentView === 'liked' && (
                <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
                  <div className="relative rounded-2xl overflow-hidden p-6 md:p-10 bg-gradient-to-b from-[#5038a0] to-[#121212] flex items-end gap-6">
                    <div className="w-32 h-32 md:w-44 md:h-44 rounded-lg bg-gradient-to-br from-[#450af5] via-[#8e8ee5] to-[#c4efd9] flex items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                      <Heart className="w-16 h-16 fill-white text-white" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <span className="text-xs font-bold text-white">Playlist</span>
                      <h1 className="text-3xl md:text-6xl font-black text-white tracking-tight">
                        Liked Songs
                      </h1>
                      <p className="text-xs text-[#b3b3b3]">
                        {likedTracksList.length} songs
                      </p>
                    </div>
                  </div>

                  <div className="p-2">
                    <TrackTable
                      tracks={likedTracksList}
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
                        Your Library
                      </h1>
                      <p className="text-xs text-[#b3b3b3] mt-0.5">
                        Saved tracks and local audio imports
                      </p>
                    </div>

                    <button
                      onClick={() => setIsImportOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1ed760] text-black font-bold text-xs hover:bg-[#3be477] transition-colors shadow"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Import Audio</span>
                    </button>
                  </div>

                  <section className="space-y-3">
                    <TrackTable
                      tracks={catalogTracks}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      likedTrackIds={likedIds}
                      onPlayTrack={playTrack}
                      onToggleLike={toggleLike}
                      onAddToQueue={addToQueue}
                    />
                  </section>
                </div>
              )}

              {currentView === 'manifesto' && (
                <div className="p-6 md:p-8 max-w-5xl mx-auto">
                  <ManifestoModal isOpen={true} onClose={() => navigateTo('home')} />
                </div>
              )}

              {currentView === 'api-explorer' && (
                <div className="p-6 md:p-8 max-w-5xl mx-auto">
                  <ApiExplorerModal isOpen={true} onClose={() => navigateTo('home')} />
                </div>
              )}
            </main>
          </div>

          {/* Bottom Spotify PlayerBar */}
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
              const cleanName = name
                .split(/,|&|\bfeat\.?|\bft\.?/i)[0]
                .replace(/_/g, ' ')
                .trim();
              setSelectedArtist({
                name: cleanName || name,
                monthly_listeners: '1.8M',
                origin: 'Global',
                bio: `${cleanName || name} official recording discography.`,
                image: '',
              });
              navigateTo('artist');
            }}
          />
        </>
      )}

      {/* Modals & Overlays */}
      <AndroidAppModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
        isAndroidViewMode={isAndroidModeManual}
        onToggleAndroidViewMode={() => setIsAndroidModeManual((prev) => !prev)}
      />

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

      <ManifestoModal
        isOpen={isManifestoOpen}
        onClose={() => setIsManifestoOpen(false)}
      />

      <ApiExplorerModal
        isOpen={isApiExplorerOpen}
        onClose={() => setIsApiExplorerOpen(false)}
      />

      {/* Embedded YouTube Audio Player & Mini-Stage */}
      <div
        id="b33t-embedded-yt-wrapper"
        className={`fixed z-30 transition-all duration-300 shadow-2xl overflow-hidden border border-[#1e1e24] bg-black ${
          isMiniPlayerOpen && currentTrack
            ? 'bottom-24 right-6 w-80 h-48 rounded-xl opacity-100 pointer-events-auto'
            : 'bottom-0 right-0 w-1 h-1 opacity-0 pointer-events-none'
        }`}
      >
        {isMiniPlayerOpen && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] text-zinc-300 border border-white/10 shadow-lg">
            <span className="font-semibold text-white">Video Stage</span>
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
