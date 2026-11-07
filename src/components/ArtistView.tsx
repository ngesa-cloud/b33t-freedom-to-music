import React, { useEffect, useState } from 'react';
import {
  Play,
  ArrowLeft,
  Loader2,
  X,
  ListPlus,
  Radio,
  Check,
} from 'lucide-react';
import { Track, FeaturedArtist, AlbumItem } from '../types/music';
import { useMusicPlayer, apiUrl } from '../context/MusicPlayerContext';
import { TrackTable } from './TrackTable';

interface ArtistViewProps {
  artist: FeaturedArtist;
  onBack: () => void;
  isMobile?: boolean;
}

const DEFAULT_ALBUM_COVER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23121216"/><circle cx="100" cy="100" r="45" fill="%231a1a20" stroke="%231DB954" stroke-width="3"/><circle cx="100" cy="100" r="15" fill="%230a0a0c"/><text x="50%" y="82%" font-family="sans-serif" font-weight="bold" font-size="14" fill="%231DB954" text-anchor="middle">b33t</text></svg>`;

export const ArtistView: React.FC<ArtistViewProps> = ({ artist, onBack, isMobile = false }) => {
  const {
    currentTrack,
    isPlaying,
    likedIds,
    playTrack,
    playAll,
    toggleLike,
    addToQueue,
  } = useMusicPlayer();

  const [canonicalArtist, setCanonicalArtist] = useState<FeaturedArtist>(artist);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [singlesAndEps, setSinglesAndEps] = useState<AlbumItem[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState<boolean>(true);
  const [resolvingIds, setResolvingIds] = useState<string[]>([]);

  // Album Modal / Detail View State
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumItem | null>(null);
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState<boolean>(false);

  // On-the-fly resolver for a single track when played or queued
  const resolveTrackOnTheFly = async (track: Track): Promise<Track> => {
    if (track.video_id && track.video_id.trim().length > 0) {
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
          setAlbumTracks((prev) =>
            prev.map((item) => (item.id === track.id ? resolvedTrack : item))
          );
          setTopTracks((prev) =>
            prev.map((item) => (item.id === track.id ? resolvedTrack : item))
          );
          return resolvedTrack;
        }
      }
    } catch (err) {
      console.warn('[On-the-fly Resolve] error:', err);
    } finally {
      setResolvingIds((prev) => prev.filter((id) => id !== trackKey));
    }

    // Fallback: return track as-is so MusicPlayerContext streams via /api/stream/:id?title=...&artist=...
    return track;
  };

  useEffect(() => {
    let isMounted = true;
    setCanonicalArtist(artist);
    setIsLoadingTracks(true);
    setTopTracks([]);
    setAlbums([]);
    setSinglesAndEps([]);

    fetch(apiUrl(`/api/artist/${encodeURIComponent(artist.name)}/tracks`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;

        if (data.artist) {
          setCanonicalArtist({
            name: data.artist.name || artist.name,
            origin: data.artist.genre || data.artist.origin || artist.origin,
            image: data.artist.image || artist.image,
            bio: data.artist.bio || artist.bio,
            monthly_listeners: data.artist.monthly_listeners || artist.monthly_listeners,
          });
        }

        if (data.top_tracks && Array.isArray(data.top_tracks)) {
          const formatted: Track[] = data.top_tracks.map((t: any, idx: number) => ({
            video_id: t.video_id || '',
            id: String(t.id || t.video_id || `top-${idx}`),
            track_number: idx + 1,
            title: t.title,
            artist: t.artist || data.artist?.name || artist.name,
            album: t.album || 'Official Release',
            duration: t.duration || 210,
            thumbnail: t.thumbnail || DEFAULT_ALBUM_COVER,
          }));
          setTopTracks(formatted);
        }

        if (data.albums && Array.isArray(data.albums)) {
          setAlbums(data.albums);
        }

        if (data.singles_and_eps && Array.isArray(data.singles_and_eps)) {
          setSinglesAndEps(data.singles_and_eps);
        }
      })
      .catch((err) => console.warn('[Artist Tracks] fetch error:', err))
      .finally(() => {
        if (isMounted) setIsLoadingTracks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [artist]);

  // Open album details & load album tracklist (without resolving YouTube IDs upfront)
  const handleOpenAlbum = async (album: AlbumItem) => {
    setSelectedAlbum(album);
    setIsLoadingAlbum(true);
    setAlbumTracks([]);

    try {
      const res = await fetch(
        apiUrl(
          `/api/album/${encodeURIComponent(album.id)}/tracks?artist=${encodeURIComponent(
            canonicalArtist.name
          )}&album=${encodeURIComponent(album.title)}`
        )
      );

      if (res.ok) {
        const data = await res.json();
        if (data.album) {
          setSelectedAlbum((prev) => ({
            id: String(data.album.id || album.id),
            title: data.album.title || album.title,
            artist: data.album.artist || album.artist || canonicalArtist.name,
            year: data.album.year || album.year,
            thumbnail: data.album.thumbnail || album.thumbnail || DEFAULT_ALBUM_COVER,
            track_count: data.album.track_count || album.track_count,
          }));
        }

        if (data.tracks && Array.isArray(data.tracks)) {
          const mapped: Track[] = data.tracks.map((t: any, idx: number) => ({
            video_id: t.video_id || '',
            id: String(t.id || `album-${album.id}-${idx + 1}`),
            track_number: typeof t.track_number === 'number' ? t.track_number : idx + 1,
            title: t.title,
            artist: t.artist || canonicalArtist.name,
            album: data.album?.title || album.title,
            duration: t.duration || 210,
            thumbnail: t.thumbnail || data.album?.thumbnail || album.thumbnail || DEFAULT_ALBUM_COVER,
          }));
          setAlbumTracks(mapped);
        }
      }
    } catch (err) {
      console.warn('[Album Tracks] error:', err);
    } finally {
      setIsLoadingAlbum(false);
    }
  };

  // Play a single track (resolving on the fly if video_id is empty)
  const handlePlayTrackOnDemand = async (track: Track) => {
    const resolved = await resolveTrackOnTheFly(track);
    playTrack(resolved);
  };

  // Add a single track to queue (resolving on the fly if video_id is empty)
  const handleQueueTrackOnDemand = async (track: Track) => {
    const resolved = await resolveTrackOnTheFly(track);
    addToQueue(resolved);
  };

  // Play entire album from modal: resolve first track immediately, queue all tracks in the album
  const handlePlayOpenedAlbum = async () => {
    if (albumTracks.length === 0) return;
    const firstResolved = await resolveTrackOnTheFly(albumTracks[0]);
    const updatedList = [firstResolved, ...albumTracks.slice(1)];
    playAll(updatedList);
  };

  // Play entire album directly from card hover button
  const handlePlayAlbumDirect = async (album: AlbumItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        apiUrl(
          `/api/album/${encodeURIComponent(album.id)}/tracks?artist=${encodeURIComponent(
            canonicalArtist.name
          )}&album=${encodeURIComponent(album.title)}`
        )
      );
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
          const mapped: Track[] = data.tracks.map((t: any, idx: number) => ({
            video_id: t.video_id || '',
            id: String(t.id || `album-${album.id}-${idx + 1}`),
            track_number: typeof t.track_number === 'number' ? t.track_number : idx + 1,
            title: t.title,
            artist: t.artist || canonicalArtist.name,
            album: data.album?.title || album.title,
            duration: t.duration || 210,
            thumbnail: t.thumbnail || data.album?.thumbnail || album.thumbnail || DEFAULT_ALBUM_COVER,
          }));
          const firstResolved = await resolveTrackOnTheFly(mapped[0]);
          playAll([firstResolved, ...mapped.slice(1)]);
          return;
        }
      }
    } catch {}

    if (topTracks.length > 0) {
      playAll(topTracks);
    }
  };

  const renderReleaseGrid = (items: AlbumItem[], badgeLabel: string) => (
    <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5"}>
      {items.map((album) => (
        <div
          key={album.id}
          onClick={() => handleOpenAlbum(album)}
          className="group p-4 rounded-2xl bg-[#121216] hover:bg-[#1a1a24] border border-[#1e1e24] hover:border-white/10 transition-all cursor-pointer shadow-xl flex flex-col justify-between"
        >
          <div>
            {/* Square Album Cover with Floating Play Button */}
            <div className="w-full aspect-square rounded-xl overflow-hidden mb-3.5 shadow-2xl group-hover:scale-105 transition-transform border border-white/10 relative">
              <img
                src={album.thumbnail || DEFAULT_ALBUM_COVER}
                alt={album.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_ALBUM_COVER;
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <button
                  onClick={(e) => handlePlayAlbumDirect(album, e)}
                  className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                  title={`Play ${album.title}`}
                >
                  <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                </button>
              </div>
            </div>

            {/* Album Info */}
            <h3 className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors truncate">
              {album.title}
            </h3>
            <p className="text-xs text-[#8a8a92] mt-0.5">
              {album.year} · {badgeLabel} · {album.track_count || 1}{' '}
              {album.track_count === 1 ? 'track' : 'tracks'}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#1e1e24]/60 flex items-center justify-between text-[11px]">
            <span className="text-[#1DB954] font-mono text-[10px] uppercase font-bold">
              iTunes Canonical
            </span>
            <span className="text-zinc-500 group-hover:text-white transition-colors">
              View Tracks →
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={isMobile ? "p-3 space-y-6 max-w-full" : "p-6 md:p-8 space-y-10 max-w-7xl mx-auto"}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-[#8a8a92] hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back</span>
      </button>

      {/* Artist Hero Header */}
      <section className={`relative rounded-3xl overflow-hidden ${
        isMobile
          ? 'p-4 flex flex-col items-start gap-4'
          : 'p-6 md:p-10 flex flex-col md:flex-row items-start md:items-end gap-8'
      } bg-gradient-to-r from-emerald-950/70 via-[#121216] to-[#0a0a0c] border border-[#1e1e24] shadow-2xl`}>
        <div className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-white/10 shrink-0 shadow-2xl relative group">
          <img
            src={canonicalArtist.image || DEFAULT_ALBUM_COVER}
            alt={canonicalArtist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_ALBUM_COVER;
            }}
          />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-[#1DB954] border border-emerald-500/30 flex items-center gap-1.5 font-bold">
              <Check className="w-3.5 h-3.5" />
              Verified Artist
            </span>
            <span className="text-xs text-zinc-300 font-medium">
              {canonicalArtist.origin}
            </span>
          </div>

          <h1 className="text-3xl md:text-6xl font-black text-white tracking-tight">
            {canonicalArtist.name}
          </h1>

          <p className="text-xs md:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            {canonicalArtist.bio}
          </p>

          <div className="flex items-center gap-4 pt-1 text-xs text-[#8a8a92] font-mono">
            <span>{canonicalArtist.monthly_listeners} monthly listeners</span>
            <span>·</span>
            <span className="text-[#00e0a0] flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" />
              High-Fidelity Stream
            </span>
          </div>
        </div>

        {topTracks.length > 0 && (
          <button
            onClick={() => playAll(topTracks)}
            className="w-16 h-16 rounded-full bg-[#1DB954] text-black flex items-center justify-center hover:bg-[#00e0a0] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#1DB954]/30 shrink-0 self-start md:self-end"
            title="Play Top Tracks"
          >
            <Play className="w-7 h-7 fill-black ml-1" />
          </button>
        )}
      </section>

      {/* Top Tracks Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Top Tracks
            </h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">
              Canonical discography highlights by {canonicalArtist.name}
            </p>
          </div>
          {topTracks.length > 0 && (
            <button
              onClick={() => playAll(topTracks)}
              className="text-xs font-semibold text-[#1DB954] hover:underline"
            >
              Play All ({topTracks.length})
            </button>
          )}
        </div>

        {isLoadingTracks ? (
          <div className="p-12 text-center text-[#8a8a92] bg-[#121216] border border-[#1e1e24] rounded-2xl flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#1DB954]" />
            <p className="text-xs font-medium">
              Resolving canonical discography for {canonicalArtist.name}...
            </p>
          </div>
        ) : (
          <div className="bg-[#121216] border border-[#1e1e24] rounded-2xl p-2 shadow-inner">
            <TrackTable
              isMobile={isMobile}
              tracks={topTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTrackIds={likedIds}
              resolvingTrackIds={resolvingIds}
              onPlayTrack={handlePlayTrackOnDemand}
              onToggleLike={toggleLike}
              onAddToQueue={handleQueueTrackOnDemand}
            />
          </div>
        )}
      </section>

      {/* Albums Section */}
      {albums.length > 0 && (
        <section className="space-y-4 pt-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Albums
            </h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">
              Official studio albums by {canonicalArtist.name}, sorted by release date
            </p>
          </div>
          {renderReleaseGrid(albums, 'Album')}
        </section>
      )}

      {/* Singles & EPs Section */}
      {singlesAndEps.length > 0 && (
        <section className="space-y-4 pt-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Singles & EPs
            </h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">
              Official singles and extended plays by {canonicalArtist.name}
            </p>
          </div>
          {renderReleaseGrid(singlesAndEps, 'Single / EP')}
        </section>
      )}

      {/* Album Detail Modal / Tracklist View (reusing TrackTable) */}
      {selectedAlbum && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedAlbum(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-[#121216] border border-[#1e1e24] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-950/60 via-[#16161e] to-[#121216] border-b border-[#1e1e24] flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-2xl">
                <img
                  src={selectedAlbum.thumbnail || DEFAULT_ALBUM_COVER}
                  alt={selectedAlbum.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_ALBUM_COVER;
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 w-full space-y-2 sm:pr-8">
                <span className="inline-block text-[10px] sm:text-[11px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-black/50 text-[#1DB954] border border-emerald-500/30">
                  Official Release
                </span>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white truncate">
                  {selectedAlbum.title}
                </h2>
                <p className="text-xs text-[#b3b3b3] truncate">
                  By <span className="text-white font-semibold">{selectedAlbum.artist || canonicalArtist.name}</span> ·{' '}
                  {selectedAlbum.year} · {albumTracks.length || selectedAlbum.track_count || 1} tracks
                </p>

                <div className="pt-1.5 flex items-center justify-center sm:justify-start flex-wrap gap-2.5">
                  <button
                    onClick={handlePlayOpenedAlbum}
                    disabled={albumTracks.length === 0}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#1DB954] text-black font-bold text-xs hover:bg-[#00e0a0] active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                  >
                    <Play className="w-4 h-4 fill-black shrink-0" />
                    <span>Play Album</span>
                  </button>

                  <button
                    onClick={() => {
                      albumTracks.forEach((t) => addToQueue(t));
                    }}
                    disabled={albumTracks.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1e1e24] hover:bg-white/10 text-white font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                  >
                    <ListPlus className="w-4 h-4 shrink-0" />
                    <span>Queue All</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedAlbum(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-[#b3b3b3] hover:text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close album tracklist"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Tracklist using TrackTable */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
              {isLoadingAlbum ? (
                <div className="py-16 text-center text-[#b3b3b3] flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#1DB954]" />
                  <p className="text-xs">Loading {selectedAlbum.title} tracklist...</p>
                </div>
              ) : (
                <div className="bg-[#121216] border border-[#1e1e24] rounded-2xl p-2 shadow-inner">
                  <TrackTable
                    tracks={albumTracks}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    likedTrackIds={likedIds}
                    resolvingTrackIds={resolvingIds}
                    onPlayTrack={handlePlayTrackOnDemand}
                    onToggleLike={toggleLike}
                    onAddToQueue={handleQueueTrackOnDemand}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:px-6 bg-[#0a0a0c] border-t border-[#1e1e24] flex items-center justify-between gap-2 text-xs text-[#b3b3b3]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px] sm:text-[11px] truncate">
                <Check className="w-3 h-3 shrink-0" />
                <span className="truncate">Canonical iTunes Metadata · On-Demand Stream</span>
              </span>
              <button
                onClick={() => setSelectedAlbum(null)}
                className="hover:text-white transition-colors text-xs font-semibold shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
