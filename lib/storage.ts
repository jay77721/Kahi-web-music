export const storage = {
  get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue
    try {
      const item = localStorage.getItem(`kahi-web-music:${key}`)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`kahi-web-music:${key}`, JSON.stringify(value))
    } catch (e) {
      console.warn('Failed to save to localStorage:', e)
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`kahi-web-music:${key}`)
  },

  clear(): void {
    if (typeof window === 'undefined') return
    const keys = Object.keys(localStorage).filter(k => k.startsWith('kahi-web-music:'))
    keys.forEach(k => localStorage.removeItem(k))
  },
}

export const STORAGE_KEYS = {
  PLAY_QUEUE: 'player:queue',
  PLAY_INDEX: 'player:index',
  PLAY_MODE: 'player:mode',
  VOLUME: 'player:volume',
  SEARCH_HISTORY: 'search:history',
  // Legacy auth cookie key retained only so startup/logout can remove it.
  USER_COOKIE: 'user:cookie',
  USER_PROFILE: 'user:profile',
  THEME: 'ui:theme',
  PLAY_HISTORY: 'history:play',
} as const
