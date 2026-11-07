import { Capacitor } from '@capacitor/core';
import { AudioPlayer } from '@mediagrid/capacitor-native-audio';
import { Track } from '../types/music';

export type NativeAudioState = 'playing' | 'paused' | 'stopped' | 'ended' | 'buffering';

type StateCallback = (state: NativeAudioState) => void;
type TimeCallback = (currentTime: number, duration: number) => void;
type ErrorCallback = (error: unknown, streamUrl: string) => void;

const NATIVE_AUDIO_ID = 'b33t-primary-stream';

export class NativeAudioEngine {
  private isCreated = false;
  private isInitialized = false;
  private isReady = false;
  private pendingAutoPlay = false;
  private currentStreamUrl = '';
  private currentVolume = 0.85;
  private isMuted = false;
  private cachedCurrentTime = 0;
  private cachedDuration = 0;
  private pollInterval: number | null = null;
  private operationChain: Promise<void> = Promise.resolve();

  private stateCallbacks: Set<StateCallback> = new Set();
  private timeCallbacks: Set<TimeCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();

  public isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  private normalizeArtworkUrl(track: Track): string {
    const fallbackId =
      track.video_id && /^[a-zA-Z0-9_-]{11}$/.test(track.video_id)
        ? track.video_id
        : 'Or2sMfOcTtw';
    const raw = track.thumbnail || `https://i.ytimg.com/vi/${fallbackId}/hqdefault.jpg`;
    if (raw.startsWith('http://')) {
      return raw.replace(/^http:\/\//i, 'https://');
    }
    if (!raw.startsWith('https://')) {
      return `https://i.ytimg.com/vi/${fallbackId}/hqdefault.jpg`;
    }
    return raw;
  }

  private enqueueOperation(task: () => Promise<void>): Promise<void> {
    this.operationChain = this.operationChain.then(task).catch((err) => {
      console.warn('[NativeAudioEngine] Operation error:', err);
    });
    return this.operationChain;
  }

  /**
   * Loads and plays a direct HTTP/HTTPS audio stream URL via Android's native
   * ExoPlayer + Media3 MediaSessionService (@mediagrid/capacitor-native-audio).
   */
  public loadAndPlay(track: Track, streamUrl: string): Promise<void> {
    if (!this.isSupported()) return Promise.resolve();

    const friendlyTitle = track.title || 'b33t Track';
    const artistName = track.artist || 'b33t Artist';
    const albumTitle = track.album || 'b33t Stream';
    const artworkSource = this.normalizeArtworkUrl(track);

    this.currentStreamUrl = streamUrl;
    this.cachedCurrentTime = 0;
    this.cachedDuration = track.duration && track.duration > 35 ? track.duration : 180;
    this.pendingAutoPlay = true;
    this.isReady = false;
    this.emitState('buffering');

    return this.enqueueOperation(async () => {
      try {
        if (!this.isCreated) {
          await AudioPlayer.create({
            audioId: NATIVE_AUDIO_ID,
            audioSource: streamUrl,
            friendlyTitle,
            artistName,
            albumTitle,
            artworkSource,
            useForNotification: true,
            isBackgroundMusic: false,
            loop: false,
            showSeekBackward: true,
            showSeekForward: true,
            seekBackwardTime: 10,
            seekForwardTime: 10,
          });
          this.isCreated = true;

          await this.registerNativeListeners();

          await AudioPlayer.initialize({ audioId: NATIVE_AUDIO_ID });
          this.isInitialized = true;
        } else {
          // Update lock-screen / notification metadata first so buildMediaItem() picks it up
          await AudioPlayer.changeMetadata({
            audioId: NATIVE_AUDIO_ID,
            friendlyTitle,
            artistName,
            albumTitle,
            artworkSource,
          });

          // Switch ExoPlayer stream URI and prepare
          await AudioPlayer.changeAudioSource({
            audioId: NATIVE_AUDIO_ID,
            source: streamUrl,
          });
        }
      } catch (err) {
        console.error('[NativeAudioEngine] loadAndPlay failed, attempting recreate:', err);
        try {
          await this.recreateAndPlay(track, streamUrl);
        } catch (retryErr) {
          this.errorCallbacks.forEach((cb) => cb(retryErr, streamUrl));
        }
      }
    });
  }

  private async recreateAndPlay(track: Track, streamUrl: string): Promise<void> {
    try {
      await AudioPlayer.destroy({ audioId: NATIVE_AUDIO_ID });
    } catch {}
    this.isCreated = false;
    this.isInitialized = false;
    this.isReady = false;

    const friendlyTitle = track.title || 'b33t Track';
    const artistName = track.artist || 'b33t Artist';
    const albumTitle = track.album || 'b33t Stream';
    const artworkSource = this.normalizeArtworkUrl(track);

    await AudioPlayer.create({
      audioId: NATIVE_AUDIO_ID,
      audioSource: streamUrl,
      friendlyTitle,
      artistName,
      albumTitle,
      artworkSource,
      useForNotification: true,
      isBackgroundMusic: false,
      loop: false,
      showSeekBackward: true,
      showSeekForward: true,
      seekBackwardTime: 10,
      seekForwardTime: 10,
    });
    this.isCreated = true;

    await this.registerNativeListeners();
    await AudioPlayer.initialize({ audioId: NATIVE_AUDIO_ID });
    this.isInitialized = true;
  }

  private async registerNativeListeners(): Promise<void> {
    await AudioPlayer.onAudioReady({ audioId: NATIVE_AUDIO_ID }, async () => {
      this.isReady = true;

      try {
        const effectiveVol = this.isMuted ? 0 : this.currentVolume;
        await AudioPlayer.setVolume({
          audioId: NATIVE_AUDIO_ID,
          volume: effectiveVol,
        });
      } catch {}

      try {
        const { duration } = await AudioPlayer.getDuration({ audioId: NATIVE_AUDIO_ID });
        if (typeof duration === 'number' && duration > 0 && isFinite(duration)) {
          this.cachedDuration = duration;
        }
      } catch {}

      if (this.pendingAutoPlay) {
        this.pendingAutoPlay = false;
        try {
          await AudioPlayer.play({ audioId: NATIVE_AUDIO_ID });
          this.emitState('playing');
          this.startPolling();
        } catch (playErr) {
          console.error('[NativeAudioEngine] Auto-play on ready failed:', playErr);
          this.errorCallbacks.forEach((cb) => cb(playErr, this.currentStreamUrl));
        }
      }
    });

    await AudioPlayer.onAudioEnd({ audioId: NATIVE_AUDIO_ID }, () => {
      this.stopPolling();
      this.cachedCurrentTime = 0;
      this.emitState('ended');
    });

    await AudioPlayer.onPlaybackStatusChange({ audioId: NATIVE_AUDIO_ID }, (result) => {
      if (result.status === 'playing') {
        this.emitState('playing');
        this.startPolling();
      } else if (result.status === 'paused') {
        this.emitState('paused');
        this.stopPolling();
      } else if (result.status === 'stopped') {
        this.emitState('stopped');
        this.stopPolling();
      }
    });
  }

  public play(): void {
    if (!this.isSupported() || !this.isInitialized) return;
    this.pendingAutoPlay = true;

    void this.enqueueOperation(async () => {
      if (!this.isReady) return;
      this.pendingAutoPlay = false;
      await AudioPlayer.play({ audioId: NATIVE_AUDIO_ID });
      this.emitState('playing');
      this.startPolling();
    });
  }

  public pause(): void {
    if (!this.isSupported() || !this.isInitialized) return;
    this.pendingAutoPlay = false;

    void this.enqueueOperation(async () => {
      await AudioPlayer.pause({ audioId: NATIVE_AUDIO_ID });
      this.emitState('paused');
      this.stopPolling();
    });
  }

  public stop(): void {
    if (!this.isSupported() || !this.isInitialized) return;
    this.pendingAutoPlay = false;

    void this.enqueueOperation(async () => {
      await AudioPlayer.stop({ audioId: NATIVE_AUDIO_ID });
      this.cachedCurrentTime = 0;
      this.emitState('stopped');
      this.stopPolling();
    });
  }

  public seek(seconds: number): void {
    if (!this.isSupported() || !this.isInitialized) return;
    const clampedSeconds = Math.max(0, Math.floor(seconds));
    this.cachedCurrentTime = clampedSeconds;

    void this.enqueueOperation(async () => {
      await AudioPlayer.seek({
        audioId: NATIVE_AUDIO_ID,
        timeInSeconds: clampedSeconds,
      });
    });
  }

  public setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (!this.isSupported() || !this.isInitialized) return;

    const effective = this.isMuted ? 0 : this.currentVolume;
    void AudioPlayer.setVolume({
      audioId: NATIVE_AUDIO_ID,
      volume: effective,
    }).catch(() => {});
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (!this.isSupported() || !this.isInitialized) return;

    const effective = muted ? 0 : this.currentVolume;
    void AudioPlayer.setVolume({
      audioId: NATIVE_AUDIO_ID,
      volume: effective,
    }).catch(() => {});
  }

