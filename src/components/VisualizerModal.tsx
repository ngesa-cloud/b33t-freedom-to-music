import React, { useEffect, useRef, useState } from 'react';
import { X, BarChart3, Activity, Disc, Layers } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { VisualizerMode } from '../types/music';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface VisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VisualizerModal: React.FC<VisualizerModalProps> = ({ isOpen, onClose }) => {
  const { currentTrack, isPlaying } = useMusicPlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('bars');
  const animFrameRef = useRef<number | null>(null);

  // Peak caps decay tracker for Frequency Bars
  const peakCapsRef = useRef<number[]>(new Array(64).fill(0));
  const peakDecayRef = useRef<number[]>(new Array(64).fill(0));

  useEffect(() => {
    if (!isOpen) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let pulseRadius = 70;

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;

      // Clean dark canvas clear
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, width, height);

      if (mode === 'bars') {
        const freqData = audioEngine.getFrequencyData();
        const barCount = 48;
        const barWidth = (width / barCount) * 0.72;
        const gap = (width / barCount) * 0.28;

        for (let i = 0; i < barCount; i++) {
          // Sample lower/mid-focused bins
          const dataIndex = Math.floor((i / barCount) * 280);
          const rawVal = isPlaying ? freqData[dataIndex] || 0 : 0; // Flatline if paused
          const barHeight = Math.max(2, (rawVal / 255) * (height * 0.78));

          const x = i * (barWidth + gap) + gap / 2;
          const y = height - barHeight - 24;

          // Gradient fill
          const gradient = ctx.createLinearGradient(0, height, 0, y);
          gradient.addColorStop(0, '#00e0a0');
          gradient.addColorStop(0.7, '#1DB954');
          gradient.addColorStop(1, '#6ee7b7');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
          ctx.fill();

          // Decaying peak caps
          if (rawVal > peakCapsRef.current[i]) {
            peakCapsRef.current[i] = rawVal;
            peakDecayRef.current[i] = 0;
          } else {
            peakDecayRef.current[i] += 0.8;
            peakCapsRef.current[i] = Math.max(0, peakCapsRef.current[i] - peakDecayRef.current[i]);
          }

          const capHeight = Math.max(2, (peakCapsRef.current[i] / 255) * (height * 0.78));
          const capY = height - capHeight - 26;

          ctx.fillStyle = '#a7f3d0';
          ctx.fillRect(x, capY, barWidth, 2);
        }
      } else if (mode === 'wave') {
        const timeData = audioEngine.getTimeDomainData();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#1DB954';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00e0a0';

        ctx.beginPath();
        const sliceWidth = width / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'pulse') {
        const freqData = audioEngine.getFrequencyData();
        const centerX = width / 2;
        const centerY = height / 2;

        // Map bass bins (0-12) to pulsing radius
        let bassSum = 0;
        for (let b = 0; b <= 12; b++) {
          bassSum += freqData[b] || 0;
        }
        const bassAvg = isPlaying ? bassSum / 13 : 0;
        const targetRadius = 65 + (bassAvg / 255) * 90;
        pulseRadius += (targetRadius - pulseRadius) * 0.2;

        // Radiating ripples
        for (let r = 3; r >= 1; r--) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, pulseRadius + r * 28, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 224, 160, ${0.16 / r})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Center pulsing orb
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, pulseRadius);
        grad.addColorStop(0, '#00e0a0');
        grad.addColorStop(0.7, '#1DB954');
        grad.addColorStop(1, '#064e3b');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Core hub
        ctx.beginPath();
        ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0c';
        ctx.fill();
      } else if (mode === 'stereo') {
        const { leftDb, rightDb, leftNorm, rightNorm } = audioEngine.getStereoLevels();
        const meterWidth = Math.min(width * 0.36, 200);
        const meterHeight = 28;
        const startY = height / 2 - 35;

        // Left Channel Bar
        const lX = width / 2 - meterWidth - 25;
        ctx.fillStyle = '#16161c';
        ctx.fillRect(lX, startY, meterWidth, meterHeight);

        const lGrad = ctx.createLinearGradient(lX, 0, lX + meterWidth, 0);
        lGrad.addColorStop(0, '#1DB954');
        lGrad.addColorStop(0.7, '#00e0a0');
        lGrad.addColorStop(0.9, '#f59e0b');
        lGrad.addColorStop(1, '#ef4444');
        ctx.fillStyle = lGrad;
        ctx.fillRect(lX, startY, meterWidth * leftNorm, meterHeight);

        // Right Channel Bar
        const rX = width / 2 + 25;
        ctx.fillStyle = '#16161c';
        ctx.fillRect(rX, startY, meterWidth, meterHeight);

        const rGrad = ctx.createLinearGradient(rX, 0, rX + meterWidth, 0);
        rGrad.addColorStop(0, '#1DB954');
        rGrad.addColorStop(0.7, '#00e0a0');
        rGrad.addColorStop(0.9, '#f59e0b');
        rGrad.addColorStop(1, '#ef4444');
        ctx.fillStyle = rGrad;
        ctx.fillRect(rX, startY, meterWidth * rightNorm, meterHeight);

        // Readout Text
        ctx.fillStyle = '#8a8a92';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText(`CH 1 (L): ${leftDb} dB`, lX, startY - 10);
        ctx.fillText(`CH 2 (R): ${rightDb} dB`, rX, startY - 10);

        // Tick marks (-30dB, -18dB, -6dB, 0dB)
        [-30, -18, -6, 0].forEach((db) => {
          const ratio = (db + 60) / 60;
          ctx.fillStyle = '#3a3a44';
          ctx.fillRect(lX + meterWidth * ratio, startY + meterHeight + 4, 1, 6);
          ctx.fillRect(rX + meterWidth * ratio, startY + meterHeight + 4, 1, 6);
        });
      }
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, mode, isPlaying]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-[#121216] border border-[#1e1e24] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#1e1e24] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#1DB954] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Real-Time Audio Visualizer</h2>
              <p className="text-xs text-[#8a8a92]">
                {currentTrack ? `${currentTrack.title} · ${currentTrack.artist}` : 'No Track Playing'}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#1a1a20] p-1 rounded-lg border border-[#1e1e24]">
            <button
              onClick={() => setMode('bars')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'bars' ? 'bg-[#1DB954] text-black shadow' : 'text-[#8a8a92] hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bars</span>
            </button>
            <button
              onClick={() => setMode('wave')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'wave' ? 'bg-[#1DB954] text-black shadow' : 'text-[#8a8a92] hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Wave</span>
            </button>
            <button
              onClick={() => setMode('pulse')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'pulse' ? 'bg-[#1DB954] text-black shadow' : 'text-[#8a8a92] hover:text-white'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Pulse</span>
            </button>
            <button
              onClick={() => setMode('stereo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'stereo' ? 'bg-[#1DB954] text-black shadow' : 'text-[#8a8a92] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stereo</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#8a8a92] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visualizer Canvas */}
        <div className="relative w-full h-[380px] bg-[#0a0a0c] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={380}
            className="w-full h-full block"
          />
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-[#121216] border-t border-[#1e1e24] flex items-center justify-between text-xs text-[#8a8a92]">
          <span className="font-mono text-[11px] text-[#00e0a0]">
            AnalyserNode · FFT Size: 2048 · ChannelSplitterNode Connected
          </span>
          <span className="text-[11px]">Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
