import { create } from 'zustand'
import type { UserProfile } from '@/types/user'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import { ncmApi } from '@/lib/api'

interface LoginCellphoneResult {
  code: number
  profile?: UserProfile
  cookie?: string
  message?: string
}

interface UserState {
  isLoggedIn: boolean
  profile: UserProfile | null
  cookie: string | null

  setProfile: (profile: UserProfile) => void
  setCookie: (cookie: string) => void
  /**
   * Authenticate via cellphone + captcha. Persists the profile + cookie
   * to localStorage on success and throws on failure with the API's
   * human-readable message.
   */
  login: (phone: string, captcha: string) => Promise<UserProfile>
  logout: () => void
  restore: () => void
}

export const useUserStore = create<UserState>((set) => ({
  isLoggedIn: false,
  profile: null,
  cookie: null,

  setProfile: (profile) => {
    set({ profile, isLoggedIn: true })
    storage.set(STORAGE_KEYS.USER_PROFILE, profile)
  },

  setCookie: (cookie) => {
    set({ cookie })
    storage.set(STORAGE_KEYS.USER_COOKIE, cookie)
  },

  login: async (phone, captcha) => {
    const res = (await ncmApi.loginCellphone(phone, captcha)) as unknown as LoginCellphoneResult
    if (res?.code !== 200 || !res.profile) {
      throw new Error(res?.message || '登录失败，请检查手机号或验证码')
    }
    const profile = res.profile
    set({ profile, isLoggedIn: true })
    storage.set(STORAGE_KEYS.USER_PROFILE, profile)
    if (res.cookie) {
      set({ cookie: res.cookie })
      storage.set(STORAGE_KEYS.USER_COOKIE, res.cookie)
    }
    return profile
  },

  logout: () => {
    set({ isLoggedIn: false, profile: null, cookie: null })
    storage.remove(STORAGE_KEYS.USER_COOKIE)
    storage.remove(STORAGE_KEYS.USER_PROFILE)
    // Drop any cached API responses so the next user does not see the
    // previous account's data (e.g. user profile, playlists, account info).
    ncmApi.clearCache()
  },

  restore: () => {
    const cookie = storage.get<string | null>(STORAGE_KEYS.USER_COOKIE, null)
    const profile = storage.get<UserProfile | null>(STORAGE_KEYS.USER_PROFILE, null)
    if (cookie || profile) {
      set({ cookie, profile, isLoggedIn: !!profile })
    }
  },
}))
