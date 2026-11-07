import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  UploadCloud,
  Sliders,
  X,
  Smartphone,
  ArrowDownCircle,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getApiHost, setApiHost } from '../utils/apiBase';

interface TopNavProps {
  currentView?: string;
  onNavigateHome?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  onSearchFocus?: () => void;
  onClearSearch?: () => void;
  onOpenShortcuts: () => void;
  onOpenImport: () => void;
  onOpenEqualizer: () => void;
  onOpenAndroidModal?: () => void;
  onToggleAndroidMode?: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView = 'home',
  onNavigateHome,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSearchFocus,
  onClearSearch,
  onOpenImport,
  onOpenEqualizer,
  onOpenAndroidModal,
  onToggleAndroidMode,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [apiHost, setApiHostState] = useState<string>(() => getApiHost());
  const [savedHost, setSavedHost] = useState<boolean>(false);

  const handleSaveHost = () => {
    setApiHost(apiHost);
    setSavedHost(true);
    setTimeout(() => setSavedHost(false), 1500);
  };

  return (
    <header className="h-14 bg-black px-3 flex items-center justify-between gap-4 shrink-0 z-30">
      {/* Zone 1: Brand + Back/Forward */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 pl-1 pr-2 focus:outline-none group"
        >
          <div className="w-8 h-8 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/logo.png" alt="b33t" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
            b33t
          </span>
        </button>

        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              canGoBack
                ? 'bg-[#121212] text-white hover:bg-[#1f1f1f]'
                : 'bg-[#0a0a0a] text-zinc-600 cursor-not-allowed'
            }`}
            title="Go Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onGoForward}
            disabled={!canGoForward}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              canGoForward
                ? 'bg-[#121212] text-white hover:bg-[#1f1f1f]'
                : 'bg-[#0a0a0a] text-zinc-600 cursor-not-allowed'
            }`}
            title="Go Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zone 2: Spotify Centered Home Button + Omnibox Search Bar ("What do you want to play?") */}
      <div className="flex items-center gap-2 flex-1 max-w-xl mx-auto">
        <button
          onClick={onNavigateHome}
          className={`w-11 h-11 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] hover:scale-105 flex items-center justify-center transition-all shrink-0 ${
            currentView === 'home' ? 'text-white' : 'text-[#b3b3b3]'
          }`}
          title="Home"
        >
          <Home className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <Search className="w-5 h-5 text-[#b3b3b3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => {
              if (onSearchFocus) onSearchFocus();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearchSubmit();
            }}
            placeholder="What do you want to play?"
            className="w-full h-11 bg-[#1f1f1f] hover:bg-[#2a2a2a] focus:bg-[#242424] border border-transparent focus:border-white/30 rounded-full pl-11 pr-10 text-sm text-white placeholder-[#b3b3b3] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                if (onClearSearch) onClearSearch();
                else onSearchChange('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white p-1 rounded-full transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Zone 3: Server IP (LAN) + Spotify "Install App" + Android App Share + Audio Controls */}
      <div className="flex items-center gap-2 shrink-0 relative">
        <div className="hidden 2xl:flex items-center gap-1.5 bg-[#121212] border border-white/10 rounded-full px-3 py-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#b3b3b3] whitespace-nowrap">
            Server IP (LAN)
          </span>
          <input
            type="text"
            aria-label="Server IP (LAN)"
            value={apiHost}
            onChange={(e) => setApiHostState(e.target.value)}
            placeholder="http://192.168.1.100:3000"
            className="w-36 bg-transparent text-[11px] font-mono text-zinc-200 focus:outline-none"
            title="Server IP (LAN) — localStorage.b33t_api_host"
          />
          <button
            type="button"
            onClick={handleSaveHost}
            className="px-2.5 py-0.5 rounded-full bg-[#1ed760] text-black text-[10px] font-extrabold cursor-pointer"
          >
            {savedHost ? 'Saved' : 'Save'}
          </button>
        </div>

        {isInstallable && !isInstalled && (
          <button
            onClick={install}
            className="px-3.5 py-1.5 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-xs font-extrabold text-black flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            title="Install standalone app"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}

        <button
          onClick={onOpenAndroidModal}
          className="px-3.5 py-1.5 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-bold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border border-[#1ed760]/30"
          title="Share Android Download Link & QR Code with Friends"
        >
          <ArrowDownCircle className="w-3.5 h-3.5 text-[#1ed760]" />
          <span>Get Android App</span>
        </button>

        {onToggleAndroidMode && (
          <button
            onClick={onToggleAndroidMode}
            className="px-3 py-1.5 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-bold text-[#b3b3b3] hover:text-white hidden lg:flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Preview Android Phone App Mode"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#1ed760]" />
            <span>Phone UI</span>
          </button>
        )}

        <button
          onClick={onOpenEqualizer}
          className="px-3 py-1.5 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] text-xs font-bold text-white hidden md:flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="5-Band Equalizer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#1ed760]" />
          <span>EQ</span>
        </button>

        <button
          onClick={onOpenImport}
          className="px-4 py-1.5 rounded-full bg-white hover:bg-zinc-200 hover:scale-105 text-black text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          title="Import local audio or direct URL"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Import Audio</span>
        </button>
      </div>
    </header>
  );
};
