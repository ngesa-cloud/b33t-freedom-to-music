import React, { useEffect, useState } from 'react';
import { Play, Pause, Heart, Clock, Plus } from 'lucide-react';
import { Track, FeaturedArtist } from '../types/music';
import { useMusicPlayer, apiUrl } from '../context/MusicPlayerContext';

const getArtistAvatarFallback = (name: string) => {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23282828"/><stop offset="100%" stop-color="%23121212"/></linearGradient></defs><rect width="240" height="240" rx="120" fill="url(%23g)"/><text x="50%" y="54%" font-family="Plus Jakarta Sans,sans-serif" font-weight="bold" font-size="72" fill="%231ed760" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
};

const DEFAULT_COVER_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="%23181818"/><text x="50%" y="54%" font-family="sans-serif" font-weight="bold" font-size="64" fill="%231ed760" text-anchor="middle" dominant-baseline="middle">♪</text></svg>`;

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec < 0) return '3:15';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const AMBIENT_COLORS = [
  'from-[#1e3264]/45',
  'from-[#14433b]/50',
  'from-[#5038a0]/45',
  'from-[#7d2438]/40',
  'from-[#1e3a5f]/45',
  'from-[#2d4628]/45',
  'from-[#602850]/40',
  'from-[#473d21]/45',
];

const INITIAL_FEATURED_ARTISTS: FeaturedArtist[] = [
  {
    name: 'Burna Boy',
    monthly_listeners: '18,400,000',
    origin: 'Port Harcourt, Nigeria',
    bio: 'Grammy-winning African Giant whose polyrhythmic Afro-fusion fills global stadiums.',
    image: 'https://i.ytimg.com/vi/421w1j87fEM/hqdefault.jpg',
  },
  {
    name: 'Asake',
    monthly_listeners: '9,840,000',
    origin: 'Lagos, Nigeria',
    bio: 'Mr. Money with the vibe — uniting Fuji street-pop cadences with thunderous Amapiano basslines.',
    image: 'https://i.ytimg.com/vi/bbVZo4Yw7pI/hqdefault.jpg',
  },
  {
    name: 'Tems',
    monthly_listeners: '14,600,000',
    origin: 'Lagos, Nigeria',
    bio: 'Grammy and Oscar-nominated visionary whose evocative contralto redefined modern Alté and R&B.',
    image: 'https://i.ytimg.com/vi/1JltlSJH5bY/hqdefault.jpg',
  },
  {
    name: 'Ayra Starr',
    monthly_listeners: '12,950,000',
    origin: 'Cotonou, Benin / Lagos, Nigeria',
    bio: 'Celestial sensation captivating audiences globally with crystalline vocals and infectious hit anthems.',
    image: 'https://i.ytimg.com/vi/crtQSTYWtqE/hqdefault.jpg',
  },
  {
    name: 'Bien',
    monthly_listeners: '2,481,200',
    origin: 'Nairobi, Kenya',
    bio: 'East African soul royalty and frontman of Sauti Sol, leading global Afro-pop with irresistible acoustic harmonics.',
    image: 'https://i.ytimg.com/vi/Or2sMfOcTtw/hqdefault.jpg',
  },
  {
    name: 'Kendrick Lamar',
    monthly_listeners: '64,200,000',
    origin: 'Compton, California',
    bio: 'Pulitzer Prize recipient and master of lyrical architecture and cultural commentary.',
    image: 'https://i.ytimg.com/vi/T6eK-2OQtew/hqdefault.jpg',
  },
];

interface HomeViewProps {
  onSelectArtist: (artist: FeaturedArtist) => void;
  onNavigate?: (view: string) => void;
  onOpenManifesto: () => void;
  onOpenApiExplorer: () => void;
  onOpenVisualizer?: () => void;
  onOpenEqualizer?: () => void;
  isMobile?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectArtist,
  onNavigate,
  isMobile = false,
}) => {
  const {
    currentTrack,
    isPlaying,
    likedIds,
    catalogTracks,
    playTrack,
    playAll,
    toggleLike,
    addToQueue,
  } = useMusicPlayer();

  const [featuredArtists, setFeaturedArtists] = useState<FeaturedArtist[]>(INITIAL_FEATURED_ARTISTS);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'music' | 'afrobeats' | 'global'>('all');
  const [ambientGradient, setAmbientGradient] = useState<string>('from-[#1e3264]/45');

  const [showAllArtists, setShowAllArtists] = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);
  const [showAllMixes, setShowAllMixes] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/api/featured_artists'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setFeaturedArtists(data);
      })
      .catch((err) => console.warn('[Featured Artists] fetch error:', err));

    fetch(apiUrl('/api/trending'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setTrendingTracks(data);
      })
      .catch((err) => console.warn('[Trending Tracks] fetch error:', err));
  }, []);

  const effectiveTrending = trendingTracks.length > 0 ? trendingTracks : catalogTracks;
  const afrobeatsNames = ['Bien', 'Sauti Sol', 'Burna Boy', 'Ayra Starr', 'Asake', 'Tems', 'Rema'];

  const handleOpenArtistByName = (rawArtistName: string, fallbackImage?: string) => {
    const primaryName = rawArtistName.split(/\s+(?:ft\.|feat\.|x|&)\s+/i)[0].trim() || rawArtistName;
    const match = featuredArtists.find(
      (a) =>
        a.name.toLowerCase() === primaryName.toLowerCase() ||
        rawArtistName.toLowerCase().includes(a.name.toLowerCase())
    );
    if (match) {
      onSelectArtist(match);
    } else {
      onSelectArtist({
        name: primaryName,
        monthly_listeners: '8,450,000',
        origin: 'Global Recording Artist',
        bio: `${primaryName} official discography, top tracks, and full-length releases.`,
        image: fallbackImage || getArtistAvatarFallback(primaryName),
      });
    }
  };

  const filteredArtists =
    activeFilter === 'afrobeats'
      ? featuredArtists.filter((a) => afrobeatsNames.includes(a.name))
      : activeFilter === 'global'
      ? featuredArtists.filter((a) => !afrobeatsNames.includes(a.name))
      : featuredArtists;

  const filteredTracks =
    activeFilter === 'afrobeats'
      ? effectiveTrending.filter((t) =>
          afrobeatsNames.some((n) => t.artist.toLowerCase().includes(n.toLowerCase()))
        )
      : activeFilter === 'global'
      ? effectiveTrending.filter(
          (t) => !afrobeatsNames.some((n) => t.artist.toLowerCase().includes(n.toLowerCase()))
        )
      : effectiveTrending;

  const quickPickTracks = (filteredTracks.length > 0 ? filteredTracks : effectiveTrending).slice(0, 7);

  // Curated Daily Mixes & Radio Shelves (Spotify "Made For You" style)
  const curatedMixes = [
    {
      id: 'mix-afrobeats',
      title: 'Afrobeats Mix',
      subtitle: 'Asake, Burna Boy, Ayra Starr and more',
      badge: 'Daily Mix 1',
      cover: 'https://i.ytimg.com/vi/bbVZo4Yw7pI/hqdefault.jpg',
      accent: '#1ed760',
      tracks: effectiveTrending.filter((t) =>
        ['Asake', 'Burna Boy', 'Ayra Starr', 'Rema', 'Tems'].some((n) =>
          t.artist.toLowerCase().includes(n.toLowerCase())
        )
      ),
    },
    {
      id: 'mix-nairobi',
      title: 'East African Soul Radio',
      subtitle: 'Bien, Sauti Sol and acoustic Afro-fusion',
      badge: 'Artist Radio',
      cover: 'https://i.ytimg.com/vi/Or2sMfOcTtw/hqdefault.jpg',
      accent: '#ffc864',
      tracks: effectiveTrending.filter((t) =>
        ['Bien', 'Sauti Sol', 'Tems'].some((n) =>
          t.artist.toLowerCase().includes(n.toLowerCase())
        )
      ),
    },
    {
      id: 'mix-hiphop',
      title: 'Hip-Hop & Grime Mix',
      subtitle: 'Kendrick Lamar, Stormzy, Travis Scott and Drake',
      badge: 'Daily Mix 2',
      cover: 'https://i.ytimg.com/vi/T6eK-2OQtew/hqdefault.jpg',
      accent: '#eb1e32',
      tracks: effectiveTrending.filter((t) =>
        ['Kendrick', 'Stormzy', 'Travis', 'Drake'].some((n) =>
          t.artist.toLowerCase().includes(n.toLowerCase())
        )
      ),
    },
    {
      id: 'mix-late-night',
      title: 'Late Night R&B & Synth',
      subtitle: 'The Weeknd, Tems, Drake and Sauti Sol',
      badge: 'Daily Mix 3',
      cover: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
      accent: '#509bf5',
      tracks: effectiveTrending.filter((t) =>
        ['Weeknd', 'Tems', 'Drake', 'Sauti Sol'].some((n) =>
          t.artist.toLowerCase().includes(n.toLowerCase())
        )
      ),
    },
    {
      id: 'mix-global-hits',
      title: 'Today’s Top Hits',
      subtitle: 'The biggest tracks streaming right now',
      badge: 'Featured',
      cover: 'https://i.ytimg.com/vi/421w1j87fEM/hqdefault.jpg',
      accent: '#f573a0',
      tracks: effectiveTrending.slice(0, 8),
    },
    {
      id: 'mix-club',
      title: 'Street Pop & Amapiano',
      subtitle: 'High-energy basslines from Lagos to London',
      badge: 'Daily Mix 4',
      cover: 'https://i.ytimg.com/vi/crtQSTYWtqE/hqdefault.jpg',
      accent: '#a56752',
      tracks: [...effectiveTrending].reverse().slice(0, 7),
    },
  ];

  const displayedArtists = showAllArtists ? filteredArtists : filteredArtists.slice(0, 6);
  const displayedAlbums = showAllAlbums ? filteredTracks : filteredTracks.slice(0, 6);
  const displayedMixes = showAllMixes ? curatedMixes : curatedMixes.slice(0, 6);

  return (
    <div className="relative min-h-full pb-12 text-white">
      {/* Dynamic Spotify-Style Ambient Top Gradient */}
      <div
        className={`absolute inset-x-0 top-0 h-80 bg-gradient-to-b ${ambientGradient} via-[#121212]/60 to-[#121212] pointer-events-none transition-colors duration-700`}
      />

      {/* Sticky Category Filter Bar (All / Music / Afrobeats / Global) */}
      <div className="sticky top-0 z-20 px-4 sm:px-6 py-3.5 bg-[#121212]/90 backdrop-blur-md flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'all', label: 'All' },
          { id: 'music', label: 'Music' },
          { id: 'afrobeats', label: 'Afrobeats' },
          { id: 'global', label: 'Hip-Hop & Pop' },
        ].map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white text-black'
                  : 'bg-white/[0.08] text-white hover:bg-white/[0.14]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="relative z-10 px-4 sm:px-6 space-y-8">
        {/* 1. SPOTIFY TOP 8 HORIZONTAL QUICK-PICK GRID */}
        <section className={isMobile ? "grid grid-cols-2 gap-2 pt-1" : "grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-1"}>
          {/* Card 0: Liked Songs Tile */}
          <div
            onMouseEnter={() => setAmbientGradient(AMBIENT_COLORS[2])}
            onClick={() => {
              if (onNavigate) onNavigate('liked');
            }}
            className="group h-14 rounded-md bg-white/[0.07] hover:bg-white/[0.16] transition-colors flex items-center justify-between pr-2 sm:pr-3 overflow-hidden cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 h-full">
              <div className="w-14 h-14 bg-gradient-to-br from-[#450af5] via-[#8e8ee5] to-[#c4efd9] flex items-center justify-center shrink-0 shadow-md">
                <Heart className="w-6 h-6 fill-white text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-bold text-xs sm:text-sm text-white truncate">
                  Liked Songs
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const likedTracks = effectiveTrending.filter((t) =>
                  likedIds.includes(t.video_id || t.id || '')
                );
                if (likedTracks.length > 0) {
                  playAll(likedTracks);
                } else if (effectiveTrending.length > 0) {
                  playAll(effectiveTrending);
                }
              }}
              className="hidden sm:flex w-9 h-9 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.4)] opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 transition-all shrink-0"
              title="Play Liked Songs"
            >
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            </button>
          </div>

          {/* Cards 1..7: Top Quick Pick Tracks */}
          {quickPickTracks.map((track, idx) => {
            const trackId = track.video_id || track.id || '';
            const isCurrent = (currentTrack?.video_id || currentTrack?.id) === trackId;
            const isTrackPlaying = isCurrent && isPlaying;

            return (
              <div
                key={`qp-${trackId}-${idx}`}
                onMouseEnter={() =>
                  setAmbientGradient(AMBIENT_COLORS[(idx + 1) % AMBIENT_COLORS.length])
                }
                onClick={() => playTrack(track)}
                className="group h-14 rounded-md bg-white/[0.07] hover:bg-white/[0.16] transition-colors flex items-center justify-between pr-2 sm:pr-3 overflow-hidden cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 h-full">
                  <img
                    src={track.thumbnail || `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg`}
                    alt={track.title}
                    className="w-14 h-14 object-cover shrink-0 shadow-md bg-[#181818]"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_COVER_FALLBACK;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className={`block font-bold text-xs sm:text-sm truncate ${
                        isCurrent ? 'text-[#1ed760]' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playTrack(track);
                  }}
                  className={`hidden sm:flex w-9 h-9 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-all shrink-0 ${
                    isTrackPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title={isTrackPlaying ? 'Pause' : `Play ${track.title}`}
                >
                  {isTrackPlaying ? (
                    <Pause className="w-4 h-4 fill-black text-black" />
                  ) : (
                    <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </section>

        {/* 2. POPULAR ARTISTS (Spotify Circular Portrait Shelf) */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2
              onClick={() => setShowAllArtists(!showAllArtists)}
              className="text-xl md:text-2xl font-bold text-white tracking-tight hover:underline cursor-pointer"
            >
              Popular artists
            </h2>
            {filteredArtists.length > 6 && (
              <button
                onClick={() => setShowAllArtists(!showAllArtists)}
                className="text-xs font-bold text-[#b3b3b3] hover:underline whitespace-nowrap shrink-0"
              >
                {showAllArtists ? 'Show less' : 'Show all'}
              </button>
            )}
          </div>

          <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"}>
            {displayedArtists.map((artist) => (
              <div
                key={artist.name}
                onClick={() => onSelectArtist(artist)}
                className="group p-3 rounded-lg bg-[#181818]/60 hover:bg-[#1f1f1f] transition-colors cursor-pointer flex flex-col min-h-[195px]"
              >
                <div className="relative w-full aspect-square min-h-[120px] mb-3 shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.5)] bg-[#181818]">
                    <img
                      src={artist.image || getArtistAvatarFallback(artist.name)}
                      alt={artist.name}
                      className="w-full h-full object-cover block"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getArtistAvatarFallback(artist.name);
                      }}
                    />
                  </div>

                  {/* Floating Spotify Green Play Button (desktop hover only so mobile tap always opens Artist Profile) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const artistTracks = effectiveTrending.filter((t) =>
                        t.artist.toLowerCase().includes(artist.name.toLowerCase())
                      );
                      if (artistTracks.length > 0) {
                        playAll(artistTracks);
                      } else {
                        onSelectArtist(artist);
                      }
                    }}
                    className="hidden md:flex absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.45)] translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105 active:scale-95 transition-all duration-200"
                    title={`Play ${artist.name}`}
                  >
                    <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                  </button>
                </div>

                <div className="min-w-0 flex-1 flex flex-col justify-end">
                  <h3 className="font-bold text-sm text-white truncate">{artist.name}</h3>
                  <p className="text-xs text-[#b3b3b3] mt-1">Artist</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. POPULAR ALBUMS AND SINGLES (Spotify Square Card Shelf) */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2
              onClick={() => setShowAllAlbums(!showAllAlbums)}
              className="text-xl md:text-2xl font-bold text-white tracking-tight hover:underline cursor-pointer"
            >
              Popular albums and singles
            </h2>
            {filteredTracks.length > 6 && (
              <button
                onClick={() => setShowAllAlbums(!showAllAlbums)}
                className="text-xs font-bold text-[#b3b3b3] hover:underline whitespace-nowrap shrink-0"
              >
                {showAllMixes ? 'Show less' : 'Show all'}
              </button>
            )}
          </div>

          <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"}>
            {displayedAlbums.map((track) => {
              const trackId = track.video_id || track.id || '';
              const isCurrent = (currentTrack?.video_id || currentTrack?.id) === trackId;
              const isTrackPlaying = isCurrent && isPlaying;

              return (
                <div
                  key={`alb-${trackId}`}
                  onClick={() => playTrack(track)}
                  className="group p-3 rounded-lg bg-[#181818]/60 hover:bg-[#1f1f1f] transition-colors cursor-pointer flex flex-col min-h-[200px]"
                >
                  <div className="relative w-full aspect-square min-h-[120px] mb-3 shrink-0 rounded-md overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.5)] bg-[#181818]">
                    <img
                      src={track.thumbnail || `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg`}
                      alt={track.title}
                      className="w-full h-full object-cover block"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_COVER_FALLBACK;
                      }}
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playTrack(track);
                      }}
                      className={`absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.45)] hover:scale-105 active:scale-95 transition-all duration-200 ${
                        isTrackPlaying
                          ? 'translate-y-0 opacity-100'
                          : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
                      }`}
                      title={isTrackPlaying ? 'Pause' : `Play ${track.title}`}
                    >
                      {isTrackPlaying ? (
                        <Pause className="w-5 h-5 fill-black text-black" />
                      ) : (
                        <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                      )}
                    </button>
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-end">
                    <h3
                      className={`font-bold text-sm truncate ${
                        isCurrent ? 'text-[#1ed760]' : 'text-white'
                      }`}
                    >
                      {track.album && track.album !== 'Single' ? track.album : track.title}
                    </h3>
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenArtistByName(track.artist, track.thumbnail);
                      }}
                      className="text-xs text-[#b3b3b3] hover:text-white hover:underline mt-1 truncate cursor-pointer"
                    >
                      {track.artist}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. MADE FOR YOU / DAILY MIXES (Spotify Editorial Mix Shelf) */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2
              onClick={() => setShowAllMixes(!showAllMixes)}
              className="text-xl md:text-2xl font-bold text-white tracking-tight hover:underline cursor-pointer"
            >
              Made For You
            </h2>
            <button
              onClick={() => setShowAllMixes(!showAllMixes)}
              className="text-xs font-bold text-[#b3b3b3] hover:underline whitespace-nowrap shrink-0"
            >
              {showAllMixes ? 'Show less' : 'Show all'}
            </button>
          </div>

          <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"}>
            {displayedMixes.map((mix) => (
              <div
                key={mix.id}
                onClick={() => {
                  if (mix.tracks.length > 0) {
                    playAll(mix.tracks);
                  } else if (effectiveTrending.length > 0) {
                    playAll(effectiveTrending);
                  }
                }}
                className="group p-3 rounded-lg bg-[#181818]/60 hover:bg-[#1f1f1f] transition-colors cursor-pointer flex flex-col min-h-[210px]"
              >
                <div className="relative w-full aspect-square min-h-[120px] mb-3 shrink-0 rounded-md overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.5)] bg-[#181818]">
                  <img
                    src={mix.cover}
                    alt={mix.title}
                    className="w-full h-full object-cover block"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_COVER_FALLBACK;
                    }}
                  />
                  {/* Bottom Accent Bar like Spotify Daily Mixes */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-1.5"
                    style={{ backgroundColor: mix.accent }}
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-tight">
                    {mix.badge}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (mix.tracks.length > 0) {
                        playAll(mix.tracks);
                      } else if (effectiveTrending.length > 0) {
                        playAll(effectiveTrending);
                      }
                    }}
                    className="absolute bottom-2.5 right-2 w-11 h-11 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.45)] translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105 active:scale-95 transition-all duration-200"
                    title={`Play ${mix.title}`}
                  >
                    <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                  </button>
                </div>

                <div className="min-w-0 flex-1 flex flex-col justify-end">
                  <h3 className="font-bold text-sm text-white truncate">{mix.title}</h3>
                  <p className="text-xs text-[#b3b3b3] mt-1 line-clamp-2 leading-relaxed">
                    {mix.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. TRENDING TRACKS TABLE (Spotify Popular List) */}
        <section className="space-y-3 pt-2">
          <div className="flex items-end justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Trending songs
            </h2>
            <button
              onClick={() => playAll(filteredTracks.length > 0 ? filteredTracks : effectiveTrending)}
              className="text-xs font-bold text-[#b3b3b3] hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Play all
            </button>
          </div>

          <div className="w-full select-none">
            <div
              className={`grid ${
                isMobile
                  ? 'grid-cols-[28px_minmax(0,1fr)_auto] gap-2.5 px-2.5'
                  : 'grid-cols-[28px_minmax(0,1fr)_auto] md:grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_100px] gap-2.5 md:gap-4 px-2.5 md:px-4'
              } py-2 border-b border-white/10 text-xs font-medium text-[#b3b3b3]`}
            >
              <div className="text-center">#</div>
              <div className="min-w-0">Title</div>
              {!isMobile && <div className="hidden md:block min-w-0">Album</div>}
              <div className="text-right flex items-center justify-end">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-1 space-y-0.5">
              {(filteredTracks.length > 0 ? filteredTracks : effectiveTrending).map((track, idx) => {
                const trackId = track.video_id || track.id || '';
                const isCurrent = (currentTrack?.video_id || currentTrack?.id) === trackId;
                const isLiked = likedIds.includes(trackId);
                const thumb = track.thumbnail || `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg`;

                return (
                  <div
                    key={`row-${trackId}-${idx}`}
                    onClick={() => playTrack(track)}
                    className={`group grid ${
                      isMobile
                        ? 'grid-cols-[28px_minmax(0,1fr)_auto] gap-2.5 px-2.5'
                        : 'grid-cols-[28px_minmax(0,1fr)_auto] md:grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_100px] gap-2.5 md:gap-4 px-2.5 md:px-4'
                    } py-2 rounded-md items-center text-sm hover:bg-white/[0.08] transition-colors cursor-pointer`}
                  >
                    <div className="text-center flex items-center justify-center">
                      <span
                        className={`tabular-nums text-xs ${
                          isCurrent ? 'hidden' : 'group-hover:hidden'
                        } text-[#b3b3b3]`}
                      >
                        {idx + 1}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playTrack(track);
                        }}
                        className={`w-6 h-6 flex items-center justify-center ${
                          isCurrent ? 'text-[#1ed760]' : 'hidden group-hover:flex text-white'
                        }`}
                      >
                        {isCurrent && isPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                      <img
                        src={thumb}
                        alt={track.title}
                        className="w-10 h-10 rounded object-cover shrink-0 bg-[#181818]"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_COVER_FALLBACK;
                        }}
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p
                          className={`font-semibold text-sm truncate ${
                            isCurrent ? 'text-[#1ed760]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenArtistByName(track.artist, thumb);
                          }}
                          className="text-xs text-[#b3b3b3] hover:text-white hover:underline truncate cursor-pointer mt-0.5"
                        >
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {!isMobile && (
                      <div className="hidden md:block min-w-0 truncate text-xs text-[#b3b3b3]">
                        {track.album || 'Single'}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1.5 sm:gap-3 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(trackId, track);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isLiked
                            ? 'text-[#1ed760]'
                            : 'opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-[#b3b3b3] hover:text-white'
                        }`}
                        title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1ed760]' : ''}`} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToQueue(track);
                        }}
                        className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 p-1 text-[#b3b3b3] hover:text-white rounded transition-opacity"
                        title="Add to queue"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      <span className="font-mono text-xs text-[#b3b3b3] tabular-nums w-9 sm:w-10 text-right">
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
