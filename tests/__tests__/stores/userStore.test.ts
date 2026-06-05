import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useUserStore } from '@/stores/userStore'
import { ncmApi } from '@/lib/api'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import type { UserProfile } from '@/types/user'

const mockProfile: UserProfile = {
  userId: 1,
  nickname: 'test_user',
  avatarUrl: 'https://example.com/avatar.jpg',
}

function resetStore() {
  storage.clear()
  useUserStore.setState({
    isLoggedIn: false,
    hasRestoredSession: false,
    profile: null,
    cookie: null,
    logoutError: null,
    restoreError: null,
  })
}

describe('userStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetStore()
  })

  describe('initial state', () => {
    test('defaults to logged out with null profile and cookie', () => {
      const state = useUserStore.getState()
      expect(state.isLoggedIn).toBe(false)
      expect(state.hasRestoredSession).toBe(false)
      expect(state.profile).toBeNull()
      expect(state.cookie).toBeNull()
    })
  })

  describe('setProfile', () => {
    test('updates profile and sets isLoggedIn to true', () => {
      useUserStore.getState().setProfile(mockProfile)
      expect(useUserStore.getState().profile).toEqual(mockProfile)
      expect(useUserStore.getState().isLoggedIn).toBe(true)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
    })

    test('persists profile to localStorage', () => {
      useUserStore.getState().setProfile(mockProfile)
      const stored = storage.get<UserProfile>(STORAGE_KEYS.USER_PROFILE, null as unknown as UserProfile)
      expect(stored).toEqual(mockProfile)
    })

    test('removes any legacy localStorage cookie when profile is set', () => {
      storage.set(STORAGE_KEYS.USER_COOKIE, 'legacy_cookie')
      useUserStore.getState().setProfile(mockProfile)
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
    })
  })

  describe('setCookie', () => {
    test('does not keep session cookies in state', () => {
      useUserStore.getState().setCookie('cookie_value_123')
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
    })

    test('removes any legacy localStorage cookie', () => {
      storage.set(STORAGE_KEYS.USER_COOKIE, 'old_cookie')
      useUserStore.getState().setCookie('cookie_value_123')
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
    })
  })

  describe('login', () => {
    test('throws when API returns code !== 200', async () => {
      vi.spyOn(ncmApi, 'loginCellphone').mockResolvedValue({
        code: 400,
        message: '手机号格式错误',
      })

      await expect(
        useUserStore.getState().login('invalid', '123456')
      ).rejects.toThrow('手机号格式错误')
    })

    test('throws when API returns no profile', async () => {
      vi.spyOn(ncmApi, 'loginCellphone').mockResolvedValue({
        code: 200,
        profile: undefined,
        message: '验证码错误',
      })

      await expect(
        useUserStore.getState().login('13800000000', '000000')
      ).rejects.toThrow('验证码错误')
    })

    test('throws with default message when message is missing', async () => {
      vi.spyOn(ncmApi, 'loginCellphone').mockResolvedValue({
        code: 500,
      })

      await expect(
        useUserStore.getState().login('13800000000', '000000')
      ).rejects.toThrow('登录失败，请检查手机号或验证码')
    })

    test('updates state and relies on Set-Cookie instead of persisting login cookies', async () => {
      storage.set(STORAGE_KEYS.USER_COOKIE, 'legacy_cookie')
      vi.spyOn(ncmApi, 'loginCellphone').mockResolvedValue({
        code: 200,
        profile: mockProfile,
        cookie: 'session_cookie_abc',
      })

      const result = await useUserStore.getState().login('13800000000', '123456')

      expect(result).toEqual(mockProfile)
      expect(useUserStore.getState().isLoggedIn).toBe(true)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().restoreError).toBeNull()
      expect(storage.get(STORAGE_KEYS.USER_PROFILE, null)).toEqual(mockProfile)
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
    })

    test('succeeds without cookie when API omits it', async () => {
      vi.spyOn(ncmApi, 'loginCellphone').mockResolvedValue({
        code: 200,
        profile: mockProfile,
      })

      const result = await useUserStore.getState().login('13800000000', '123456')

      expect(result).toEqual(mockProfile)
      expect(useUserStore.getState().isLoggedIn).toBe(true)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
      expect(useUserStore.getState().cookie).toBeNull()
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
    })
  })

  describe('logout', () => {
    test('clears all auth state and localStorage', async () => {
      // Pre-populate
      useUserStore.setState({
        isLoggedIn: true,
        hasRestoredSession: false,
        profile: mockProfile,
        cookie: 'session_cookie',
      })
      storage.set(STORAGE_KEYS.USER_PROFILE, mockProfile)
      storage.set(STORAGE_KEYS.USER_COOKIE, 'session_cookie')
      vi.spyOn(ncmApi, 'logout').mockResolvedValue({ code: 200 })

      await useUserStore.getState().logout()

      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().logoutError).toBeNull()
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
      expect(storage.get(STORAGE_KEYS.USER_PROFILE, null)).toBeNull()
    })

    test('keeps local cleanup observable when backend logout fails', async () => {
      useUserStore.setState({
        isLoggedIn: true,
        hasRestoredSession: false,
        profile: mockProfile,
        cookie: 'session_cookie',
      })
      storage.set(STORAGE_KEYS.USER_PROFILE, mockProfile)
      storage.set(STORAGE_KEYS.USER_COOKIE, 'session_cookie')
      vi.spyOn(ncmApi, 'logout').mockRejectedValue(new Error('backend unavailable'))

      await expect(useUserStore.getState().logout()).rejects.toThrow('backend unavailable')

      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().logoutError).toBe('backend unavailable')
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
      expect(storage.get(STORAGE_KEYS.USER_PROFILE, null)).toBeNull()
    })
  })

  describe('restore', () => {
    test('restores verified server session and removes legacy cookie when both exist', async () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_COOKIE}`, JSON.stringify('restored_cookie'))
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_PROFILE}`, JSON.stringify(mockProfile))
      vi.spyOn(ncmApi, 'requestFlexible').mockResolvedValue({
        code: 200,
        account: { id: mockProfile.userId },
        profile: mockProfile,
      })

      await useUserStore.getState().restore()

      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().profile).toEqual(mockProfile)
      expect(useUserStore.getState().isLoggedIn).toBe(true)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
      expect(useUserStore.getState().restoreError).toBeNull()
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
    })

    test('restores unauthenticated proxy data wrapper without retrying login status', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              code: 200,
              account: { id: 1000, anonimousUser: true },
              profile: null,
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )

      await useUserStore.getState().restore()

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/login/status'),
        expect.objectContaining({ credentials: 'include' })
      )
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
      expect(useUserStore.getState().restoreError).toBeNull()
    })

    test('shares an in-flight restoration when restore is called reentrantly during state notification', async () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_PROFILE}`, JSON.stringify(mockProfile))
      const requestFlexibleSpy = vi.spyOn(ncmApi, 'requestFlexible').mockResolvedValue({
        code: 200,
        account: { id: mockProfile.userId },
        profile: mockProfile,
      })
      let reentrantRestorePromise: Promise<void> | null = null
      const unsubscribe = useUserStore.subscribe((state) => {
        if (!state.hasRestoredSession && state.profile?.userId === mockProfile.userId && !reentrantRestorePromise) {
          reentrantRestorePromise = state.restore()
        }
      })

      try {
        const initialRestorePromise = useUserStore.getState().restore()
        await initialRestorePromise
        await reentrantRestorePromise
      } finally {
        unsubscribe()
      }

      expect(reentrantRestorePromise).not.toBeNull()
      expect(requestFlexibleSpy).toHaveBeenCalledTimes(1)
      expect(useUserStore.getState().isLoggedIn).toBe(true)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
    })

    test('removes legacy cookie and stays logged out when only cookie exists', async () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_COOKIE}`, JSON.stringify('cookie_only'))
      vi.spyOn(ncmApi, 'requestFlexible').mockResolvedValue({
        code: 301,
        account: null,
        profile: null,
      })

      await useUserStore.getState().restore()

      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
    })

    test('restores cached profile for display but stays logged out when login status is unauthenticated', async () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_PROFILE}`, JSON.stringify(mockProfile))
      vi.spyOn(ncmApi, 'requestFlexible').mockResolvedValue({
        code: 301,
        account: null,
        profile: null,
      })

      await useUserStore.getState().restore()

      expect(useUserStore.getState().profile).toEqual(mockProfile)
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
    })

    test('does not authenticate account-only status with a cached profile', async () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_PROFILE}`, JSON.stringify(mockProfile))
      vi.spyOn(ncmApi, 'requestFlexible').mockResolvedValue({
        code: 200,
        account: { id: mockProfile.userId },
        profile: null,
      })

      await useUserStore.getState().restore()

      expect(useUserStore.getState().profile).toEqual(mockProfile)
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
    })

    test('does not let a crafted cached profile unlock login after cookie deletion', async () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_PROFILE}`, JSON.stringify({
        ...mockProfile,
        nickname: 'crafted_profile',
      }))
      vi.spyOn(ncmApi, 'requestFlexible').mockResolvedValue({
        code: 301,
        account: null,
        profile: null,
      })

      await useUserStore.getState().restore()

      expect(useUserStore.getState().profile?.nickname).toBe('crafted_profile')
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
    })

    test('marks restoration complete and clears stale state when localStorage is empty', async () => {
      useUserStore.setState({
        isLoggedIn: true,
        hasRestoredSession: false,
        profile: mockProfile,
        cookie: 'old',
      })
      localStorage.clear()
      vi.spyOn(ncmApi, 'requestFlexible').mockResolvedValue({
        code: 301,
        account: null,
        profile: null,
      })

      await useUserStore.getState().restore()

      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().cookie).toBeNull()
    })

    test('handles corrupted JSON in localStorage gracefully', async () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_PROFILE}`, 'not-valid-json{')
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_COOKIE}`, JSON.stringify('valid_cookie'))
      vi.spyOn(ncmApi, 'requestFlexible').mockResolvedValue({
        code: 301,
        account: null,
        profile: null,
      })

      await useUserStore.getState().restore()

      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
    })

    test('fails closed and completes restoration when legacy cookie removal throws', async () => {
      useUserStore.setState({
        isLoggedIn: true,
        hasRestoredSession: false,
        profile: mockProfile,
        cookie: 'old_cookie',
      })
      const requestFlexibleSpy = vi.spyOn(ncmApi, 'requestFlexible').mockResolvedValue({
        code: 200,
        account: { id: mockProfile.userId },
        profile: mockProfile,
      })
      vi.spyOn(storage, 'remove').mockImplementation(() => {
        throw new Error('storage remove failed')
      })

      await expect(useUserStore.getState().restore()).resolves.toBeUndefined()

      expect(requestFlexibleSpy).not.toHaveBeenCalled()
      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
    })

    test('fails closed and completes restoration when cached profile read throws', async () => {
      useUserStore.setState({
        isLoggedIn: true,
        hasRestoredSession: false,
        profile: mockProfile,
        cookie: 'old_cookie',
      })
      const requestFlexibleSpy = vi.spyOn(ncmApi, 'requestFlexible').mockResolvedValue({
        code: 200,
        account: { id: mockProfile.userId },
        profile: mockProfile,
      })
      vi.spyOn(storage, 'get').mockImplementation(() => {
        throw new Error('storage get failed')
      })

      await expect(useUserStore.getState().restore()).resolves.toBeUndefined()

      expect(requestFlexibleSpy).not.toHaveBeenCalled()
      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().hasRestoredSession).toBe(true)
      expect(useUserStore.getState().restoreError).toBe('storage get failed')
    })
  })
})
