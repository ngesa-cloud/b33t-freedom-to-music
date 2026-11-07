import React, { useState } from 'react';
import { X, UploadCloud, Link as LinkIcon, FileAudio, CheckCircle } from 'lucide-react';
import { Track } from '../types/music';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface LocalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalImportModal: React.FC<LocalImportModalProps> = ({ isOpen, onClose }) => {
  const { playTrack } = useMusicPlayer();
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [trackTitle, setTrackTitle] = useState<string>('');
  const [artistName, setArtistName] = useState<string>('Local Audio');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const name = file.name.replace(/\.[^/.]+$/, '');
      setTrackTitle(name);
    }
  };

  const handleImportFile = () => {
    if (!selectedFile) return;

    // Use client-side URL.createObjectURL() without uploading to server
    const objectUrl = URL.createObjectURL(selectedFile);
    const newTrack: Track = {
      video_id: `local-${Date.now()}`,
      title: trackTitle || selectedFile.name,
      artist: artistName || 'Local File',
      album: 'Imported Workstation Audio',
      duration: 180,
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
      streamUrl: objectUrl,
      isLocal: true,
      cached: true,
      size_bytes: selectedFile.size,
    };

    playTrack(newTrack);
    onClose();
  };

  const handleImportUrl = () => {
    if (!streamUrl.trim()) return;

    const newTrack: Track = {
      video_id: `stream-${Date.now()}`,
      title: trackTitle || 'External Stream',
      artist: artistName || 'Web Stream',
      album: 'Direct Stream',
      duration: 210,
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
      streamUrl: streamUrl.trim(),
      isLocal: false,
      cached: false,
    };

    playTrack(newTrack);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121216] border border-[#1e1e24] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1e1e24] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#1DB954] flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Import Audio to b33t</h2>
              <p className="text-xs text-[#8a8a92]">Play local files (.opus, .mp3, .wav) or direct URLs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#8a8a92] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 flex gap-2 border-b border-[#1e1e24]">
          <button
            onClick={() => setActiveTab('file')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'border-[#1DB954] text-white'
                : 'border-transparent text-[#8a8a92] hover:text-white'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5" />
            <span>Local Disk File</span>
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'url'
                ? 'border-[#1DB954] text-white'
                : 'border-transparent text-[#8a8a92] hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Direct Audio URL</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          {activeTab === 'file' ? (
            <div>
              <label className="block mb-2 font-semibold text-zinc-300">
                Select Audio File (.opus, .mp3, .wav):
              </label>
              <div className="border-2 border-dashed border-[#1e1e24] hover:border-[#1DB954]/50 rounded-xl p-6 text-center cursor-pointer transition-colors relative bg-[#0a0a0c]">
                <input
                  type="file"
                  accept="audio/*,.opus,.mp3,.wav,.ogg,.m4a"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileAudio className="w-8 h-8 text-[#1DB954] mx-auto mb-2" />
                {selectedFile ? (
                  <div className="text-zinc-200">
                    <p className="font-semibold text-white truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-[#00e0a0] mt-1 flex items-center justify-center gap-1 font-mono">
                      <CheckCircle className="w-3 h-3" />
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB ready (Local)
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-white">Click or Drag & Drop audio file here</p>
                    <p className="text-[11px] text-[#8a8a92] mt-1">Zero server upload · Pure local client playback</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block mb-1.5 font-semibold text-zinc-300">
                Direct Stream URL:
              </label>
              <input
                type="url"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://example.com/audio.opus"
                className="w-full bg-[#0a0a0c] border border-[#1e1e24] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1DB954] font-mono"
              />
              <p className="text-[11px] text-[#8a8a92] mt-1">
                Direct MP3, Opus, or AAC stream with Web Audio analysis.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block mb-1 font-medium text-[#8a8a92]">Track Title:</label>
              <input
                type="text"
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                placeholder="Song title"
                className="w-full bg-[#0a0a0c] border border-[#1e1e24] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1DB954]"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-[#8a8a92]">Artist Name:</label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="Artist or Creator"
                className="w-full bg-[#0a0a0c] border border-[#1e1e24] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1DB954]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0a0a0c] border-t border-[#1e1e24] flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-[#8a8a92] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={activeTab === 'file' ? handleImportFile : handleImportUrl}
            disabled={activeTab === 'file' ? !selectedFile : !streamUrl.trim()}
            className="px-4 py-2 rounded-lg bg-[#1DB954] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold hover:bg-[#00e0a0] transition-colors shadow"
          >
            Import & Play
          </button>
        </div>
      </div>
    </div>
  );
};
