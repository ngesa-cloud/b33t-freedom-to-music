import React from 'react';
import { X, Youtube, ExternalLink, ShieldCheck } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose }) => {
  const { currentTrack } = useMusicPlayer();

  if (!isOpen || !currentTrack) return null;

  const videoId = currentTrack.video_id || currentTrack.id || 'Or2sMfOcTtw';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#121216] border border-[#1e1e24] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e24] bg-[#0a0a0c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
              <Youtube className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                {currentTrack.title}
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-[#1DB954] border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Official Master
                </span>
              </h2>
              <p className="text-xs text-[#8a8a92]">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-[#8a8a92] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Open on YouTube"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-[#8a8a92] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Embed Frame */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
            title={currentTrack.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0a0a0c] border-t border-[#1e1e24] flex items-center justify-between text-xs text-[#8a8a92]">
          <span>Full official video & studio audio playback directly in b33t</span>
          <span className="font-mono text-[#00e0a0] text-[11px]">ID: {videoId}</span>
        </div>
      </div>
    </div>
  );
};
