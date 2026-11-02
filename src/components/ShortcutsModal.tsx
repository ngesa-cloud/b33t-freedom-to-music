import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', action: 'Toggle Play / Pause' },
    { key: '→ (Right Arrow)', action: 'Seek forward 5 seconds' },
    { key: '← (Left Arrow)', action: 'Seek backward 5 seconds' },
    { key: 'Shift + →', action: 'Skip to next track in queue' },
    { key: 'Shift + ←', action: 'Previous track' },
    { key: '↑ / ↓ (Up / Down)', action: 'Volume Up / Volume Down' },
    { key: 'M', action: 'Mute / Unmute Audio' },
    { key: 'Esc', action: 'Close drawers, modals, and fullscreen lyrics' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e14] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#1ed760] flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Desktop Keyboard Controls</h2>
              <p className="text-xs text-zinc-400">Native High-Speed Workstation Shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-5">
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-zinc-400 border-b border-white/5">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Key</th>
                  <th className="py-2.5 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shortcuts.map((s, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-4">
                      <kbd className="px-2 py-1 rounded bg-[#161a23] border border-white/10 text-white font-mono text-[11px] shadow-sm">
                        {s.key}
                      </kbd>
                    </td>
                    <td className="py-2.5 px-4 text-zinc-300 font-medium">{s.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#090b10] border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[11px]">Sub-second response engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