  public getCurrentTime(): number {
    return this.cachedCurrentTime;
  }

  public getDuration(): number {
    return this.cachedDuration;
  }

  public onStateChange(cb: StateCallback): () => void {
    this.stateCallbacks.add(cb);
    return () => this.stateCallbacks.delete(cb);
  }

  public onTimeUpdate(cb: TimeCallback): () => void {
    this.timeCallbacks.add(cb);
    return () => this.timeCallbacks.delete(cb);
  }

  public onError(cb: ErrorCallback): () => void {
    this.errorCallbacks.add(cb);
    return () => this.errorCallbacks.delete(cb);
  }

  private emitState(state: NativeAudioState): void {
    this.stateCallbacks.forEach((cb) => cb(state));
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollInterval = window.setInterval(async () => {
      if (!this.isInitialized) return;
      try {
        const [{ currentTime }, { duration }] = await Promise.all([
          AudioPlayer.getCurrentTime({ audioId: NATIVE_AUDIO_ID }),
          AudioPlayer.getDuration({ audioId: NATIVE_AUDIO_ID }),
        ]);

        if (typeof currentTime === 'number' && !isNaN(currentTime) && currentTime >= 0) {
          this.cachedCurrentTime = currentTime;
        }
        if (typeof duration === 'number' && !isNaN(duration) && duration > 0 && isFinite(duration)) {
          this.cachedDuration = duration;
        }

        this.timeCallbacks.forEach((cb) => cb(this.cachedCurrentTime, this.cachedDuration));
      } catch {}
    }, 500);
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

export const nativeAudioEngine = new NativeAudioEngine();
