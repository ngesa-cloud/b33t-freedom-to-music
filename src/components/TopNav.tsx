import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  UploadCloud,
  Keyboard,
  Sliders,
  CheckCircle2,
  X,
} from 'lucide-react';

interface TopNavProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  onSearchFocus?: () => void;
  onClearSearch?: () => void;
  onOpenShortcuts: () => void;
  onOpenImport: () => void;
  onOpenEqualizer: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSearchFocus,
  onClearSearch,
  onOpenShortcuts,
  onOpenImport,
  onOpenEqualizer,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
}) => {
  return (
    <header className="h-16 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-[#1e1e24] px-6 flex items-center justify-between gap-6 shrink-0 z-20">
      {/* Zone 1 & 2: Navigation history & DeepSeek Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              canGoBack
                ? 'bg-[#1a1a20] text-white hover:bg-[#22222a]'
                : 'bg-[#121216] text-zinc-600 cursor-not-allowed'
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
                ? 'bg-[#1a1a20] text-white hover:bg-[#22222a]'
                : 'bg-[#121216] text-zinc-600 cursor-not-allowed'
            }`}
            title="Go Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8a8a92] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            placeholder="Search tracks, artists, Bien, Sauti Sol, genres..."
            className="w-full bg-[#121216] hover:bg-[#1a1a20] focus:bg-[#1a1a20] border border-[#1e1e24] focus:border-[#1DB954]/60 rounded-full py-2 pl-10 pr-9 text-sm text-zinc-100 placeholder-[#8a8a92] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                if (onClearSearch) onClearSearch();
                else onSearchChange('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenImport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a20] hover:bg-[#22222a] border border-[#1e1e24] text-xs font-semibold text-zinc-200 transition-colors"
          title="Import local audio (.opus, .mp3, .wav) or direct URL"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[#1DB954]" />
          <span className="hidden sm:inline">Import Track</span>
        </button>

        <button
          onClick={onOpenEqualizer}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1a1a20] hover:bg-[#22222a] border border-[#1e1e24] text-xs font-medium text-zinc-300 transition-colors"
          title="5-Band Equalizer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#00e0a0]" />
          <span className="hidden md:inline">EQ</span>
        </button>

        <button
          onClick={onOpenShortcuts}
          className="p-2 rounded-lg bg-[#1a1a20] hover:bg-[#22222a] border border-[#1e1e24] text-[#8a8a92] hover:text-white transition-colors"
          title="Keyboard Shortcuts (Space, Arrows, M, Esc)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#1DB954]" />
          <span className="font-mono tabular-nums">127.0.0.1:3000</span>
        </div>
      </div>
    </header>
  );
};
