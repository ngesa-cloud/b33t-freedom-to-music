import React from 'react';
import {
  Home,
  Search,
  Library,
  BookOpen,
  Server,
  Heart,
  HardDrive,
  Trash2,
  Radio,
  Plus,
} from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenImport: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onOpenImport }) => {
  const { cacheStatus, clearCache, likedIds } = useMusicPlayer();

  const totalBytes = cacheStatus?.total_bytes || 0;
  const trackCount = cacheStatus?.track_count || 0;
  const softCapBytes = 500 * 1024 * 1024; // 500 MB
  const percentCap = Math.min(100, Math.round((totalBytes / softCapBytes) * 100));

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
    { id: 'manifesto', label: 'The Manifesto', icon: BookOpen },
    { id: 'api-explorer', label: 'API Explorer', icon: Server },
  ];

  return (
    <aside className="w-[240px] bg-[#121216] border-r border-[#1e1e24] flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 pb-4">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 group text-left w-full focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg shadow-[#1DB954]/25 border border-[#1DB954]/40 group-hover:scale-105 transition-transform duration-150 shrink-0 overflow-hidden">
            <img src="/logo.png" alt="b33t logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-white font-mono">b33t</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/80 text-[#1DB954] border border-emerald-500/30">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-[#8a8a92] font-medium tracking-tight">Freedom to Music</p>
          </div>
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-[#1a1a20] text-white border-l-2 border-[#1DB954] pl-2.5 shadow-sm'
                  : 'text-[#8a8a92] hover:text-white hover:bg-[#1a1a20]/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#1DB954]' : 'text-[#8a8a92]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Library Collections */}
      <div className="mt-5 px-3 flex-1 flex flex-col min-h-0 border-t border-[#1e1e24] pt-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8a8a92]">
            Collections
          </span>
          <button
            onClick={onOpenImport}
            title="Import Local Audio"
            className="p-1 rounded text-[#8a8a92] hover:text-white hover:bg-white/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Liked Songs Tile */}
        <button
          onClick={() => onNavigate('liked')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 mb-1 ${
            currentView === 'liked'
              ? 'bg-[#1a1a20] text-white border-l-2 border-[#1DB954] pl-2.5 font-medium'
              : 'text-[#8a8a92] hover:text-white hover:bg-[#1a1a20]/60'
          }`}
        >
          <div className="w-7 h-7 rounded bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center shrink-0">
            <Heart className="w-3.5 h-3.5 fill-white text-white" />
          </div>
          <div className="flex-1 text-left truncate">
            <p className="truncate text-xs font-semibold text-white">Liked Songs</p>
            <p className="text-[11px] text-[#8a8a92] tabular-nums">{likedIds.length} tracks</p>
          </div>
        </button>
      </div>

      {/* Section 4.6: Cache Panel (bottom-left) */}
      <div className="p-3 mx-3 mb-3 mt-2 rounded-xl bg-[#1a1a20] border border-[#1e1e24]">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1.5 text-zinc-200">
            <HardDrive className="w-3.5 h-3.5 text-[#1DB954]" />
            <span className="font-semibold text-[11px] tracking-tight">audio_cache/</span>
          </div>
          <button
            onClick={() => clearCache()}
            title="Flush local audio cache (DELETE /api/cache)"
            className="text-[#8a8a92] hover:text-red-400 p-1 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8a8a92]">
          <span>{trackCount} tracks</span>
          <span className="font-mono text-[#00e0a0] font-medium tabular-nums">
            {formatBytes(totalBytes)}
          </span>
        </div>

        {/* Progress bar relative to 500 MB soft cap */}
        <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-[#1DB954] h-full rounded-full transition-all duration-300"
            style={{ width: `${percentCap}%` }}
          />
        </div>
        <p className="text-[10px] text-[#8a8a92] mt-1.5 truncate">
          {percentCap}% of 500 MB soft cap
        </p>
      </div>
    </aside>
  );
};
