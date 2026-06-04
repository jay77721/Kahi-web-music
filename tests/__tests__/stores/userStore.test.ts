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
    profile: null,
    cookie: null,
  })
}

describe('userStore', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    test('defaults to logged out with null profile and cookie', () => {
      const state = useUserStore.getState()
      expect(state.isLoggedIn).toBe(false)
      expect(state.profile).toBeNull()
      expect(state.cookie).toBeNull()
    })
  })

  describe('setProfile', () => {
    test('updates profile and sets isLoggedIn to true', () => {
      useUserStore.getState().setProfile(mockProfile)
      expect(useUserStore.getState().profile).toEqual(mockProfile)
      expect(useUserStore.getState().isLoggedIn).toBe(true)
    })

    test('persists profile to localStorage', () => {
      useUserStore.getState().setProfile(mockProfile)
      const stored = storage.get<UserProfile>(STORAGE_KEYS.USER_PROFILE, null as unknown as UserProfile)
      expect(stored).toEqual(mockProfile)
    })
  })

  describe('setCookie', () => {
    test('updates cookie state', () => {
      useUserStore.getState().setCookie('cookie_value_123')
      expect(useUserStore.getState().cookie).toBe('cookie_value_123')
    })

    test('persists cookie to localStorage', () => {
      useUserStore.getState().setCookie('cookie_value_123')
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('cookie_value_123')
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

    test('updates state and persists on successful login', async () => {
      vi.spyOn(ncmApi, 'loginCellphone').mockResolvedValue({
        code: 200,
        profile: mockProfile,
        cookie: 'session_cookie_abc',
      })

      const result = await useUserStore.getState().login('13800000000', '123456')

      expect(result).toEqual(mockProfile)
      expect(useUserStore.getState().isLoggedIn).toBe(true)
      expect(useUserStore.getState().cookie).toBe('session_cookie_abc')
      expect(storage.get(STORAGE_KEYS.USER_PROFILE, null)).toEqual(mockProfile)
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('session_cookie_abc')
    })

    test('succeeds without cookie when API omits it', async () => {
      vi.spyOn(ncmApi, 'loginCellphone').mockResolvedValue({
        code: 200,
        profile: mockProfile,
      })

      const result = await useUserStore.getState().login('13800000000', '123456')

      expect(result).toEqual(mockProfile)
      expect(useUserStore.getState().isLoggedIn).toBe(true)
      expect(useUserStore.getState().cookie).toBeNull()
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
    })
  })

  describe('logout', () => {
    test('clears all auth state and localStorage', () => {
      // Pre-populate
      useUserStore.setState({
        isLoggedIn: true,
        profile: mockProfile,
        cookie: 'session_cookie',
      })
      storage.set(STORAGE_KEYS.USER_PROFILE, mockProfile)
      storage.set(STORAGE_KEYS.USER_COOKIE, 'session_cookie')

      useUserStore.getState().logout()

      expect(useUserStore.getState().isLoggedIn).toBe(false)
      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().cookie).toBeNull()
      expect(storage.get(STORAGE_KEYS.USER_COOKIE, '')).toBe('')
      expect(storage.get(STORAGE_KEYS.USER_PROFILE, null)).toBeNull()
    })
  })

  describe('restore', () => {
    test('restores state from localStorage when both cookie and profile exist', () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_COOKIE}`, JSON.stringify('restored_cookie'))
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_PROFILE}`, JSON.stringify(mockProfile))

      useUserStore.getState().restore()

      expect(useUserStore.getState().cookie).toBe('restored_cookie')
      expect(useUserStore.getState().profile).toEqual(mockProfile)
      expect(useUserStore.getState().isLoggedIn).toBe(true)
    })

    test('does not set isLoggedIn when only cookie exists (no profile)', () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_COOKIE}`, JSON.stringify('cookie_only'))

      useUserStore.getState().restore()

      expect(useUserStore.getState().cookie).toBe('cookie_only')
      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().isLoggedIn).toBe(false)
    })

    test('does not set isLoggedIn when only profile exists (no cookie)', () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_PROFILE}`, JSON.stringify(mockProfile))

      useUserStore.getState().restore()

      expect(useUserStore.getState().profile).toEqual(mockProfile)
      expect(useUserStore.getState().cookie).toBeNull()
      expect(useUserStore.getState().isLoggedIn).toBe(true)
    })

    test('does nothing when localStorage is empty', () => {
      useUserStore.setState({ isLoggedIn: true, profile: mockProfile, cookie: 'old' })
      localStorage.clear()

      useUserStore.getState().restore()

      expect(useUserStore.getState().isLoggedIn).toBe(true)
      expect(useUserStore.getState().profile).toEqual(mockProfile)
      expect(useUserStore.getState().cookie).toBe('old')
    })

    test('handles corrupted JSON in localStorage gracefully', () => {
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_PROFILE}`, 'not-valid-json{')
      localStorage.setItem(`kahi-web-music:${STORAGE_KEYS.USER_COOKIE}`, JSON.stringify('valid_cookie'))

      useUserStore.getState().restore()

      expect(useUserStore.getState().profile).toBeNull()
      expect(useUserStore.getState().cookie).toBe('valid_cookie')
      expect(useUserStore.getState().isLoggedIn).toBe(false)
    })
  })
})
