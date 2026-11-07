import React from 'react';
import { X, Play, Trash2, ListMusic, Music } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec < 0) return '3:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ isOpen, onClose }) => {
  const { currentTrack, queue, playTrack, removeFromQueue, clearQueue } = useMusicPlayer();

  if (!isOpen) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-80 md:w-96 h-full bg-[#121216] border-l border-[#1e1e24] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      >
      {/* Header */}
      <div className="p-4 border-b border-[#1e1e24] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ListMusic className="w-4 h-4 text-[#1DB954]" />
          <h2 className="text-sm font-bold text-white">Playback Queue</h2>
          <span className="text-[11px] font-mono text-[#8a8a92] tabular-nums">
            ({queue.length + (currentTrack ? 1 : 0)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-xs text-[#8a8a92] hover:text-red-400 p-1 transition-colors"
              title="Clear Up Next Queue"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8a8a92] hover:text-white hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Now Playing */}
        {currentTrack && (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8a8a92] mb-2 block">
              Now Playing
            </span>
            <div className="p-3 rounded-xl bg-[#1a1a20] border border-[#1DB954]/30 flex items-center gap-3">
              <img
                src={currentTrack.thumbnail || `https://i.ytimg.com/vi/${currentTrack.video_id}/hqdefault.jpg`}
                alt={currentTrack.title}
                className="w-11 h-11 rounded-lg object-cover shrink-0 shadow-md border border-[#1e1e24]"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
                <p className="text-[11px] text-[#8a8a92] truncate">{currentTrack.artist}</p>
              </div>
              <span className="text-[11px] font-mono text-[#1DB954] tabular-nums">
                {formatDuration(currentTrack.duration)}
              </span>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8a8a92]">
              Up Next
            </span>
            <span className="text-[11px] text-[#8a8a92]">{queue.length} in queue</span>
          </div>

          {queue.length === 0 ? (
            <div className="py-8 text-center text-[#8a8a92] text-xs">
              <Music className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p>No tracks in queue</p>
              <p className="text-[11px] mt-0.5">Click + on any track to add to Up Next</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {queue.map((track, idx) => (
                <div
                  key={`${track.video_id}-${idx}`}
                  className="group p-2.5 rounded-lg hover:bg-[#1a1a20] border border-transparent hover:border-[#1e1e24] flex items-center gap-3 transition-colors"
                >
                  <button
                    onClick={() => {
                      removeFromQueue(idx);
                      playTrack(track);
                    }}
                    className="w-8 h-8 rounded bg-[#1a1a20] flex items-center justify-center text-[#8a8a92] group-hover:text-white shrink-0 hover:bg-[#1DB954] hover:text-black transition-colors"
                    title="Play Now"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>

                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white">
                      {track.title}
                    </p>
                    <p className="text-[11px] text-[#8a8a92] truncate">{track.artist}</p>
                  </div>

                  <span className="text-[11px] font-mono text-[#8a8a92] tabular-nums">
                    {formatDuration(track.duration)}
                  </span>

                  <button
                    onClick={() => removeFromQueue(idx)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#8a8a92] hover:text-red-400 transition-opacity"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
