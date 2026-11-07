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
import { useMusicPlayer, apiUrl } from '../context/MusicPlayerContext';
import { TrackTable } from './TrackTable';

interface SearchViewProps {
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
  hideInlineSearch?: boolean;
  onArtistClick?: (artist: string) => void;
  onSelectArtist?: (artist: FeaturedArtist) => void;
  isMobile?: boolean;
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
  onQueryChange,
  hideInlineSearch = false,
  onArtistClick,
  onSelectArtist,
  isMobile = false,
}) => {
  const { currentTrack, isPlaying, likedIds, playTrack, playAll, toggleLike, addToQueue } =
    useMusicPlayer();

  const [query, setQuery] = useState<string>(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');

  // Structured response state
  const [topResult, setTopResult] = useState<SearchTopResult | null>(null);
  const [artists, setArtists] = useState<SearchArtistResult[]>([]);
  const [songs, setSongs] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<SearchAlbumResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resolvingIds, setResolvingIds] = useState<string[]>([]);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // On-the-fly resolver for tracks that don't yet have a pre-resolved 11-char YouTube video_id
  const resolveTrackOnTheFly = async (track: Track): Promise<Track> => {
    if (track.video_id && /^[a-zA-Z0-9_-]{11}$/.test(track.video_id.trim())) {
      return track;
    }

    const trackKey = track.id || `${track.title}-${track.artist}`;
    setResolvingIds((prev) => (prev.includes(trackKey) ? prev : [...prev, trackKey]));

    try {
      const res = await fetch(
        apiUrl(
          `/api/resolve_track?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(
            track.artist
          )}`
        )
      );
      if (res.ok) {
        const data = await res.json();
        if (data.video_id) {
          const resolvedTrack: Track = { ...track, video_id: data.video_id };
          setSongs((prev) =>
            prev.map((item) => (item.id === track.id ? resolvedTrack : item))
          );
          return resolvedTrack;
        }
      }
    } catch (err) {
      console.warn('[Search On-the-fly Resolve] error:', err);
    } finally {
      setResolvingIds((prev) => prev.filter((id) => id !== trackKey));
    }

    return track;
  };

  const handlePlayTrackOnDemand = async (track: Track) => {
    const resolved = await resolveTrackOnTheFly(track);
    playTrack(resolved);
  };

  const handleQueueTrackOnDemand = async (track: Track) => {
    const resolved = await resolveTrackOnTheFly(track);
    addToQueue(resolved);
  };

  const handlePlayAlbum = async (alb: SearchAlbumResult, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        apiUrl(
          `/api/album/${encodeURIComponent(alb.id)}/tracks?artist=${encodeURIComponent(
            alb.artist
          )}&album=${encodeURIComponent(alb.title)}`
        )
      );
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
          const mapped: Track[] = data.tracks.map((t: any, idx: number) => ({
            video_id: t.video_id || '',
            id: String(t.id || `alb-${alb.id}-${idx + 1}`),
            track_number: typeof t.track_number === 'number' ? t.track_number : idx + 1,
            title: t.title,
            artist: t.artist || alb.artist,
            album: alb.title,
            duration: t.duration || 210,
            thumbnail: alb.thumbnail || t.thumbnail,
          }));
          const firstResolved = await resolveTrackOnTheFly(mapped[0]);
          playAll([firstResolved, ...mapped.slice(1)]);
          return;
        }
      }
    } catch {}

    const matching = songs.filter((s) => s.artist.toLowerCase() === alb.artist.toLowerCase());
    if (matching.length > 0) {
      const firstResolved = await resolveTrackOnTheFly(matching[0]);
      playAll([firstResolved, ...matching.slice(1)]);
    }
  };

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
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const performSearch = async () => {
      try {
        const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(debouncedQuery)}`));
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (Array.isArray(data)) {
              setSongs(data);
              setTopResult(data[0] ? { type: 'song', ...data[0], subtitle: `Song • ${data[0].artist}` } : null);
              setArtists([]);
              setAlbums([]);
            } else {
              const payload = data as StructuredSearchResponse;
              setTopResult(payload.topResult || null);
              setArtists(payload.artists || []);
              setSongs(payload.songs || []);
              setAlbums(payload.albums || []);
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

  const handlePillClick = (genre: string) => {
    setQuery(genre);
    setDebouncedQuery(genre);
    onQueryChange?.(genre);
  };

  const navigateArtist = (artistObj: {
    name: string;
    image?: string;
    monthly_listeners?: string;
    origin?: string;
    bio?: string;
  }) => {
    const primaryName = artistObj.name
      .split(/,|&|\bfeat\.?|\bft\.?/i)[0]
      .replace(/_/g, ' ')
      .trim();
    const cleanTargetName = primaryName || artistObj.name.replace(/_/g, ' ').trim();

    const matchedArtist = artists.find(
      (a) => a.name.toLowerCase() === cleanTargetName.toLowerCase()
    );

    if (onSelectArtist) {
      onSelectArtist({
        name: matchedArtist?.name || cleanTargetName,
        monthly_listeners:
          artistObj.monthly_listeners || matchedArtist?.monthly_listeners || '1.8M',
        origin: artistObj.origin || matchedArtist?.origin || 'Global',
        bio:
          artistObj.bio ||
          matchedArtist?.bio ||
          `${cleanTargetName} recording discography and releases.`,
        image:
          artistObj.image ||
          matchedArtist?.image ||
          getArtistAvatarFallback(cleanTargetName),
      });
    } else if (onArtistClick) {
      onArtistClick(cleanTargetName);
    }
  };

  const handleTopResultPlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!topResult) return;
    if (topResult.type === 'artist') {
      const target = topResult.topTrack || songs[0];
      if (target) {
        await handlePlayTrackOnDemand(target);
      }
    } else {
      const trackToPlay: Track = topResult.topTrack || {
        video_id: topResult.video_id || topResult.id,
        id: topResult.id,
        title: topResult.title || topResult.name || 'Song',
        artist: topResult.artist || 'Artist',
        album: 'Single',
        duration: topResult.duration || 210,
        thumbnail: topResult.thumbnail || topResult.image,
      };
      await handlePlayTrackOnDemand(trackToPlay);
    }
  };

  const isCurrentTopTrackPlaying =
    topResult &&
    isPlaying &&
    Boolean(
      currentTrack &&
        ((currentTrack.video_id &&
          currentTrack.video_id === (topResult.topTrack?.video_id || topResult.id)) ||
          (currentTrack.id && currentTrack.id === (topResult.topTrack?.id || topResult.id)))
    );

  const hasResults = Boolean(topResult || songs.length > 0 || artists.length > 0 || albums.length > 0);

  return (
    <div className={isMobile ? "p-3 space-y-5 max-w-full" : "p-4 md:p-8 space-y-6 max-w-7xl mx-auto"}>
      {/* Header & Search Filter Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {query.trim() ? `Results for "${query}"` : 'Search'}
          </h1>
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#1DB954] font-mono">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching catalog...</span>
            </div>
          )}
        </div>

        {/* Inline Search Input (Shown only on mobile/layouts where TopNav omnibox is hidden) */}
        {!hideInlineSearch && (
          <div ref={searchContainerRef} className="relative max-w-xl">
            <div className="relative">
              <Search className="w-5 h-5 text-[#8a8a92] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onQueryChange?.(e.target.value);
                }}
                placeholder="Search artists, songs, albums..."
                className="w-full bg-[#121216] border border-[#1e1e24] focus:border-[#1DB954] rounded-2xl py-3 pl-12 pr-10 text-sm text-white placeholder-[#8a8a92] focus:outline-none transition-colors shadow-inner"
              />
              {isLoading && (
                <Loader2 className="w-4 h-4 text-[#1DB954] animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>
        )}

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
              <section className={isMobile ? "grid grid-cols-1 gap-4 items-start" : "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"}>
                {/* 1. TOP RESULT CARD */}
                {topResult && (
                  <div className={isMobile ? "w-full flex flex-col space-y-3" : "lg:col-span-5 flex flex-col space-y-3"}>
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
                          handlePlayTrackOnDemand(topResult.topTrack);
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
                        className="absolute right-6 bottom-6 w-14 h-14 rounded-full bg-[#1DB954] text-black shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0"
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
                <div className={`${!isMobile && topResult ? 'lg:col-span-7' : 'w-full'} flex flex-col space-y-3`}>
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
                      const isCurrent = Boolean(
                        currentTrack &&
                          ((currentTrack.video_id && currentTrack.video_id === song.video_id) ||
                            (currentTrack.id && currentTrack.id === song.id))
                      );
                      const isLiked = likedIds.includes(songId);

                      return (
                        <div
                          key={`${songId}-${idx}`}
                          className={`group flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-white/[0.08] text-[#1DB954]'
                              : 'hover:bg-white/[0.04] text-zinc-200'
                          }`}
                          onClick={() => handlePlayTrackOnDemand(song)}
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
                            <div className="flex-1 min-w-0 pr-2 overflow-hidden">
                              <p
                                className={`font-bold text-sm truncate ${
                                  isCurrent ? 'text-[#1DB954]' : 'text-white'
                                }`}
                              >
                                {song.title}
                              </p>
                              <p className="text-xs text-[#b3b3b3] truncate mt-0.5">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateArtist({ name: song.artist });
                                  }}
                                  className="text-[#b3b3b3] hover:text-white hover:underline cursor-pointer"
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
                                toggleLike(songId, song);
                              }}
                              className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
                                isLiked
                                  ? 'text-[#1DB954]'
                                  : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 text-[#b3b3b3] hover:text-white'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
                            </button>
                            <span className="font-mono text-xs text-[#b3b3b3] tabular-nums w-10 text-right">
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
                            src={art.image || getArtistAvatarFallback(art.name)}
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
                      isMobile={isMobile}
                      tracks={songs.slice(4)}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      likedTrackIds={likedIds}
                      resolvingTrackIds={resolvingIds}
                      onPlayTrack={handlePlayTrackOnDemand}
                      onToggleLike={toggleLike}
                      onAddToQueue={handleQueueTrackOnDemand}
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
                  isMobile={isMobile}
                  tracks={songs}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  likedTrackIds={likedIds}
                  resolvingTrackIds={resolvingIds}
                  onPlayTrack={handlePlayTrackOnDemand}
                  onToggleLike={toggleLike}
                  onAddToQueue={handleQueueTrackOnDemand}
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
              <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5"}>
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
              <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5"}>
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

      {/* Spotify "Browse all" Category Grid when search is empty */}
      {!hasResults && !isLoading && (
        <section className="space-y-4 pt-2">
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Browse all
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[
              { title: 'Afrobeats', query: 'Afrobeats Burna Boy Asake', bg: 'from-[#e8115b] to-[#8c0a37]', img: 'https://i.ytimg.com/vi/421w1j87fEM/hqdefault.jpg' },
              { title: 'Hip-Hop', query: 'Hip-Hop Kendrick Lamar Drake', bg: 'from-[#bc5900] to-[#733600]', img: 'https://i.ytimg.com/vi/T6eK-2OQtew/hqdefault.jpg' },
              { title: 'East African Vibes', query: 'Bien Sauti Sol', bg: 'from-[#148a08] to-[#0b4f05]', img: 'https://i.ytimg.com/vi/Or2sMfOcTtw/hqdefault.jpg' },
              { title: 'Amapiano', query: 'Amapiano Asake', bg: 'from-[#8d67ab] to-[#513866]', img: 'https://i.ytimg.com/vi/bbVZo4Yw7pI/hqdefault.jpg' },
              { title: 'R&B & Soul', query: 'Tems Ayra Starr', bg: 'from-[#dc148c] to-[#7a0b4e]', img: 'https://i.ytimg.com/vi/1JltlSJH5bY/hqdefault.jpg' },
              { title: 'Pop Hits', query: 'The Weeknd Blinding Lights', bg: 'from-[#1e3264] to-[#0f1933]', img: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg' },
              { title: 'UK Rap & Grime', query: 'Stormzy Vossi Bop', bg: 'from-[#503750] to-[#2b1d2b]', img: 'https://i.ytimg.com/vi/9ClYy0MxsU0/hqdefault.jpg' },
              { title: 'Travis & Rage', query: 'Travis Scott FEIN', bg: 'from-[#e91429] to-[#7c0b16]', img: 'https://i.ytimg.com/vi/B9synWjqBn8/hqdefault.jpg' },
            ].map((cat) => (
              <div
                key={cat.title}
                onClick={() => handlePillClick(cat.query)}
                className={`relative h-36 rounded-xl p-4 overflow-hidden cursor-pointer bg-gradient-to-br ${cat.bg} hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg`}
              >
                <h3 className="text-lg font-extrabold text-white tracking-tight max-w-[70%] leading-snug">
                  {cat.title}
                </h3>
                <img
                  src={cat.img}
                  alt={cat.title}
                  className="w-20 h-20 rounded-lg object-cover shadow-2xl absolute -right-2 -bottom-2 rotate-[25deg]"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
