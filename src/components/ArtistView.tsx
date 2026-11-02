import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Disc,
  ArrowLeft,
  Loader2,
  X,
  Music,
  Heart,
  ListPlus,
  Radio,
  Check,
} from 'lucide-react';
import { Track, FeaturedArtist, AlbumItem } from '../types/music';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { TrackTable } from './TrackTable';

interface ArtistViewProps {
  artist: FeaturedArtist;
  onBack: () => void;
}

const DEFAULT_ALBUM_COVER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23121216"/><circle cx="100" cy="100" r="45" fill="%231a1a20" stroke="%231DB954" stroke-width="3"/><circle cx="100" cy="100" r="15" fill="%230a0a0c"/><text x="50%" y="82%" font-family="sans-serif" font-weight="bold" font-size="14" fill="%231DB954" text-anchor="middle">b33t</text></svg>`;

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec < 0) return '3:30';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const ArtistView: React.FC<ArtistViewProps> = ({ artist, onBack }) => {
  const {
    currentTrack,
    isPlaying,
    likedIds,
    playTrack,
    playAll,
    toggleLike,
    addToQueue,
  } = useMusicPlayer();

  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState<boolean>(true);

  // Album Modal / Detail View State
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumItem | null>(null);
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingTracks(true);

    fetch(`/api/artist/${encodeURIComponent(artist.name)}/tracks`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;

        if (data.top_tracks && Array.isArray(data.top_tracks)) {
          const formatted: Track[] = data.top_tracks.map((t: any) => ({
            video_id: t.video_id,
            id: t.id || t.video_id,
            title: t.title,
            artist: t.artist || artist.name,
            album: t.album || 'Official Release',
            duration: t.duration || 210,
            thumbnail: t.thumbnail || `https://i.ytimg.com/vi/${t.video_id}/hqdefault.jpg`,
          }));
          setTopTracks(formatted);
        }

        if (data.albums && Array.isArray(data.albums)) {
          setAlbums(data.albums);
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

  // Open album details & load album tracks
  const handleOpenAlbum = async (album: AlbumItem) => {
    setSelectedAlbum(album);
    setIsLoadingAlbum(true);
    setAlbumTracks([]);

    try {
      const res = await fetch(
        `/api/album/${encodeURIComponent(album.id)}/tracks?artist=${encodeURIComponent(
          artist.name
        )}&album=${encodeURIComponent(album.title)}`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.tracks && Array.isArray(data.tracks)) {
          const mapped: Track[] = data.tracks.map((t: any) => ({
            video_id: t.video_id || '',
            id: t.id || String(Math.random()),
            title: t.title,
            artist: t.artist || artist.name,
            album: album.title,
            duration: t.duration || 210,
            thumbnail: album.thumbnail || t.thumbnail,
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

  // Play entire album immediately
  const handlePlayAlbumDirect = async (album: AlbumItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        `/api/album/${encodeURIComponent(album.id)}/tracks?artist=${encodeURIComponent(
          artist.name
        )}&album=${encodeURIComponent(album.title)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
          const mapped: Track[] = data.tracks.map((t: any) => ({
            video_id: t.video_id || '',
            id: t.id || String(Math.random()),
            title: t.title,
            artist: t.artist || artist.name,
            album: album.title,
            duration: t.duration || 210,
            thumbnail: album.thumbnail || t.thumbnail,
          }));
          playAll(mapped);
          return;
        }
      }
    } catch {}

    // Fallback: search & play top tracks
    if (topTracks.length > 0) {
      playAll(topTracks);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-[#8a8a92] hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back</span>
      </button>

      {/* Artist Hero Header */}
      <section className="relative rounded-3xl overflow-hidden p-6 md:p-10 bg-gradient-to-r from-emerald-950/70 via-[#121216] to-[#0a0a0c] border border-[#1e1e24] shadow-2xl flex flex-col md:flex-row items-start md:items-end gap-8">
        <div className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-white/10 shrink-0 shadow-2xl relative group">
          <img
            src={artist.image}
            alt={artist.name}
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
            <span className="text-xs text-zinc-300 font-medium">{artist.origin}</span>
          </div>

          <h1 className="text-3xl md:text-6xl font-black text-white tracking-tight">
            {artist.name}
          </h1>

          <p className="text-xs md:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            {artist.bio}
          </p>

          <div className="flex items-center gap-4 pt-1 text-xs text-[#8a8a92] font-mono">
            <span>{artist.monthly_listeners} monthly listeners</span>
            <span>·</span>
            <span className="text-[#00e0a0] flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" />
              Native Opus 251
            </span>
          </div>
        </div>

        {topTracks.length > 0 && (
          <button
            onClick={() => playAll(topTracks)}
            className="w-16 h-16 rounded-full bg-[#1DB954] text-black flex items-center justify-center hover:bg-[#00e0a0] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#1DB954]/30 shrink-0 self-start md:self-end"
            title="Play Artist Discography"
          >
            <Play className="w-7 h-7 fill-black ml-1" />
          </button>
        )}
      </section>

      {/* Popular Discography Tracks Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Popular Discography Tracks
            </h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">
              Top streamable releases by {artist.name} in full uncompressed Opus fidelity
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
            <p className="text-xs font-medium">Loading {artist.name} tracks...</p>
          </div>
        ) : (
          <div className="bg-[#121216] border border-[#1e1e24] rounded-2xl p-2 shadow-inner">
            <TrackTable
              tracks={topTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTrackIds={likedIds}
              onPlayTrack={playTrack}
              onToggleLike={toggleLike}
              onAddToQueue={addToQueue}
            />
          </div>
        )}
      </section>

      {/* Albums & Official Releases Section */}
      {albums.length > 0 && (
        <section className="space-y-4 pt-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Albums & Official Releases
            </h2>
            <p className="text-xs text-[#8a8a92] mt-0.5">
              Studio albums, EPs, and discography singles with tracklists
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {albums.map((album) => (
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
                    {album.year} · {album.track_count || 10} tracks
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#1e1e24]/60 flex items-center justify-between text-[11px]">
                  <span className="text-[#1DB954] font-mono text-[10px] uppercase font-bold">
                    Opus 251 Ready
                  </span>
                  <span className="text-zinc-500 group-hover:text-white transition-colors">
                    View Tracks →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Album Detail Modal / Interactive Tracklist */}
      {selectedAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-[#121216] border border-[#1e1e24] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-950/60 via-[#16161e] to-[#121216] border-b border-[#1e1e24] flex items-start gap-6 relative">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-2xl">
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

              <div className="flex-1 min-w-0 space-y-2">
                <span className="text-[11px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-black/50 text-[#1DB954] border border-emerald-500/30">
                  Album Release
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white truncate">
                  {selectedAlbum.title}
                </h2>
                <p className="text-xs text-[#8a8a92]">
                  By <span className="text-white font-semibold">{artist.name}</span> · {selectedAlbum.year} · {albumTracks.length || selectedAlbum.track_count || 10} tracks
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (albumTracks.length > 0) {
                        playAll(albumTracks);
                      }
                    }}
                    disabled={albumTracks.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1DB954] text-black font-bold text-xs hover:bg-[#00e0a0] active:scale-95 transition-all shadow-lg disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Play Entire Album</span>
                  </button>

                  <button
                    onClick={() => {
                      albumTracks.forEach((t) => addToQueue(t));
                    }}
                    disabled={albumTracks.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#1e1e24] hover:bg-white/10 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    <ListPlus className="w-4 h-4" />
                    <span>Queue All</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedAlbum(null)}
                className="absolute top-4 right-4 p-2 text-[#8a8a92] hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Tracklist */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-[#1e1e24]/60">
              {isLoadingAlbum ? (
                <div className="py-16 text-center text-[#8a8a92] flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#1DB954]" />
                  <p className="text-xs">Loading {selectedAlbum.title} tracklist...</p>
                </div>
              ) : albumTracks.length > 0 ? (
                albumTracks.map((trk, idx) => {
                  const trkId = trk.video_id || trk.id || '';
                  const isCurrent =
                    (currentTrack?.video_id || currentTrack?.id) === trkId ||
                    (currentTrack?.title === trk.title && currentTrack?.artist === trk.artist);
                  const isLiked = likedIds.includes(trkId);

                  return (
                    <div
                      key={`${trkId}-${idx}`}
                      onClick={() => playTrack(trk)}
                      className={`group flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-white/[0.08] text-[#1DB954]'
                          : 'hover:bg-white/[0.04] text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <span className="font-mono text-xs text-[#8a8a92] w-5 text-right shrink-0">
                          {isCurrent && isPlaying ? (
                            <Radio className="w-3.5 h-3.5 text-[#1DB954] animate-pulse inline" />
                          ) : (
                            idx + 1
                          )}
                        </span>

                        <div className="min-w-0 pr-4">
                          <p
                            className={`font-bold text-sm truncate ${
                              isCurrent ? 'text-[#1DB954]' : 'text-white'
                            }`}
                          >
                            {trk.title}
                          </p>
                          <p className="text-xs text-[#8a8a92] truncate">{trk.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(trkId);
                          }}
                          className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
                            isLiked
                              ? 'text-[#1DB954]'
                              : 'opacity-0 group-hover:opacity-100 text-[#8a8a92] hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
                        </button>

                        <span className="font-mono text-xs text-[#8a8a92] tabular-nums w-12 text-right">
                          {formatDuration(trk.duration)}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrack(trk);
                          }}
                          className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-[#1DB954] group-hover:text-black text-white flex items-center justify-center transition-all ml-1"
                        >
                          {isCurrent && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-[#8a8a92]">
                  <Music className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs">No tracks found for this album.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 px-6 bg-[#0a0a0c] border-t border-[#1e1e24] flex items-center justify-between text-xs text-[#8a8a92]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                <Check className="w-3 h-3" />
                Opus 251 High-Definition Audio
              </span>
              <button
                onClick={() => setSelectedAlbum(null)}
                className="hover:text-white transition-colors text-xs font-semibold"
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
