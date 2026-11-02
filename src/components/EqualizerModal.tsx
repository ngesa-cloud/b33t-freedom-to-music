import React from 'react';
import { X, Sliders, RotateCcw, Sparkles } from 'lucide-react';
import { useMusicPlayer, EQ_PRESETS } from '../context/MusicPlayerContext';
import { EqBandSettings } from '../types/music';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const { eqSettings, activeEqPreset, setEqBand, applyEqPreset } = useMusicPlayer();

  if (!isOpen) return null;

  const bandsConfig: { label: string; sub: string; key: keyof EqBandSettings; val: number }[] = [
    { label: '60 Hz', sub: 'Sub-Bass', key: 'band60', val: eqSettings.band60 },
    { label: '250 Hz', sub: 'Low-Mid', key: 'band250', val: eqSettings.band250 },
    { label: '1 kHz', sub: 'Presence', key: 'band1000', val: eqSettings.band1000 },
    { label: '4 kHz', sub: 'Crispness', key: 'band4000', val: eqSettings.band4000 },
    { label: '12 kHz', sub: 'Air', key: 'band12000', val: eqSettings.band12000 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121216] border border-[#1e1e24] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#1e1e24] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#1DB954] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">5-Band Parametric Equalizer</h2>
              <p className="text-xs text-[#8a8a92]">Real BiquadFilterNode Peaking Chain (-12 dB to +12 dB)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#8a8a92] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Preset Buttons */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8a8a92] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                EQ Presets
              </span>
              <button
                onClick={() => applyEqPreset('Flat')}
                className="text-xs text-[#8a8a92] hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Flat
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {EQ_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyEqPreset(preset.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeEqPreset === preset.name
                      ? 'bg-[#1DB954] text-black font-semibold shadow'
                      : 'bg-[#1a1a20] text-[#8a8a92] hover:text-white hover:bg-[#22222a] border border-[#1e1e24]'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Equalizer Sliders Strip */}
          <div className="bg-[#0a0a0c] border border-[#1e1e24] rounded-xl p-5">
            <div className="grid grid-cols-5 gap-3">
              {bandsConfig.map((col) => (
                <div key={col.key} className="flex flex-col items-center gap-3">
                  <span className="text-[11px] font-mono text-[#8a8a92] tabular-nums">
                    {col.val > 0 ? `+${col.val.toFixed(1)}` : col.val.toFixed(1)} dB
                  </span>

                  {/* Vertical Slider */}
                  <div className="h-36 flex items-center justify-center py-2 relative">
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={col.val}
                      onChange={(e) => setEqBand(col.key, parseFloat(e.target.value))}
                      className="h-32 w-2 appearance-none bg-zinc-800 rounded-lg cursor-pointer accent-[#1DB954]"
                      style={{
                        writingMode: 'vertical-lr',
                        direction: 'rtl',
                      }}
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-bold text-white font-mono">{col.label}</p>
                    <p className="text-[10px] text-[#8a8a92]">{col.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#121216] border-t border-[#1e1e24] flex items-center justify-between text-xs text-[#8a8a92]">
          <span className="text-[11px] font-mono text-[#1DB954]">Profile: {activeEqPreset} (Saved)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
