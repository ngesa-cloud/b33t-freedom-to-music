import { EqBandSettings } from '../types/music';

class AudioEngine {
  public audio: HTMLAudioElement;
  public audioContext: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private eqBands: BiquadFilterNode[] = [];
  private analyser: AnalyserNode | null = null;

  // Stereo channel analysers
  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;
  private splitter: ChannelSplitterNode | null = null;

  private isConnected = false;
  private timeUpdateListeners: Set<(currentTime: number) => void> = new Set();

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    // Bind timeupdate event to dispatch currentTime
    this.audio.addEventListener('timeupdate', () => {
      const time = this.audio.currentTime;
      for (const listener of this.timeUpdateListeners) {
        listener(time);
      }
    });

    // Ensure AudioContext is resumed on the first user interaction
    if (typeof window !== 'undefined') {
      const handleFirstInteraction = () => {
        this.resumeContext();
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('keydown', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      };

      window.addEventListener('click', handleFirstInteraction, { passive: true, once: true });
      window.addEventListener('keydown', handleFirstInteraction, { passive: true, once: true });
      window.addEventListener('touchstart', handleFirstInteraction, { passive: true, once: true });
    }
  }

  // Subscribe to timeupdate events to sync external state with audio.currentTime
  public onTimeUpdate(callback: (currentTime: number) => void): () => void {
    this.timeUpdateListeners.add(callback);
    callback(this.audio.currentTime);
    return () => {
      this.timeUpdateListeners.delete(callback);
    };
  }

