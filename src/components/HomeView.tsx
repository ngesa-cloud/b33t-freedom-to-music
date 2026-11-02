import React, { useEffect, useState } from 'react';
import { Play, Sparkles, Radio, Zap, Globe, HardDrive } from 'lucide-react';
import { Track, FeaturedArtist } from '../types/music';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { TrackTable } from './TrackTable';
import { SkullHeroAnimation } from './SkullHeroAnimation';

const getArtistAvatarFallback = (name: string) => {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231a2e22"/><stop offset="100%" stop-color="%23121216"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(%23g)"/><text x="50%" y="54%" font-family="system-ui,sans-serif" font-weight="bold" font-size="40" fill="%231DB954" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
};

interface HomeViewProps {
  onSelectArtist: (artist: FeaturedArtist) => void;
  onOpenManifesto: () => void;
  onOpenApiExplorer: () => void;
  onOpenVisualizer?: () => void;
  onOpenEqualizer?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectArtist,
  onOpenManifesto,
  onOpenApiExplorer,
  onOpenVisualizer,
  onOpenEqualizer,
}) => {
  const { currentTrack, isPlaying, likedIds, playTrack, playAll, toggleLike, addToQueue } = useMusicPlayer();
  const [featuredArtists, setFeaturedArtists] = useState<FeaturedArtist[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);

  useEffect(() => {
    // 1. Fetch featured artists
    fetch('/api/featured_artists')
      .then((res) => res.json())
      .then((data) => setFeaturedArtists(data))
      .catch((err) => console.warn('[Featured Artists] fetch error:', err));

    // 2. Fetch initial trending tracks
    fetch('/api/trending')
      .then((res) => res.json())
      .then((data) => setTrendingTracks(data))
      .catch((err) => console.warn('[Trending Tracks] fetch error:', err));
  }, []);

  const africanArtists = featuredArtists.filter((a) =>
    ['Bien', 'Sauti Sol', 'Burna Boy', 'Ayra Starr', 'Asake', 'Tems'].includes(a.name)
  );

  const globalArtists = featuredArtists.filter((a) =>
    ['Stormzy', 'Kendrick Lamar', 'The Weeknd', 'Drake', 'Travis Scott'].includes(a.name)
  );

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* Animated Skull with Headphones Beat Reactor */}
      <SkullHeroAnimation
        onStreamAll={() => playAll(trendingTracks)}
        onOpenVisualizer={onOpenVisualizer}
        onOpenEqualizer={onOpenEqualizer}
      />

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#121216] border border-[#1e1e24] hover:border-white/10 transition-colors flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-[#1DB954] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Sub-Second Playback</h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">Prewarmed audio streams and worker threadpools.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#121216] border border-[#1e1e24] hover:border-white/10 transition-colors flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">African Discographies</h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">Curated Bien, Sauti Sol, Burna Boy, and Ayra Starr.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#121216] border border-[#1e1e24] hover:border-white/10 transition-colors flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-[#00e0a0] flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Local Disk Cache</h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">Native <code className="text-[#00e0a0] font-mono text-[11px]">audio_cache/*.opus</code> storage.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#121216] border border-[#1e1e24] hover:border-white/10 transition-colors flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Zero Telemetry</h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">Runs on <code className="text-sky-300 font-mono text-[11px]">127.0.0.1</code> with complete privacy.</p>
          </div>
        </div>
      </section>

      {/* African Discographies Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">African Giants Discographies</h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">Nairobi soul harmonies, Lagos Afro-fusion, and Amapiano anthems</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {africanArtists.map((artist) => (
            <div
              key={artist.name}
              onClick={() => onSelectArtist(artist)}
              className="group p-4 rounded-xl bg-[#121216] hover:bg-[#1a1a20] border border-[#1e1e24] hover:border-white/10 transition-all cursor-pointer flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden mb-3 relative shadow-lg group-hover:scale-105 transition-transform border border-[#1e1e24]">
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getArtistAvatarFallback(artist.name);
                  }}
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors truncate w-full">
                {artist.name}
              </h3>
              <p className="text-[11px] text-[#8a8a92] truncate w-full">{artist.origin}</p>
              <span className="text-[10px] text-zinc-500 mt-1">{artist.monthly_listeners} monthly</span>
            </div>
          ))}
        </div>
      </section>

      {/* Global Icons Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Global Icons</h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">High-definition hip-hop, dark R&B, and stadium anthems</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {globalArtists.map((artist) => (
            <div
              key={artist.name}
              onClick={() => onSelectArtist(artist)}
              className="group p-4 rounded-xl bg-[#121216] hover:bg-[#1a1a20] border border-[#1e1e24] hover:border-white/10 transition-all cursor-pointer flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform border border-[#1e1e24]">
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getArtistAvatarFallback(artist.name);
                  }}
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors truncate">
                  {artist.name}
                </h3>
                <p className="text-xs text-[#8a8a92] truncate">{artist.monthly_listeners} monthly</p>
                <span className="text-[10px] text-emerald-400 font-mono">Opus 251</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Tracks Table */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Featured Discography Tracks
            </h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">
              Instant sub-second streaming with HTTP Range seeking
            </p>
          </div>
          <button
            onClick={() => playAll(trendingTracks)}
            className="text-xs font-semibold text-[#1DB954] hover:underline"
          >
            Play All ({trendingTracks.length})
          </button>
        </div>

        <div className="bg-[#121216] border border-[#1e1e24] rounded-xl p-2 shadow-inner">
          <TrackTable
            tracks={trendingTracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedTrackIds={likedIds}
            onPlayTrack={playTrack}
            onToggleLike={toggleLike}
            onAddToQueue={addToQueue}
            onArtistClick={(artistName) => {
              const match = featuredArtists.find(
                (a) => a.name.toLowerCase() === artistName.toLowerCase()
              );
              if (match) onSelectArtist(match);
            }}
          />
        </div>
      </section>
    </div>
  );
};
