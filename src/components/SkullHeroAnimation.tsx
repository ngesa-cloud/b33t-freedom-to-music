import React, { useState } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface SkullHeroAnimationProps {
  onStreamAll: () => void;
  onOpenVisualizer?: () => void;
  onOpenEqualizer?: () => void;
}

export const SkullHeroAnimation: React.FC<SkullHeroAnimationProps> = ({
  onStreamAll,
}) => {
  const { isPlaying, currentTrack, togglePlay } = useMusicPlayer();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (currentTrack) {
      togglePlay();
    } else {
      onStreamAll();
    }
  };

  return (
    <section className="relative rounded-3xl overflow-hidden py-10 px-6 bg-[#0b0b0f] border border-[#16161d] flex items-center justify-center">
      <div
        className="relative flex items-center justify-center shrink-0 cursor-pointer select-none group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        title={isPlaying ? 'Click skull to pause' : 'Click skull to play'}
      >
        {/* SVG Animated Skull & Headphones Graphic */}
        <div
          className={`w-48 h-48 md:w-56 md:h-56 transition-transform duration-300 ${
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
              <rect x="100" y="162" width="6" height="11" rx="1.5" fill="#f1f5f9" stroke="#0a0a0e" strokeWidth="1" />
              <rect x="108" y="162" width="7" height="12" rx="1.5" fill="#ffffff" stroke="#0a0a0e" strokeWidth="1" />
              <rect x="117" y="162" width="6.5" height="12" rx="1.5" fill="#ffffff" stroke="#0a0a0e" strokeWidth="1" />
              <rect x="125" y="162" width="7" height="12" rx="1.5" fill="#ffffff" stroke="#0a0a0e" strokeWidth="1" />
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
      </div>
    </section>
  );
};