  // Resume AudioContext on user interaction
  public async resumeContext(): Promise<void> {
    this.init();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[AudioEngine] AudioContext state is "suspended". Resuming on user interaction...');
      try {
        await this.audioContext.resume();
        console.log(`[AudioEngine] AudioContext resumed successfully. State: "${this.audioContext.state}"`);
      } catch (err) {
        console.warn('[AudioEngine] AudioContext resume failed on user interaction:', err);
      }
    }
  }

  public init() {
    if (this.audioContext && this.isConnected) return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!this.audioContext) {
      this.audioContext = new AudioContextClass();
    }

    if (!this.source && this.audioContext) {
      try {
        this.source = this.audioContext.createMediaElementSource(this.audio);

        // 5-band parametric peaking EQ (60, 250, 1000, 4000, 12000)
        const frequencies = [60, 250, 1000, 4000, 12000];
        this.eqBands = frequencies.map((freq) => {
          const filter = this.audioContext!.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1.0;
          filter.gain.value = 0;
          return filter;
        });

        // Master Analyser (fftSize = 2048)
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.85;

        // Stereo Splitter for Left/Right VU meters
        this.splitter = this.audioContext.createChannelSplitter(2);
        this.leftAnalyser = this.audioContext.createAnalyser();
        this.leftAnalyser.fftSize = 256;
        this.rightAnalyser = this.audioContext.createAnalyser();
        this.rightAnalyser.fftSize = 256;

        // Routing Chain: Source -> EQ[0..4] -> Analyser -> Destination
        this.source.connect(this.eqBands[0]);
        for (let i = 0; i < this.eqBands.length - 1; i++) {
          this.eqBands[i].connect(this.eqBands[i + 1]);
        }
        this.eqBands[this.eqBands.length - 1].connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // Stereo split routing
        this.source.connect(this.splitter);
        this.splitter.connect(this.leftAnalyser, 0);
        this.splitter.connect(this.rightAnalyser, 1);

        this.isConnected = true;
      } catch (err) {
        console.warn('[AudioEngine] Web Audio routing warning:', err);
      }
    }
  }

  public async play(): Promise<void> {
    this.init();

    // Check if AudioContext state is suspended and resume before play()
    if (this.audioContext) {
      console.log(`[AudioEngine] AudioContext state before calling play(): "${this.audioContext.state}"`);
      if (this.audioContext.state === 'suspended') {
        console.log('[AudioEngine] AudioContext state is "suspended". Resuming before play()...');
        try {
          await this.audioContext.resume();
          console.log(`[AudioEngine] AudioContext successfully resumed. State is now: "${this.audioContext.state}"`);
        } catch (err) {
          console.warn('[AudioEngine] AudioContext resume error before play():', err);
        }
      } else if (this.audioContext.state !== 'running') {
        try {
          await this.audioContext.resume();
        } catch (err) {
          console.warn('[AudioEngine] AudioContext resume warning:', err);
        }
      }
    }

    try {
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        console.warn('[AudioEngine] Autoplay paused: user gesture required by browser policy.');
      } else {
        console.warn('[AudioEngine] audio.play() prevented or failed:', err?.message);
      }
      throw err;
    }
  }

  public pause() {
    this.audio.pause();
  }

  public setSrc(url: string) {
    this.init();
    try {
      const resolved = new URL(url, window.location.href).href;
      if (this.audio.src !== resolved && this.audio.src !== url) {
        this.audio.src = url;
        this.audio.load();
      }
    } catch {
      if (this.audio.src !== url) {
        this.audio.src = url;
        this.audio.load();
      }
    }
  }

  public seek(seconds: number) {
    if (isFinite(seconds) && seconds >= 0) {
      this.audio.currentTime = seconds;
    }
  }

  public setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  public setMuted(muted: boolean) {
    this.audio.muted = muted;
  }

  public setEq(settings: EqBandSettings) {
    if (this.eqBands.length < 5 || !this.audioContext) return;
    const now = this.audioContext.currentTime;
    this.eqBands[0].gain.setValueAtTime(settings.band60, now);
    this.eqBands[1].gain.setValueAtTime(settings.band250, now);
    this.eqBands[2].gain.setValueAtTime(settings.band1000, now);
    this.eqBands[3].gain.setValueAtTime(settings.band4000, now);
    this.eqBands[4].gain.setValueAtTime(settings.band12000, now);
  }

  private externalPlaying = false;

  public setExternalPlaying(playing: boolean) {
    this.externalPlaying = playing;
  }

  public getFrequencyData(): Uint8Array {
    if (this.analyser && !this.audio.paused) {
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      return data;
    }
    if (this.externalPlaying) {
      const t = performance.now() / 1000;
      const data = new Uint8Array(1024);
      for (let i = 0; i < 1024; i++) {
        const harmonic =
          Math.sin(i * 0.05 + t * 4) * 0.3 +
          Math.sin(i * 0.12 - t * 2.5) * 0.25 +
          Math.cos(i * 0.02 + t * 1.5) * 0.45;
        const decay = Math.exp(-i / 180);
        const val = Math.max(0, Math.min(255, Math.floor((harmonic + 1) * 110 * decay + 15)));
        data[i] = val;
      }
      return data;
    }
    return new Uint8Array(1024);
  }

  public getTimeDomainData(): Uint8Array {
    if (this.analyser && !this.audio.paused) {
      const data = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(data);
      return data;
    }
    if (this.externalPlaying) {
      const t = performance.now() / 1000;
      const data = new Uint8Array(1024);
      for (let i = 0; i < 1024; i++) {
        const wave = Math.sin((i / 1024) * Math.PI * 8 + t * 5) * 40;
        data[i] = Math.min(255, Math.max(0, Math.floor(128 + wave)));
      }
      return data;
    }
    const flat = new Uint8Array(1024);
    flat.fill(128);
    return flat;
  }

  public getStereoLevels(): { leftDb: number; rightDb: number; leftNorm: number; rightNorm: number } {
    if (this.leftAnalyser && this.rightAnalyser && !this.audio.paused) {
      const leftData = new Uint8Array(this.leftAnalyser.frequencyBinCount);
      const rightData = new Uint8Array(this.rightAnalyser.frequencyBinCount);
      this.leftAnalyser.getByteFrequencyData(leftData);
      this.rightAnalyser.getByteFrequencyData(rightData);

      const leftAvg = leftData.reduce((acc, v) => acc + v, 0) / leftData.length;
      const rightAvg = rightData.reduce((acc, v) => acc + v, 0) / rightData.length;

      const leftNorm = Math.min(1, leftAvg / 200);
      const rightNorm = Math.min(1, rightAvg / 200);

      const leftDb = leftNorm > 0 ? Math.round(20 * Math.log10(leftNorm)) : -60;
      const rightDb = rightNorm > 0 ? Math.round(20 * Math.log10(rightNorm)) : -60;

      return { leftDb, rightDb, leftNorm, rightNorm };
    }
    if (this.externalPlaying) {
      const t = performance.now() / 1000;
      const pulseL = 0.5 + 0.3 * Math.sin(t * 4);
      const pulseR = 0.5 + 0.3 * Math.cos(t * 4);
      return {
        leftDb: Math.round(20 * Math.log10(pulseL)),
        rightDb: Math.round(20 * Math.log10(pulseR)),
        leftNorm: pulseL,
        rightNorm: pulseR,
      };
    }
    return { leftDb: -60, rightDb: -60, leftNorm: 0, rightNorm: 0 };
  }
}

export const audioEngine = new AudioEngine();
