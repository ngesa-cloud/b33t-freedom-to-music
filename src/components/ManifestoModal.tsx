import React from 'react';
import { X, ShieldCheck, Flame, Radio, Award } from 'lucide-react';

interface ManifestoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManifestoModal: React.FC<ManifestoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-[#0b0e15] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white p-1 text-black flex items-center justify-center shadow-md border border-[#1DB954]/40 shrink-0 overflow-hidden">
              <img src="/logo.png" alt="b33t logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                ✊ The Manifesto: Freedom to Music
              </h2>
              <p className="text-xs text-zinc-400">
                Crafted with passion by Dominic Nyongesa (ngesa-cloud)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-sm text-zinc-300 leading-relaxed">
          {/* Main Statement */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-transparent border border-emerald-500/30">
            <p className="text-sm md:text-base font-medium text-emerald-200">
              Streaming platforms have turned music into a walled garden of monthly paywalls,
              intrusive audio ads, algorithmic lock-in, and aggressive behavioral tracking.
            </p>
            <p className="text-xs text-zinc-400 mt-2 font-mono">
              b33t breaks that mold: Zero Subscriptions. Zero Ads. Zero Telemetry. 100% Freedom.
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Flame className="w-4 h-4 text-emerald-400" />
                <span>Zero Subscriptions</span>
              </div>
              <p className="text-xs text-zinc-400">
                Complete access to the world&apos;s music catalog without credit card numbers, recurring monthly fees, or tier restrictions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Zero Audio Ads</span>
              </div>
              <p className="text-xs text-zinc-400">
                Pure, uninterrupted playback from start to finish. No 30-second commercial interruptions ruining your focus.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Private by Default (Zero Telemetry)</span>
              </div>
              <p className="text-xs text-zinc-400">
                Runs locally on your machine (<code className="text-emerald-400">127.0.0.1</code>). What you listen to remains your business alone.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Native Opus 251 High-Fidelity</span>
              </div>
              <p className="text-xs text-zinc-400">
                Streams uncompressed Opus format 251 audio directly without lossy FFmpeg re-encoding.
              </p>
            </div>
          </div>

          {/* Comparison Matrix */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              b33t vs Commercial Streaming Monopolies
            </h3>
            <div className="rounded-xl border border-white/5 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-white/[0.03] text-zinc-400 border-b border-white/5">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Dimension</th>
                    <th className="py-2.5 px-4 font-semibold text-emerald-400">b33t Player</th>
                    <th className="py-2.5 px-4 font-semibold text-zinc-500">Corporate Walled Gardens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Monthly Cost</td>
                    <td className="py-2.5 px-4 text-emerald-400 font-mono">$0.00 / Forever Free</td>
                    <td className="py-2.5 px-4 text-zinc-400">$11.99 - $19.99 / month</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Audio Advertisements</td>
                    <td className="py-2.5 px-4 text-emerald-400">0% (Strictly None)</td>
                    <td className="py-2.5 px-4 text-zinc-400">Aggressive commercial breaks</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Tracking & Telemetry</td>
                    <td className="py-2.5 px-4 text-emerald-400">Zero (Local 127.0.0.1)</td>
                    <td className="py-2.5 px-4 text-zinc-400">Continuous behavioural profiling</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Audio Compression</td>
                    <td className="py-2.5 px-4 text-emerald-400 font-mono">Native Opus 251 (~160kbps)</td>
                    <td className="py-2.5 px-4 text-zinc-400">Dynamic AAC / MP3 re-encoding</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Offline Storage</td>
                    <td className="py-2.5 px-4 text-emerald-400 font-mono">audio_cache/*.opus</td>
                    <td className="py-2.5 px-4 text-zinc-400">DRM encrypted blobs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#08090d] border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono text-[11px] text-zinc-500">Released under the MIT License</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1ed760] text-black font-semibold hover:bg-emerald-400 transition-colors"
          >
            Join the Movement
          </button>
        </div>
      </div>
    </div>
  );
};
