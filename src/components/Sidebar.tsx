import React, { useState } from 'react';
import {
  Library,
  Heart,
  Plus,
  Search,
  Play,
  Music,
} from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { FeaturedArtist } from '../types/music';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenImport: () => void;
  onSelectArtist?: (artist: FeaturedArtist) => void;
}

const LIBRARY_ARTISTS: FeaturedArtist[] = [
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
    name: 'Bien',
    monthly_listeners: '2,481,200',
    origin: 'Nairobi, Kenya',
    bio: 'East African soul royalty and frontman of Sauti Sol, leading global Afro-pop with irresistible acoustic harmonics.',
    image: 'https://i.ytimg.com/vi/Or2sMfOcTtw/hqdefault.jpg',
  },
  {
    name: 'Tems',
    monthly_listeners: '14,600,000',
    origin: 'Lagos, Nigeria',
    bio: 'Grammy and Oscar-nominated visionary whose evocative contralto redefined modern Alté and R&B.',
    image: 'https://i.ytimg.com/vi/1JltlSJH5bY/hqdefault.jpg',
  },
  {
    name: 'Kendrick Lamar',
    monthly_listeners: '64,200,000',
    origin: 'Compton, California',
    bio: 'Pulitzer Prize recipient and master of lyrical architecture and cultural commentary.',
    image: 'https://i.ytimg.com/vi/T6eK-2OQtew/hqdefault.jpg',
  },
  {
    name: 'The Weeknd',
    monthly_listeners: '108,000,000',
    origin: 'Toronto, Canada',
    bio: 'Abel Tesfaye created an epochal body of work across dark R&B, synthwave, and stadium pop.',
    image: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenImport,
  onSelectArtist,
}) => {
  const { likedIds, catalogTracks, playTrack } = useMusicPlayer();
  const [libFilter, setLibFilter] = useState<'all' | 'playlists' | 'artists'>('all');
  const [libSearch, setLibSearch] = useState('');
  const [showLibSearch, setShowLibSearch] = useState(false);

  const filteredArtists = LIBRARY_ARTISTS.filter((a) =>
    a.name.toLowerCase().includes(libSearch.toLowerCase())
  );

  const filteredTracks = catalogTracks
    .slice(0, 6)
    .filter(
      (t) =>
        t.title.toLowerCase().includes(libSearch.toLowerCase()) ||
        t.artist.toLowerCase().includes(libSearch.toLowerCase())
    );

  return (
    <aside className="w-[280px] lg:w-[320px] bg-[#121212] rounded-lg flex flex-col h-full shrink-0 select-none overflow-hidden">
      {/* Spotify "Your Library" Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => onNavigate('library')}
          className={`flex items-center gap-3 font-bold text-base transition-colors ${
            currentView === 'library' ? 'text-white' : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <Library className="w-6 h-6" />
          <span>Your Library</span>
        </button>

        <button
          onClick={onOpenImport}
          title="Import audio or create playlist"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-[#1f1f1f] transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs (Playlists / Artists) */}
      <div className="px-4 py-2 flex items-center gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'playlists', label: 'Playlists' },
          { id: 'artists', label: 'Artists' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setLibFilter(tab.id as any)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              libFilter === tab.id
                ? 'bg-white text-black'
                : 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Library Search & Recents Row */}
      <div className="px-4 py-1.5 flex items-center justify-between gap-2">
        {showLibSearch ? (
          <div className="flex items-center gap-2 bg-[#242424] rounded-md px-2.5 py-1 flex-1">
            <Search className="w-3.5 h-3.5 text-[#b3b3b3] shrink-0" />
            <input
              type="text"
              value={libSearch}
              onChange={(e) => setLibSearch(e.target.value)}
              onBlur={() => {
                if (!libSearch) setShowLibSearch(false);
              }}
              placeholder="Search in Your Library"
              className="bg-transparent text-xs text-white placeholder-[#b3b3b3] focus:outline-none w-full"
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setShowLibSearch(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#b3b3b3] hover:text-white hover:bg-[#1f1f1f] transition-colors"
            title="Search in Your Library"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => onNavigate('library')}
          className="text-xs font-medium text-[#b3b3b3] hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          Recents
        </button>
      </div>

      {/* Scrollable Library Items List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {/* Liked Songs Pinned Item */}
        {(libFilter === 'all' || libFilter === 'playlists') && (
          <button
            onClick={() => onNavigate('liked')}
            className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors group ${
              currentView === 'liked' ? 'bg-[#232323]' : 'hover:bg-[#1f1f1f]'
            }`}
          >
            <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#450af5] via-[#8e8ee5] to-[#c4efd9] flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 fill-white text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold truncate ${
                  currentView === 'liked' ? 'text-[#1ed760]' : 'text-white'
                }`}
              >
                Liked Songs
              </p>
              <p className="text-xs text-[#b3b3b3] truncate mt-0.5">
                Playlist · {likedIds.length} songs
              </p>
            </div>
          </button>
        )}

        {/* Saved Artists */}
        {(libFilter === 'all' || libFilter === 'artists') &&
          filteredArtists.map((artist) => (
            <button
              key={artist.name}
              onClick={() => {
                if (onSelectArtist) onSelectArtist(artist);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-[#1f1f1f] transition-colors group"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-[#282828]">
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                <p className="text-xs text-[#b3b3b3] truncate mt-0.5">Artist</p>
              </div>
            </button>
          ))}

        {/* Quick Library Tracks */}
        {(libFilter === 'all' || libFilter === 'playlists') &&
          filteredTracks.map((trk) => {
            const id = trk.video_id || trk.id || '';
            return (
              <button
                key={`lib-trk-${id}`}
                onClick={() => playTrack(trk)}
                className="w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-[#1f1f1f] transition-colors group"
              >
                <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 bg-[#282828]">
                  {trk.thumbnail ? (
                    <img
                      src={trk.thumbnail}
                      alt={trk.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Music className="w-5 h-5 text-[#b3b3b3] m-auto" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{trk.title}</p>
                  <p className="text-xs text-[#b3b3b3] truncate mt-0.5">
                    Song · {trk.artist}
                  </p>
                </div>
              </button>
            );
          })}
      </div>
    </aside>
  );
};
