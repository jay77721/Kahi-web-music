interface Window {
  __playbackCtrl?: {
    togglePlay: () => void
    next: () => void
    prev: () => void
    playTrack: (song: { id: number; name: string; ar?: { id: number; name: string }[]; al?: { picUrl: string } }) => void
    getState: () => {
      isPlaying: boolean
      state: string
      currentTime: number
      duration: number
    }
  }
}
