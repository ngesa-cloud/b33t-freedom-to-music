import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Activity, Sliders, Radio, Sparkles } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { audioEngine } from '../audio/AudioEngine';

interface SkullHeroAnimationProps {
  onStreamAll: () => void;
  onOpenVisualizer?: () => void;
  onOpenEqualizer?: () => void;
}

export const SkullHeroAnimation: React.FC<SkullHeroAnimationProps> = ({
  onStreamAll,
  onOpenVisualizer,
  onOpenEqualizer,
}) => {
  const { isPlaying, currentTrack, togglePlay } = useMusicPlayer();
  const [isHovered, setIsHovered] = useState(false);
  const [eqLevels, setEqLevels] = useState<number[]>([40, 65, 85, 60, 45, 75, 90, 50]);

  // Audio frequency data polling for real-time reactive bar pulsation
  useEffect(() => {
    let animId: number;

    const updateBars = () => {
      if (isPlaying) {
        const freqData = audioEngine.getFrequencyData();
        if (freqData && freqData.length > 0) {
          const samples = [
            freqData[2] || 60,
            freqData[6] || 80,
            freqData[12] || 110,
            freqData[20] || 90,
            freqData[32] || 70,
            freqData[48] || 85,
            freqData[64] || 95,
            freqData[80] || 60,
          ];
          setEqLevels(samples.map((v) => Math.max(15, Math.min(100, (v / 255) * 100))));
        } else {
          // Fallback rhythmic sine simulation
          const t = Date.now() / 250;
          setEqLevels([
            50 + Math.sin(t) * 35,
            65 + Math.cos(t * 1.2) * 30,
            85 + Math.sin(t * 0.8) * 25,
            60 + Math.cos(t * 1.5) * 35,
            45 + Math.sin(t * 1.1) * 30,
            75 + Math.cos(t * 0.9) * 30,
            90 + Math.sin(t * 1.3) * 20,
            55 + Math.cos(t * 1.4) * 30,
          ]);
        }
      } else {
        // Idle gentle pulse
        setEqLevels([25, 35, 45, 35, 25, 40, 50, 30]);
      }
      animId = requestAnimationFrame(updateBars);
    };

    animId = requestAnimationFrame(updateBars);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return (
    <section className="relative rounded-3xl overflow-hidden p-6 md:p-8 border border-[#1e1e24] bg-gradient-to-r from-[#0d1410] via-[#121218] to-[#0a0a0e] shadow-2xl transition-all duration-300">
      {/* Background Cyber Ambient Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-[#1DB954]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12">
        {/* Left: ANIMATED SKULL WITH DJ HEADPHONES */}
        <div
          className="relative flex items-center justify-center shrink-0 cursor-pointer select-none group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={togglePlay}
          title={isPlaying ? 'Click skull to pause' : 'Click skull to play'}
        >
          {/* Soundwave expanding ripple rings behind earcups */}
          {isPlaying && (
            <>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-[#1DB954]/40 animate-ping pointer-events-none" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-[#00e0a0]/40 animate-ping [animation-delay:0.3s] pointer-events-none" />
            </>
          )}

          {/* SVG Animated Skull & Headphones Graphic */}
          <div
            className={`w-52 h-52 md:w-64 md:h-64 transition-transform duration-300 ${
              isPlaying
                ? 'animate-[skullBounce_1.2s_ease-in-out_infinite]'
                : isHovered
                ? 'scale-105'
                : 'hover:scale-102'
            }`}
          >
            <svg
              viewBox="0 0 240 240"
              className="w-full h-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.8)] filter"
            >
              <defs>
                {/* Neon Emerald Gradients */}
                <linearGradient id="neonGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00e0a0" />
                  <stop offset="100%" stopColor="#1DB954" />
                </linearGradient>

                <linearGradient id="skullBoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#252530" />
                  <stop offset="50%" stopColor="#191922" />
                  <stop offset="100%" stopColor="#101016" />
                </linearGradient>

                <linearGradient id="headbandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1DB954" />
                  <stop offset="50%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#1DB954" />
                </linearGradient>

                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Headphone Audio Arc (Top Headband) */}
              <path
                d="M 52 110 C 48 30, 192 30, 188 110"
                fill="none"
                stroke="url(#headbandGrad)"
                strokeWidth="9"
                strokeLinecap="round"
                filter="url(#neonGlow)"
              />
              <path
                d="M 64 85 C 75 48, 165 48, 176 85"
                fill="none"
                stroke="#181822"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Headband Padding Cushions */}
              <rect x="88" y="38" width="64" height="8" rx="4" fill="#0d0d12" stroke="#1DB954" strokeWidth="1" />

              {/* === SKULL CRANIUM === */}
              {/* Main Cranium Dome */}
              <path
                d="M 72 110 C 68 62, 172 62, 168 110 C 168 132, 158 142, 150 148 C 146 151, 145 162, 142 174 L 98 174 C 95 162, 94 151, 90 148 C 82 142, 72 132, 72 110 Z"
                fill="url(#skullBoneGrad)"
                stroke="#2a2a36"
                strokeWidth="2.5"
              />

              {/* Brow Ridge Line */}
              <path
                d="M 80 114 Q 100 112 120 118 Q 140 112 160 114"
                fill="none"
                stroke="#333342"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Left Eye Socket */}
              <path
                d="M 83 124 C 81 114, 107 113, 111 123 C 114 133, 107 146, 96 146 C 85 146, 82 135, 83 124 Z"
                fill="#08080c"
                stroke="#1DB954"
                strokeWidth="2"
                filter={isPlaying ? 'url(#neonGlow)' : undefined}
              />
              {/* Left Eye Glowing Iris/Core */}
              <circle
                cx="97"
                cy="129"
                r={isPlaying ? 4.5 : 3.5}
                fill="#00e0a0"
                className={isPlaying ? 'animate-pulse' : ''}
                filter="url(#neonGlow)"
              />

              {/* Right Eye Socket */}
              <path
                d="M 129 123 C 133 113, 159 114, 157 124 C 158 135, 155 146, 144 146 C 133 146, 126 133, 129 123 Z"
                fill="#08080c"
                stroke="#1DB954"
                strokeWidth="2"
                filter={isPlaying ? 'url(#neonGlow)' : undefined}
              />
              {/* Right Eye Glowing Iris/Core */}
              <circle
                cx="143"
                cy="129"
                r={isPlaying ? 4.5 : 3.5}
                fill="#00e0a0"
                className={isPlaying ? 'animate-pulse' : ''}
                filter="url(#neonGlow)"
              />

              {/* Nasal Cavity (Inverted Heart) */}
              <path
                d="M 120 138 C 116 142, 114 150, 117 154 C 119 157, 121 156, 120 157 C 119 156, 121 157, 123 154 C 126 150, 124 142, 120 138 Z"
                fill="#07070b"
                stroke="#1f1f2a"
                strokeWidth="1.5"
              />

              {/* Cheekbone (Zygomatic) Accents */}
              <path
                d="M 75 138 Q 84 144 92 147"
                fill="none"
                stroke="#2a2a38"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 165 138 Q 156 144 148 147"
                fill="none"
                stroke="#2a2a38"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Upper Teeth & Jaw */}
              <g className="transition-opacity">
                {/* Tooth 1 */}
                <rect x="100" y="162" width="6" height="11" rx="1.5" fill="#f1f5f9" stroke="#0a0a0e" strokeWidth="1" />
                {/* Tooth 2 */}
                <rect x="108" y="162" width="7" height="12" rx="1.5" fill="#ffffff" stroke="#0a0a0e" strokeWidth="1" />
                {/* Tooth 3 */}
                <rect x="117" y="162" width="6.5" height="12" rx="1.5" fill="#ffffff" stroke="#0a0a0e" strokeWidth="1" />
                {/* Tooth 4 */}
                <rect x="125" y="162" width="7" height="12" rx="1.5" fill="#ffffff" stroke="#0a0a0e" strokeWidth="1" />
                {/* Tooth 5 */}
                <rect x="134" y="162" width="6" height="11" rx="1.5" fill="#f1f5f9" stroke="#0a0a0e" strokeWidth="1" />
              </g>

              {/* Lower Jaw Line & Chin */}
              <path
                d="M 103 178 C 103 186, 137 186, 137 178 Z"
                fill="#161620"
                stroke="#2a2a38"
                strokeWidth="2"
              />

              {/* === DJ HEADPHONES EARCUPS === */}
              {/* Left Earcup Bracket & Cushion */}
              <rect x="36" y="94" width="22" height="54" rx="11" fill="#0c0c12" stroke="#2a2a38" strokeWidth="2" />
              <ellipse
                cx="46"
                cy="121"
                rx="8"
                ry="21"
                fill="#12121c"
                stroke="url(#neonGreenGrad)"
                strokeWidth="2.5"
                filter="url(#neonGlow)"
              />
              {/* Left Earcup Inner Speaker Mesh Dot Pattern */}
              <circle cx="46" cy="121" r="3" fill="#1DB954" />

              {/* Right Earcup Bracket & Cushion */}
              <rect x="182" y="94" width="22" height="54" rx="11" fill="#0c0c12" stroke="#2a2a38" strokeWidth="2" />
              <ellipse
                cx="194"
                cy="121"
                rx="8"
                ry="21"
                fill="#12121c"
                stroke="url(#neonGreenGrad)"
                strokeWidth="2.5"
                filter="url(#neonGlow)"
              />
              {/* Right Earcup Inner Speaker Mesh Dot Pattern */}
              <circle cx="194" cy="121" r="3" fill="#1DB954" />

              {/* DJ Audio Cable Hanging */}
              <path
                d="M 46 148 Q 42 195 72 205 Q 102 215 110 230"
                fill="none"
                stroke="#1DB954"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={isPlaying ? '4 2' : 'none'}
              />
            </svg>
          </div>

          {/* Quick Play/Pause Hover Badge on Skull */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px] rounded-full w-48 h-48 m-auto pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-2xl">
              {isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-0.5" />}
            </div>
          </div>
        </div>

        {/* Right / Center: EQUALIZER WINGS & BEAT REACTOR CONTROLS */}
        <div className="flex-1 max-w-2xl space-y-5 text-center lg:text-left">
          {/* Status Header Badge */}
          <div className="flex items-center justify-center lg:justify-start gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-[#1DB954] text-xs font-mono font-bold border border-emerald-500/30 shadow-inner">
              <span className={`w-2 h-2 rounded-full bg-[#1DB954] ${isPlaying ? 'animate-ping' : ''}`} />
              {isPlaying ? 'SOUND REACTOR ACTIVE' : 'b33t AUDIO REACTOR'}
            </span>
            <span className="text-xs text-[#8a8a92] font-mono">
              Opus 251 High-Fidelity · 0 Telemetry
            </span>
          </div>

          {/* Headline & Audio Visualizer Pulse */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
              Feel the Rhythm.
            </h1>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed max-w-xl">
              Unrestricted, zero-ad music streaming directly on your laptop. Studio-grade sound shaping with real-time Web Audio spectrum analysis.
            </p>
          </div>

          {/* Real-time Frequency Spectrum Bars */}
          <div className="py-2 flex items-center justify-center lg:justify-start gap-2 h-14">
            {eqLevels.map((lvl, i) => (
              <div
                key={i}
                className="w-2.5 md:w-3.5 rounded-full transition-all duration-75"
                style={{
                  height: `${lvl}%`,
                  background: isPlaying
                    ? `linear-gradient(to top, #1DB954, #00e0a0, #a7f3d0)`
                    : `#2a2a36`,
                  boxShadow: isPlaying ? '0 0 10px rgba(29, 185, 84, 0.4)' : 'none',
                }}
              />
            ))}
            {currentTrack && isPlaying && (
              <div className="ml-4 text-left hidden sm:block">
                <p className="text-xs font-bold text-white truncate max-w-[240px]">
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-[#1DB954] truncate">{currentTrack.artist}</p>
              </div>
            )}
          </div>

          {/* Action Triggers */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
            <button
              onClick={onStreamAll}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#1DB954] hover:bg-[#00e0a0] text-black font-extrabold text-xs md:text-sm active:scale-95 transition-all shadow-xl shadow-[#1DB954]/25"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>{isPlaying ? 'Stream Popular Hits' : 'Stream All Hits'}</span>
            </button>

            {onOpenVisualizer && (
              <button
                onClick={onOpenVisualizer}
                className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#161620] hover:bg-[#20202e] border border-[#1e1e24] hover:border-white/20 text-white font-semibold text-xs md:text-sm transition-all shadow-md"
              >
                <Activity className="w-4 h-4 text-[#1DB954]" />
                <span>Audio Visualizer</span>
              </button>
            )}

            {onOpenEqualizer && (
              <button
                onClick={onOpenEqualizer}
                className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#161620] hover:bg-[#20202e] border border-[#1e1e24] hover:border-white/20 text-zinc-300 hover:text-white font-semibold text-xs md:text-sm transition-all shadow-md"
              >
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>5-Band EQ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
