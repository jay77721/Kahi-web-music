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

interface LoginStatusResult {
  code?: number
  profile?: UserProfile | null
  account?: unknown | null
}

interface UserState {
  isLoggedIn: boolean
  hasRestoredSession: boolean
  profile: UserProfile | null
  cookie: string | null
  logoutError: string | null
  restoreError: string | null

  setProfile: (profile: UserProfile) => void
  setCookie: (cookie: string) => void
  /**
   * Authenticate via cellphone + captcha. Persists the profile on success
   * and relies on browser Set-Cookie for the session; the cookie state field
   * remains for compatibility with older localStorage-backed sessions.
   */
  login: (phone: string, captcha: string) => Promise<UserProfile>
  logout: () => Promise<void>
  restore: () => Promise<void>
}

function hasVerifiedSession(status: LoginStatusResult): boolean {
  const statusCodeAllowsSession = status.code === undefined || status.code === 200
  return statusCodeAllowsSession && status.profile != null
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

let restoreSessionPromise: Promise<void> | null = null

export const useUserStore = create<UserState>((set) => ({
  isLoggedIn: false,
  hasRestoredSession: false,
  profile: null,
  cookie: null,
  logoutError: null,
  restoreError: null,

  setProfile: (profile) => {
    storage.remove(STORAGE_KEYS.USER_COOKIE)
    set({ profile, isLoggedIn: true, hasRestoredSession: true, restoreError: null })
    storage.set(STORAGE_KEYS.USER_PROFILE, profile)
  },

  setCookie: () => {
    storage.remove(STORAGE_KEYS.USER_COOKIE)
    set({ cookie: null, hasRestoredSession: true })
  },

  login: async (phone, captcha) => {
    const res = (await ncmApi.loginCellphone(phone, captcha)) as unknown as LoginCellphoneResult
    if (res?.code !== 200 || !res.profile) {
      throw new Error(res?.message || '登录失败，请检查手机号或验证码')
    }
    const profile = res.profile
    storage.remove(STORAGE_KEYS.USER_COOKIE)
    set({ profile, isLoggedIn: true, hasRestoredSession: true, logoutError: null, restoreError: null })
    storage.set(STORAGE_KEYS.USER_PROFILE, profile)
    return profile
  },

  logout: async () => {
    set({
      isLoggedIn: false,
      hasRestoredSession: true,
      profile: null,
      cookie: null,
      logoutError: null,
    })
    storage.remove(STORAGE_KEYS.USER_COOKIE)
    storage.remove(STORAGE_KEYS.USER_PROFILE)
    // Drop any cached API responses so the next user does not see the
    // previous account's data (e.g. user profile, playlists, account info).
    ncmApi.clearCache()

    try {
      await ncmApi.logout()
    } catch (error) {
      const message = getErrorMessage(error, '退出登录请求失败，服务器会话可能仍然有效')
      set({ logoutError: message })
      throw new Error(message)
    }
  },

  restore: () => {
    if (restoreSessionPromise) return restoreSessionPromise

    restoreSessionPromise = Promise.resolve()
      .then(async () => {
        let cachedProfile: UserProfile | null = null

        try {
          storage.remove(STORAGE_KEYS.USER_COOKIE)
          cachedProfile = storage.get<UserProfile | null>(STORAGE_KEYS.USER_PROFILE, null)

          set({
            cookie: null,
            profile: cachedProfile,
            isLoggedIn: false,
            hasRestoredSession: false,
            restoreError: null,
          })

          const status = (await ncmApi.requestFlexible('/login/status')) as unknown as LoginStatusResult
          const isVerifiedSession = hasVerifiedSession(status)
          const verifiedProfile = isVerifiedSession ? status.profile ?? null : null

          set({
            cookie: null,
            profile: verifiedProfile ?? cachedProfile,
            isLoggedIn: isVerifiedSession,
            hasRestoredSession: true,
            restoreError: null,
          })
        } catch (error) {
          set({
            cookie: null,
            profile: cachedProfile,
            isLoggedIn: false,
            hasRestoredSession: true,
            restoreError: getErrorMessage(error, '恢复登录状态失败'),
          })
        }
      })
      .finally(() => {
        restoreSessionPromise = null
      })

    return restoreSessionPromise
  },
}))
