export interface Track {
  video_id?: string;
  id?: string; // compatibility alias
  track_number?: number;
  title: string;
  artist: string;
  featuredArtist?: string;
  album: string;
  year?: number;
  duration: number; // in seconds
  thumbnail?: string;
  genre?: string;
  coverGradient?: string;
  cached?: boolean;
  isLocal?: boolean;
  streamUrl?: string;
  size_bytes?: number;
  cacheSizeMb?: number;
  plays?: number;
  audioSignature?: {
    bpm: number;
    key: string;
    energy: number;
  };
  lyrics?: ({
    seconds: number;
    lyrics: string;
  } | {
    time: number;
    text: string;
  })[];
}

export interface Artist {
  id: string;
  name: string;
  origin: string;
  genre: string;
  bio: string;
  monthlyListeners: string;
  coverGradient: string;
  topTracks: string[];
  albums: {
    title: string;
    year: number;
    trackCount: number;
  }[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverGradient: string;
  tracks: string[];
  isCurated?: boolean;
  isCustom?: boolean;
}

export interface LyricLine {
  seconds: number;
  lyrics: string;
}

export interface FeaturedArtist {
  name: string;
  monthly_listeners: string;
  origin: string;
  bio: string;
  image: string;
}

export interface CacheStatus {
  track_count: number;
  total_bytes: number;
  files: {
    video_id: string;
    size_bytes: number;
    mtime: string;
  }[];
}

export type VisualizerMode = 'bars' | 'wave' | 'pulse' | 'stereo';

export interface EqBandSettings {
  band60: number;
  band250: number;
  band1000: number;
  band4000: number;
  band12000: number;
}

export interface EqPreset {
  name: string;
  settings: EqBandSettings;
}

export interface SearchTopResult {
  type: 'artist' | 'song';
  id: string;
  name?: string;
  title?: string;
  artist?: string;
  image?: string;
  thumbnail?: string;
  subtitle: string;
  bio?: string;
  monthly_listeners?: string;
  origin?: string;
  video_id?: string;
  duration?: number;
  topTrack?: Track;
}

export interface SearchArtistResult {
  id: string;
  name: string;
  image: string;
  monthly_listeners?: string;
  origin?: string;
  bio?: string;
}

export interface SearchAlbumResult {
  id: string;
  title: string;
  artist: string;
  year?: number | string;
  thumbnail: string;
  track_count?: number;
}

export type AlbumItem = SearchAlbumResult;

export interface StructuredSearchResponse {
  query: string;
  topResult: SearchTopResult | null;
  artists: SearchArtistResult[];
  songs: Track[];
  albums: SearchAlbumResult[];
}

