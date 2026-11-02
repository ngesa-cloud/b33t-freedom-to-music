/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type PlayerStateCallback = (state: 'playing' | 'paused' | 'ended' | 'buffering' | 'idle') => void;
type TimeUpdateCallback = (currentTime: number, duration: number) => void;

export class YouTubeEngine {
  private player: any = null;
  private isReady = false;
  private pendingVideoId: string | null = null;
  private pollInterval: any = null;
  private stateCallbacks: Set<PlayerStateCallback> = new Set();
  private timeCallbacks: Set<TimeUpdateCallback> = new Set();
  private currentVideoId: string | null = null;
  private currentVolume = 0.8;
  private isMuted = false;

  constructor() {
    this.ensureIframeAPI();
  }

  private ensureIframeAPI() {
    if (typeof window === 'undefined') return;

    if (!(window as any).YT || !(window as any).YT.Player) {
      const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (!existing) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }

      const prevReady = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === 'function') prevReady();
        if (this.pendingVideoId) {
          this.initPlayer('b33t-embedded-yt', this.pendingVideoId);
        }
      };
    }
  }

  public initPlayer(containerId: string, initialVideoId?: string) {
    if (typeof window === 'undefined') return;

    if (initialVideoId) {
      this.pendingVideoId = initialVideoId;
    }

    if (!(window as any).YT || !(window as any).YT.Player) {
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`[YouTubeEngine] Container #${containerId} not found in DOM`);
      return;
    }

    if (this.player) {
      if (initialVideoId && initialVideoId !== this.currentVideoId) {
        this.loadVideo(initialVideoId);
      }
      return;
    }

    const targetVideo = initialVideoId || this.pendingVideoId || 'Or2sMfOcTtw';

    try {
      this.player = new (window as any).YT.Player(containerId, {
        videoId: targetVideo,
        playerVars: {
          autoplay: 1,
          controls: 1,
          disablekb: 0,
          fs: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            this.isReady = true;
            this.currentVideoId = targetVideo;
            event.target.setVolume(Math.round(this.currentVolume * 100));
            if (this.isMuted) event.target.mute();
            else event.target.unMute();

            if (this.pendingVideoId && this.pendingVideoId !== targetVideo) {
              this.loadVideo(this.pendingVideoId);
            }
          },
          onStateChange: (event: any) => {
            const YT = (window as any).YT;
            if (!YT) return;

            let stateStr: 'playing' | 'paused' | 'ended' | 'buffering' | 'idle' = 'idle';
            if (event.data === YT.PlayerState.PLAYING) {
              stateStr = 'playing';
              this.startPolling();
            } else if (event.data === YT.PlayerState.PAUSED) {
              stateStr = 'paused';
              this.stopPolling();
            } else if (event.data === YT.PlayerState.ENDED) {
              stateStr = 'ended';
              this.stopPolling();
            } else if (event.data === YT.PlayerState.BUFFERING) {
              stateStr = 'buffering';
            }

            for (const cb of this.stateCallbacks) {
              cb(stateStr);
            }
          },
          onError: (err: any) => {
            console.warn('[YouTubeEngine] playback error:', err?.data);
          },
        },
      });
    } catch (e) {
      console.warn('[YouTubeEngine] Initialization error:', e);
    }
  }

  public loadVideo(videoId: string) {
    this.pendingVideoId = videoId;
    this.currentVideoId = videoId;

    if (this.player && this.isReady && typeof this.player.loadVideoById === 'function') {
      try {
        this.player.loadVideoById(videoId);
        this.player.setVolume(Math.round(this.currentVolume * 100));
        if (this.isMuted) this.player.mute();
        else this.player.unMute();
      } catch (e) {
        console.warn('[YouTubeEngine] loadVideoById error:', e);
      }
    } else {
      this.initPlayer('b33t-embedded-yt', videoId);
    }
  }

  public play() {
    if (this.player && this.isReady && typeof this.player.playVideo === 'function') {
      try {
        this.player.playVideo();
      } catch (e) {
        console.warn('[YouTubeEngine] play error:', e);
      }
    }
  }

  public pause() {
    if (this.player && this.isReady && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
      } catch (e) {
        console.warn('[YouTubeEngine] pause error:', e);
      }
    }
    this.stopPolling();
  }

  public seek(seconds: number) {
    if (this.player && this.isReady && typeof this.player.seekTo === 'function') {
      try {
        this.player.seekTo(seconds, true);
        for (const cb of this.timeCallbacks) {
          cb(seconds, this.getDuration());
        }
      } catch (e) {
        console.warn('[YouTubeEngine] seek error:', e);
      }
    }
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.player && this.isReady && typeof this.player.setVolume === 'function') {
      try {
        this.player.setVolume(Math.round(this.currentVolume * 100));
      } catch {}
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.player && this.isReady) {
      try {
        if (muted && typeof this.player.mute === 'function') {
          this.player.mute();
        } else if (!muted && typeof this.player.unMute === 'function') {
          this.player.unMute();
        }
      } catch {}
    }
  }

  public getCurrentTime(): number {
    if (this.player && this.isReady && typeof this.player.getCurrentTime === 'function') {
      try {
        return this.player.getCurrentTime() || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  public getDuration(): number {
    if (this.player && this.isReady && typeof this.player.getDuration === 'function') {
      try {
        return this.player.getDuration() || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  private startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      const curr = this.getCurrentTime();
      const dur = this.getDuration();
      for (const cb of this.timeCallbacks) {
        cb(curr, dur);
      }
    }, 250);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public onStateChange(cb: PlayerStateCallback): () => void {
    this.stateCallbacks.add(cb);
    return () => this.stateCallbacks.delete(cb);
  }

  public onTimeUpdate(cb: TimeUpdateCallback): () => void {
    this.timeCallbacks.add(cb);
    return () => this.timeCallbacks.delete(cb);
  }
}

export const youTubeEngine = new YouTubeEngine();
