import { Howl } from 'howler'

type AudioEventCallback = () => void
type AudioTimeCallback = (time: number) => void
type AudioErrorCallback = (error: unknown) => void

export class AudioEngine {
  private howl: Howl | null = null
  private currentUrl: string | null = null
  private volume: number | null = null
  private _rafId: number | null = null

  private onPlayCallback: AudioEventCallback | null = null
  private onPauseCallback: AudioEventCallback | null = null
  private onEndCallback: AudioEventCallback | null = null
  private onErrorCallback: AudioErrorCallback | null = null
  private onTimeUpdateCallback: AudioTimeCallback | null = null
  private onLoadCallback: AudioEventCallback | null = null

  load(url: string): void {
    if (!url) {
      console.warn('[AudioEngine] Cannot load: empty URL')
      return
    }

    // Same URL already loaded and ready - skip reload
    if (this.currentUrl === url && this.howl) {
      console.debug('[AudioEngine] URL already loaded, skipping')
      return
    }

    this.destroy()

    this.howl = new Howl({
      src: [url],
      html5: true,
      preload: true,
      format: ['mp3'],
      volume: this.volume ?? 1,
      onload: () => {
        this.onLoadCallback?.()
      },
      onloaderror: (_id: number, error: unknown) => {
        console.error('[AudioEngine] Load error:', error)
        this.onErrorCallback?.(error)
      },
      onplayerror: (_id: number, error: unknown) => {
        console.error('[AudioEngine] Play error:', error)
        this.onErrorCallback?.(error)
      },
      onplay: () => {
        this.onPlayCallback?.()
        this.startTimeUpdate()
      },
      onpause: () => {
        this.onPauseCallback?.()
        this.stopTimeUpdate()
      },
      onend: () => {
        this.stopTimeUpdate()
        this.onEndCallback?.()
      },
      onstop: () => {
        this.stopTimeUpdate()
      },
    })

    this.currentUrl = url
  }

  pause(): void {
    if (this.howl) {
      this.howl.pause()
    }
  }

  play(): void {
    if (this.howl) {
      this.howl.play()
    }
  }

  stop(): void {
    if (this.howl) {
      this.howl.stop()
      this.stopTimeUpdate()
    }
  }

  seek(time?: number): number {
    if (!this.howl) return 0
    if (time !== undefined) {
      this.howl.seek(time)
      return time
    }
    return this.howl.seek() as number
  }

  setVolume(vol: number): void {
    const nextVolume = Math.max(0, Math.min(1, vol))
    this.volume = nextVolume
    if (this.howl) {
      this.howl.volume(nextVolume)
    }
  }

  getVolume(): number {
    if (!this.howl) return this.volume ?? 0
    return this.howl.volume()
  }

  getCurrentTime(): number {
    if (!this.howl) return 0
    return (this.howl.seek() as number) || 0
  }

  getDuration(): number {
    if (!this.howl) return 0
    return this.howl.duration() || 0
  }

  isPlaying(): boolean {
    if (!this.howl) return false
    return this.howl.playing()
  }

  getState(): 'loading' | 'ready' | 'playing' | 'paused' | 'error' {
    if (!this.howl) return 'error'
    if (this.howl.playing()) return 'playing'
    const state = this.howl.state()
    if (state === 'loading' || state === 'unloaded') return 'loading'
    return 'paused'
  }

  // Event registration
  onPlay(callback: AudioEventCallback): void { this.onPlayCallback = callback }
  onPause(callback: AudioEventCallback): void { this.onPauseCallback = callback }
  onEnd(callback: AudioEventCallback): void { this.onEndCallback = callback }
  onError(callback: AudioErrorCallback): void { this.onErrorCallback = callback }
  onTimeUpdate(callback: AudioTimeCallback): void { this.onTimeUpdateCallback = callback }
  onLoad(callback: AudioEventCallback): void { this.onLoadCallback = callback }

  private startTimeUpdate(): void {
    this.stopTimeUpdate()
    const tick = () => {
      if (this.howl && this.howl.playing()) {
        const time = this.howl.seek() as number
        this.onTimeUpdateCallback?.(time)
      }
      this._rafId = requestAnimationFrame(tick)
    }
    this._rafId = requestAnimationFrame(tick)
  }

  private stopTimeUpdate(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  destroy(): void {
    this.stopTimeUpdate()
    if (this.howl) {
      this.howl.unload()
      this.howl = null
    }
    // Always clear currentUrl when destroying - a destroyed instance has no loaded URL
    this.currentUrl = null
  }

  reset(): void {
    this.destroy()
    this.onPlayCallback = null
    this.onPauseCallback = null
    this.onEndCallback = null
    this.onErrorCallback = null
    this.onTimeUpdateCallback = null
    this.onLoadCallback = null
    this.volume = null
  }
}

// Singleton instance
export const audioEngine = new AudioEngine()
