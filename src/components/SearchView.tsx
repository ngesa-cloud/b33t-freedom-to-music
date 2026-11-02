import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Loader2,
  Sparkles,
  Filter,
  Music,
  Play,
  Pause,
  Heart,
  Disc,
  Radio,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  Track,
  FeaturedArtist,
  StructuredSearchResponse,
  SearchTopResult,
  SearchArtistResult,
  SearchAlbumResult,
} from '../types/music';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { TrackTable } from './TrackTable';

interface SearchViewProps {
  initialQuery?: string;
  onArtistClick?: (artist: string) => void;
  onSelectArtist?: (artist: FeaturedArtist) => void;
}

const GENRE_PILLS = [
  'Afropop',
  'Afrobeats',
  'Amapiano',
  'Hip-Hop',
  'Alté',
  'Synthwave',
  'Grime',
  'R&B',
];

const SEARCH_TABS = [
  { id: 'all', label: 'All' },
  { id: 'songs', label: 'Songs' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
] as const;

type SearchTab = (typeof SEARCH_TABS)[number]['id'];

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

const DEFAULT_TRACK_THUMBNAIL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%231a1a20"/><text x="50%" y="54%" font-family="sans-serif" font-weight="bold" font-size="24" fill="%231DB954" text-anchor="middle" dominant-baseline="middle">♪</text></svg>`;

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec < 0) return '3:30';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const SearchView: React.FC<SearchViewProps> = ({
  initialQuery = '',
  onArtistClick,
  onSelectArtist,
}) => {
  const { currentTrack, isPlaying, likedIds, playTrack, playAll, toggleLike, addToQueue, togglePlay } =
    useMusicPlayer();

  const handlePlayAlbum = async (alb: SearchAlbumResult, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        `/api/album/${encodeURIComponent(alb.id)}/tracks?artist=${encodeURIComponent(
          alb.artist
        )}&album=${encodeURIComponent(alb.title)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
          const mapped: Track[] = data.tracks.map((t: any) => ({
            video_id: t.video_id || '',
            id: t.id || String(Math.random()),
            title: t.title,
            artist: t.artist || alb.artist,
            album: alb.title,
            duration: t.duration || 210,
            thumbnail: alb.thumbnail || t.thumbnail,
          }));
          playAll(mapped);
          return;
        }
      }
    } catch {}

    const matching = songs.filter((s) => s.artist.toLowerCase() === alb.artist.toLowerCase());
    if (matching.length > 0) {
      playAll(matching);
    }
  };

  const [query, setQuery] = useState<string>(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');

  // Structured response state
  const [topResult, setTopResult] = useState<SearchTopResult | null>(null);
  const [artists, setArtists] = useState<SearchArtistResult[]>([]);
  const [songs, setSongs] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<SearchAlbumResult[]>([]);

  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Synchronize when initialQuery changes from TopNav
  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
      setDebouncedQuery(initialQuery);
    }
  }, [initialQuery]);

  // 300ms Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Execute Search on debounced query
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setTopResult(null);
      setArtists([]);
      setSongs([]);
      setAlbums([]);
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const performSearch = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (Array.isArray(data)) {
              // Legacy array fallback
              setSongs(data);
              setSuggestions(data.slice(0, 5));
              setTopResult(data[0] ? { type: 'song', ...data[0], subtitle: `Song • ${data[0].artist}` } : null);
              setArtists([]);
              setAlbums([]);
            } else {
              // New Structured Intent-Aware Payload
              const payload = data as StructuredSearchResponse;
              setTopResult(payload.topResult || null);
              setArtists(payload.artists || []);
              setSongs(payload.songs || []);
              setAlbums(payload.albums || []);
              setSuggestions((payload.songs || []).slice(0, 5));
            }
          }
        }
      } catch (err) {
        console.warn('[Search] fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    performSearch();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Click outside closes auto-suggest dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePillClick = (genre: string) => {
    setQuery(genre);
    setDebouncedQuery(genre);
    setShowSuggestions(false);
  };

  const navigateArtist = (artistObj: { name: string; image?: string; monthly_listeners?: string; origin?: string; bio?: string }) => {
    if (onSelectArtist) {
      onSelectArtist({
        name: artistObj.name,
        monthly_listeners: artistObj.monthly_listeners || '8.4M',
        origin: artistObj.origin || 'Global',
        bio: artistObj.bio || `${artistObj.name} recording discography and releases.`,
        image: artistObj.image || getArtistAvatarFallback(artistObj.name),
      });
    } else if (onArtistClick) {
      onArtistClick(artistObj.name);
    }
  };

  const handleTopResultPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!topResult) return;
    if (topResult.type === 'artist') {
      if (topResult.topTrack) {
        playTrack(topResult.topTrack);
      } else if (songs.length > 0) {
        playTrack(songs[0]);
      }
    } else {
      const trackToPlay: Track = topResult.topTrack || {
        video_id: topResult.video_id || topResult.id,
        title: topResult.title || topResult.name || 'Song',
        artist: topResult.artist || 'Artist',
        album: 'Single',
        duration: topResult.duration || 210,
        thumbnail: topResult.thumbnail || topResult.image,
      };
      playTrack(trackToPlay);
    }
  };

  const isCurrentTopTrackPlaying =
    topResult &&
    isPlaying &&
    (currentTrack?.video_id === (topResult.topTrack?.video_id || topResult.id));

  const hasResults = Boolean(topResult || songs.length > 0 || artists.length > 0 || albums.length > 0);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Debounced Search Input */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1DB954]">
            <Sparkles className="w-4 h-4" />
            <span>DeepSeek Intent-Aware Search Hierarchy</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Search Freedom Catalog
          </h1>
          <p className="text-xs text-[#8a8a92]">
            Adaptive Artist Profiles, Top Songs, Albums, and Opus 251 High-Fidelity Audio
          </p>
        </div>

        {/* Search Input Box & Auto-Suggest Dropdown */}
        <div ref={searchContainerRef} className="relative max-w-xl">
          <div className="relative">
            <Search className="w-5 h-5 text-[#8a8a92] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search artists, songs, Bien, Stormzy, Burna Boy, Drake..."
              className="w-full bg-[#121216] border border-[#1e1e24] focus:border-[#1DB954] rounded-2xl py-3 pl-12 pr-10 text-sm text-white placeholder-[#8a8a92] focus:outline-none transition-colors shadow-inner"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="w-4 h-4 text-[#1DB954] animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Auto-Suggest Dropdown */}
          {showSuggestions && suggestions.length > 0 && query.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[#121216] border border-[#1e1e24] rounded-xl shadow-2xl overflow-hidden z-40 divide-y divide-[#1e1e24]">
              {suggestions.map((item) => (
                <div
                  key={item.video_id}
                  onClick={() => {
                    playTrack(item);
                    setShowSuggestions(false);
                  }}
                  className="p-3 hover:bg-[#1a1a20] cursor-pointer flex items-center gap-3 transition-colors"
                >
                  <img
                    src={item.thumbnail || `https://i.ytimg.com/vi/${item.video_id}/hqdefault.jpg`}
                    alt={item.title}
                    className="w-10 h-10 rounded object-cover shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_TRACK_THUMBNAIL;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-[#8a8a92] truncate">{item.artist}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#1DB954] uppercase px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/20">
                    Play
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Filter Tabs: All, Songs, Artists, Albums */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-b border-[#1e1e24]/60 pb-3">
          <div className="flex items-center gap-2">
            {SEARCH_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-black shadow-md scale-105'
                    : 'bg-[#121216] text-[#8a8a92] hover:bg-[#1a1a20] hover:text-white border border-[#1e1e24]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Genre Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <Filter className="w-3.5 h-3.5 text-[#8a8a92] shrink-0 mr-1" />
            {GENRE_PILLS.map((genre) => (
              <button
                key={genre}
                onClick={() => handlePillClick(genre)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                  query.toLowerCase() === genre.toLowerCase()
                    ? 'bg-[#1DB954] text-black font-bold shadow'
                    : 'bg-[#16161c] text-[#8a8a92] hover:bg-[#1f1f28] hover:text-white border border-[#1e1e24]'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Search View Content */}
      {hasResults && (
        <div className="space-y-10">
          {/* TAB 1: ALL (Spotify Intent Hierarchy) */}
          {activeTab === 'all' && (
            <>
              {/* TOP SECTION: Top Result (Left) + Top 4 Songs (Right) */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* 1. TOP RESULT CARD */}
                {topResult && (
                  <div className="lg:col-span-5 flex flex-col space-y-3">
                    <h2 className="text-xl font-bold text-white tracking-tight">Top result</h2>

                    <div
                      onClick={() => {
                        if (topResult.type === 'artist') {
                          navigateArtist({
                            name: topResult.name || 'Artist',
                            image: topResult.image,
                            monthly_listeners: topResult.monthly_listeners,
                            origin: topResult.origin,
                            bio: topResult.bio,
                          });
                        } else if (topResult.topTrack) {
                          playTrack(topResult.topTrack);
                        }
                      }}
                      className="group relative p-6 rounded-2xl bg-[#121216] hover:bg-[#181822] border border-[#1e1e24] hover:border-white/10 transition-all cursor-pointer shadow-xl flex flex-col justify-between min-h-[240px]"
                    >
                      <div>
                        {/* Artwork: Round for Artist, Rounded Square for Song */}
                        <div
                          className={`overflow-hidden shadow-2xl border border-white/10 mb-5 relative ${
                            topResult.type === 'artist'
                              ? 'w-28 h-28 rounded-full'
                              : 'w-28 h-28 rounded-2xl'
                          }`}
                        >
                          <img
                            src={topResult.image || topResult.thumbnail || DEFAULT_TRACK_THUMBNAIL}
                            alt={topResult.name || topResult.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src =
                                topResult.type === 'artist'
                                  ? getArtistAvatarFallback(topResult.name || 'Artist')
                                  : DEFAULT_TRACK_THUMBNAIL;
                            }}
                          />
                        </div>

                        {/* Title / Name */}
                        <h3 className="text-2xl md:text-3xl font-black text-white group-hover:text-[#1DB954] transition-colors truncate">
                          {topResult.name || topResult.title}
                        </h3>

                        {/* Subtitle & Badge */}
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              topResult.type === 'artist'
                                ? 'bg-white/15 text-white'
                                : 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30'
                            }`}
                          >
                            {topResult.subtitle || (topResult.type === 'artist' ? 'Artist' : 'Song')}
                          </span>

                          {topResult.monthly_listeners && (
                            <span className="text-xs text-[#8a8a92] truncate">
                              • {topResult.monthly_listeners} monthly
                            </span>
                          )}
                        </div>

                        {topResult.bio && (
                          <p className="text-xs text-[#8a8a92] mt-2 line-clamp-2 max-w-sm">
                            {topResult.bio}
                          </p>
                        )}
                      </div>

                      {/* Floating Play Button */}
                      <button
                        onClick={handleTopResultPlay}
                        className="absolute right-6 bottom-6 w-14 h-14 rounded-full bg-[#1DB954] text-black shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                        title={`Play ${topResult.name || topResult.title}`}
                      >
                        {isCurrentTopTrackPlaying ? (
                          <Pause className="w-6 h-6 fill-black" />
                        ) : (
                          <Play className="w-6 h-6 fill-black ml-1" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. TOP SONGS (Right Column, 4 Tracks) */}
                <div className={`${topResult ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col space-y-3`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white tracking-tight">Songs</h2>
                    {songs.length > 4 && (
                      <button
                        onClick={() => setActiveTab('songs')}
                        className="text-xs font-semibold text-[#8a8a92] hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <span>See all</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="bg-[#121216] border border-[#1e1e24] rounded-2xl p-2 divide-y divide-[#1e1e24]/40 shadow-inner">
                    {songs.slice(0, 4).map((song, idx) => {
                      const songId = song.video_id || song.id || '';
                      const isCurrent = (currentTrack?.video_id || currentTrack?.id) === songId;
                      const isLiked = likedIds.includes(songId);

                      return (
                        <div
                          key={`${songId}-${idx}`}
                          className={`group flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-white/[0.08] text-[#1DB954]'
                              : 'hover:bg-white/[0.04] text-zinc-200'
                          }`}
                          onClick={() => playTrack(song)}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            {/* Track Thumbnail with Hover Play */}
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow border border-white/5">
                              <img
                                src={song.thumbnail || `https://i.ytimg.com/vi/${songId}/hqdefault.jpg`}
                                alt={song.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = DEFAULT_TRACK_THUMBNAIL;
                                }}
                              />
                              <div
                                className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                                  isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                              >
                                {isCurrent && isPlaying ? (
                                  <Pause className="w-4 h-4 fill-[#1DB954] text-[#1DB954]" />
                                ) : (
                                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                                )}
                              </div>
                            </div>

                            {/* Title & Artist */}
                            <div className="min-w-0 pr-2">
                              <p
                                className={`font-bold text-sm truncate ${
                                  isCurrent ? 'text-[#1DB954]' : 'text-white'
                                }`}
                              >
                                {song.title}
                              </p>
                              <p className="text-xs text-[#8a8a92] truncate mt-0.5">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateArtist({ name: song.artist });
                                  }}
                                  className="hover:text-white hover:underline cursor-pointer"
                                >
                                  {song.artist}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Duration & Like Button */}
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLike(songId);
                              }}
                              className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
                                isLiked
                                  ? 'text-[#1DB954]'
                                  : 'opacity-0 group-hover:opacity-100 text-[#8a8a92] hover:text-white'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
                            </button>
                            <span className="font-mono text-xs text-[#8a8a92] tabular-nums w-10 text-right">
                              {formatDuration(song.duration)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* ARTISTS ROW */}
              {artists.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white tracking-tight">Artists</h2>
                    {artists.length > 6 && (
                      <button
                        onClick={() => setActiveTab('artists')}
                        className="text-xs font-semibold text-[#8a8a92] hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <span>See all</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {artists.slice(0, 6).map((art) => (
                      <div
                        key={art.id}
                        onClick={() => navigateArtist(art)}
                        className="group p-4 rounded-2xl bg-[#121216] hover:bg-[#1a1a24] border border-[#1e1e24] hover:border-white/10 transition-all cursor-pointer flex flex-col items-center text-center shadow-lg"
                      >
                        <div className="w-24 h-24 rounded-full overflow-hidden mb-3.5 shadow-xl group-hover:scale-105 transition-transform border border-white/10 relative">
                          <img
                            src={art.image}
                            alt={art.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getArtistAvatarFallback(art.name);
                            }}
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg">
                              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                            </div>
                          </div>
                        </div>

                        <h3 className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors truncate w-full">
                          {art.name}
                        </h3>
                        <span className="text-[11px] font-semibold text-[#8a8a92] mt-0.5">
                          Artist
                        </span>
                        {art.monthly_listeners && (
                          <span className="text-[10px] text-zinc-500 mt-1 truncate">
                            {art.monthly_listeners} monthly
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ALBUMS ROW */}
              {albums.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white tracking-tight">Albums</h2>
                    {albums.length > 6 && (
                      <button
                        onClick={() => setActiveTab('albums')}
                        className="text-xs font-semibold text-[#8a8a92] hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <span>See all</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {albums.slice(0, 6).map((alb) => (
                      <div
                        key={alb.id}
                        onClick={() => navigateArtist({ name: alb.artist })}
                        className="group p-4 rounded-2xl bg-[#121216] hover:bg-[#1a1a24] border border-[#1e1e24] hover:border-white/10 transition-all cursor-pointer shadow-lg"
                      >
                        <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 shadow-xl group-hover:scale-105 transition-transform border border-white/10 relative">
                          <img
                            src={alb.thumbnail}
                            alt={alb.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = DEFAULT_TRACK_THUMBNAIL;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <button
                              onClick={(e) => handlePlayAlbum(alb, e)}
                              className="w-11 h-11 rounded-full bg-[#1DB954] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                              title={`Play ${alb.title}`}
                            >
                              <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors truncate">
                          {alb.title}
                        </h3>
                        <p className="text-xs text-[#8a8a92] truncate mt-0.5">
                          {alb.year} • {alb.artist}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* REMAINING TRACKS TABLE (Songs 4+) */}
              {songs.length > 4 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Featuring & More Tracks
                    </h2>
                    <span className="text-xs text-[#8a8a92] font-mono">
                      {songs.length - 4} more results
                    </span>
                  </div>

                  <div className="bg-[#121216] border border-[#1e1e24] rounded-2xl p-2 shadow-inner">
                    <TrackTable
                      tracks={songs.slice(4)}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      likedTrackIds={likedIds}
                      onPlayTrack={playTrack}
                      onToggleLike={toggleLike}
                      onAddToQueue={addToQueue}
                      onArtistClick={(art) => navigateArtist({ name: art })}
                    />
                  </div>
                </section>
              )}
            </>
          )}

          {/* TAB 2: SONGS ONLY */}
          {activeTab === 'songs' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  All Songs ({songs.length})
                </h2>
              </div>
              <div className="bg-[#121216] border border-[#1e1e24] rounded-2xl p-2 shadow-inner">
                <TrackTable
                  tracks={songs}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  likedTrackIds={likedIds}
                  onPlayTrack={playTrack}
                  onToggleLike={toggleLike}
                  onAddToQueue={addToQueue}
                  onArtistClick={(art) => navigateArtist({ name: art })}
                />
              </div>
            </section>
          )}

          {/* TAB 3: ARTISTS ONLY */}
          {activeTab === 'artists' && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Artists ({artists.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                {artists.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => navigateArtist(art)}
                    className="group p-5 rounded-2xl bg-[#121216] hover:bg-[#1a1a24] border border-[#1e1e24] hover:border-white/10 transition-all cursor-pointer flex flex-col items-center text-center shadow-lg"
                  >
                    <div className="w-28 h-28 rounded-full overflow-hidden mb-4 shadow-xl group-hover:scale-105 transition-transform border border-white/10 relative">
                      <img
                        src={art.image}
                        alt={art.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getArtistAvatarFallback(art.name);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-11 h-11 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors truncate w-full">
                      {art.name}
                    </h3>
                    <span className="text-xs text-[#8a8a92] mt-0.5">Artist</span>
                    {art.monthly_listeners && (
                      <span className="text-[11px] text-zinc-500 mt-1 truncate">
                        {art.monthly_listeners} monthly
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 4: ALBUMS ONLY */}
          {activeTab === 'albums' && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Albums ({albums.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                {albums.map((alb) => (
                  <div
                    key={alb.id}
                    onClick={() => navigateArtist({ name: alb.artist })}
                    className="group p-4 rounded-2xl bg-[#121216] hover:bg-[#1a1a24] border border-[#1e1e24] hover:border-white/10 transition-all cursor-pointer shadow-lg"
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden mb-3.5 shadow-xl group-hover:scale-105 transition-transform border border-white/10 relative">
                      <img
                        src={alb.thumbnail}
                        alt={alb.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_TRACK_THUMBNAIL;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <button
                          onClick={(e) => handlePlayAlbum(alb, e)}
                          className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                          title={`Play ${alb.title}`}
                        >
                          <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors truncate">
                      {alb.title}
                    </h3>
                    <p className="text-xs text-[#8a8a92] truncate mt-0.5">
                      {alb.year} • {alb.artist}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Empty State / Initial Prompt */}
      {!hasResults && !isLoading && (
        <section className="py-16 text-center text-[#8a8a92] space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#121216] border border-[#1e1e24] flex items-center justify-center mx-auto shadow-xl">
            <Music className="w-8 h-8 text-zinc-500 stroke-[1.5]" />
          </div>
          <p className="text-lg font-bold text-white">Explore any music track, artist, or album</p>
          <p className="text-xs text-[#8a8a92] max-w-md mx-auto">
            Type an artist like Stormzy, Bien, Sauti Sol, Burna Boy, or click any genre pill above to stream official audio without ads.
          </p>
        </section>
      )}
    </div>
  );
};
