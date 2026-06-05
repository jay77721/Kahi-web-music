import type { Howl, HowlOptions } from 'howler'

type AudioEventCallback = () => void
type AudioTimeCallback = (time: number) => void
type AudioErrorCallback = (error: unknown) => void
type AudioUnsubscribe = () => void

let howlerModulePromise: Promise<typeof import('howler')> | null = null

function loadHowler(): Promise<typeof import('howler')> {
  howlerModulePromise ??= import('howler')
  return howlerModulePromise
}

export class AudioEngine {
  private howl: Howl | null = null
  private currentUrl: string | null = null
  private volume: number | null = null
  private _rafId: number | null = null
  private loadToken = 0

  private onPlayCallback: AudioEventCallback | null = null
  private onPauseCallback: AudioEventCallback | null = null
  private onEndCallback: AudioEventCallback | null = null
  private onErrorCallback: AudioErrorCallback | null = null
  private onTimeUpdateCallback: AudioTimeCallback | null = null
  private onLoadCallback: AudioEventCallback | null = null

  async load(url: string): Promise<void> {
    if (!url) {
      console.warn('[AudioEngine] Cannot load: empty URL')
      return
    }

    // Same URL already loaded and ready - skip reload
    if (this.currentUrl === url && this.howl) {
      console.debug('[AudioEngine] URL already loaded, skipping')
      return
    }

    const loadToken = this.loadToken + 1
    this.loadToken = loadToken
    this.unloadCurrent()

    const { Howl } = await loadHowler()
    if (this.loadToken !== loadToken) return

    let howl: Howl | null = null
    const options: HowlOptions = {
      src: [url],
      html5: true,
      preload: true,
      format: ['mp3'],
      volume: this.volume ?? 1,
      onload: () => {
        if (this.howl !== howl) return
        this.onLoadCallback?.()
      },
      onloaderror: (_id: number, error: unknown) => {
        if (this.howl !== howl) return
        console.error('[AudioEngine] Load error:', error)
        this.onErrorCallback?.(error)
      },
      onplayerror: (_id: number, error: unknown) => {
        if (this.howl !== howl) return
        console.error('[AudioEngine] Play error:', error)
        this.onErrorCallback?.(error)
      },
      onplay: () => {
        if (this.howl !== howl) return
        this.onPlayCallback?.()
        this.startTimeUpdate()
      },
      onpause: () => {
        if (this.howl !== howl) return
        this.onPauseCallback?.()
        this.stopTimeUpdate()
      },
      onend: () => {
        if (this.howl !== howl) return
        this.stopTimeUpdate()
        this.onEndCallback?.()
      },
      onstop: () => {
        if (this.howl !== howl) return
        this.stopTimeUpdate()
      },
    }

    howl = new Howl(options)

    if (this.loadToken !== loadToken) {
      howl.unload()
      return
    }

    this.howl = howl
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
  onPlay(callback: AudioEventCallback): AudioUnsubscribe {
    this.onPlayCallback = callback
    return () => {
      if (this.onPlayCallback === callback) this.onPlayCallback = null
    }
  }

  onPause(callback: AudioEventCallback): AudioUnsubscribe {
    this.onPauseCallback = callback
    return () => {
      if (this.onPauseCallback === callback) this.onPauseCallback = null
    }
  }

  onEnd(callback: AudioEventCallback): AudioUnsubscribe {
    this.onEndCallback = callback
    return () => {
      if (this.onEndCallback === callback) this.onEndCallback = null
    }
  }

  onError(callback: AudioErrorCallback): AudioUnsubscribe {
    this.onErrorCallback = callback
    return () => {
      if (this.onErrorCallback === callback) this.onErrorCallback = null
    }
  }

  onTimeUpdate(callback: AudioTimeCallback): AudioUnsubscribe {
    this.onTimeUpdateCallback = callback
    return () => {
      if (this.onTimeUpdateCallback === callback) this.onTimeUpdateCallback = null
    }
  }

  onLoad(callback: AudioEventCallback): AudioUnsubscribe {
    this.onLoadCallback = callback
    return () => {
      if (this.onLoadCallback === callback) this.onLoadCallback = null
    }
  }

  private startTimeUpdate(): void {
    this.stopTimeUpdate()
    const tick = () => {
      if (this.howl && this.howl.playing()) {
        const time = this.howl.seek() as number
        this.onTimeUpdateCallback?.(time)
        this._rafId = requestAnimationFrame(tick)
      } else {
        this._rafId = null
      }
    }
    this._rafId = requestAnimationFrame(tick)
  }

  private stopTimeUpdate(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  private unloadCurrent(): void {
    this.stopTimeUpdate()
    if (this.howl) {
      this.howl.unload()
      this.howl = null
    }
    // Always clear currentUrl when destroying - a destroyed instance has no loaded URL
    this.currentUrl = null
  }

  destroy(): void {
    this.loadToken += 1
    this.unloadCurrent()
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
