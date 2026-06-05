import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QRLoginPanel } from '@/app/login/_components/QRLoginPanel'

const mocks = vi.hoisted(() => {
  const routerPush = vi.fn()

  return {
    routerPush,
    router: { push: routerPush },
    setProfile: vi.fn(),
    loginQrKey: vi.fn(),
    loginQrCreate: vi.fn(),
    requestFlexible: vi.fn(),
    userAccount: vi.fn(),
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: { setProfile: typeof mocks.setProfile }) => unknown) =>
    selector({ setProfile: mocks.setProfile }),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    loginQrKey: (...args: unknown[]) => mocks.loginQrKey(...args),
    loginQrCreate: (...args: unknown[]) => mocks.loginQrCreate(...args),
    requestFlexible: (...args: unknown[]) => mocks.requestFlexible(...args),
    userAccount: (...args: unknown[]) => mocks.userAccount(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: mocks.toast,
}))

describe('QRLoginPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.routerPush.mockReset()
    mocks.setProfile.mockReset()
    mocks.loginQrKey.mockReset()
    mocks.loginQrCreate.mockReset()
    mocks.requestFlexible.mockReset()
    mocks.userAccount.mockReset()
    mocks.toast.success.mockReset()
    mocks.toast.error.mockReset()

    mocks.loginQrKey.mockResolvedValue({ unikey: 'qr-key' })
    mocks.loginQrCreate.mockResolvedValue({ qrimg: 'data:image/png;base64,abc' })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('does not authenticate or redirect when confirmed QR login has no profile', async () => {
    mocks.requestFlexible.mockResolvedValue({ code: 803 })
    mocks.userAccount.mockResolvedValue({})

    render(<QRLoginPanel />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mocks.loginQrCreate).toHaveBeenCalledWith('qr-key')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(mocks.toast.error).toHaveBeenCalledWith('登录状态确认失败，请重试')

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByRole('status')).toHaveTextContent('二维码已过期，请重新生成')
    expect(screen.getByRole('button', { name: '重新生成二维码' })).toBeInTheDocument()
    expect(mocks.setProfile).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(mocks.routerPush).not.toHaveBeenCalled()
  })

  test('ignores stale poll responses after manually regenerating an expired QR code', async () => {
    let resolveOldPoll: ((value: { code: number }) => void) | null = null
    mocks.loginQrKey
      .mockResolvedValueOnce({ unikey: 'old-key' })
      .mockResolvedValueOnce({ unikey: 'new-key' })
    mocks.loginQrCreate
      .mockResolvedValueOnce({ qrimg: 'data:image/png;base64,old' })
      .mockResolvedValueOnce({ qrimg: 'data:image/png;base64,new' })
    mocks.requestFlexible.mockImplementation(
      () => new Promise((resolve) => {
        resolveOldPoll = resolve
      })
    )

    render(<QRLoginPanel />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(mocks.requestFlexible).toHaveBeenCalledWith(
      '/login/qr/check',
      expect.objectContaining({ key: 'old-key' })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 - 3000)
    })

    expect(screen.getByRole('status')).toHaveTextContent('二维码已过期，请重新生成')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '重新生成二维码' }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mocks.loginQrCreate).toHaveBeenLastCalledWith('new-key')
    expect(screen.getByRole('status')).toHaveTextContent('打开网易云音乐 APP 扫码登录')

    await act(async () => {
      resolveOldPoll?.({ code: 803 })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByRole('status')).toHaveTextContent('打开网易云音乐 APP 扫码登录')
    expect(mocks.userAccount).not.toHaveBeenCalled()
    expect(mocks.setProfile).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(mocks.routerPush).not.toHaveBeenCalled()
  })

  test('expires the QR code after five minutes and allows retrying', async () => {
    mocks.requestFlexible.mockResolvedValue({ code: 801 })

    render(<QRLoginPanel />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByRole('status')).toHaveTextContent('打开网易云音乐 APP 扫码登录')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    })

    expect(screen.getByRole('status')).toHaveTextContent('二维码已过期，请重新生成')
    expect(screen.getByRole('button', { name: '重新生成二维码' })).toBeInTheDocument()
  })

  test('stores the profile and redirects after QR login is confirmed', async () => {
    const profile = {
      userId: 123,
      nickname: 'Kahi',
      avatarUrl: 'https://example.com/avatar.png',
    }
    mocks.requestFlexible
      .mockResolvedValueOnce({ code: 802 })
      .mockResolvedValueOnce({ code: 803 })
    mocks.userAccount.mockResolvedValue({ profile })

    render(<QRLoginPanel />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(screen.getByRole('status')).toHaveTextContent('已扫码，请在手机上确认登录')
    expect(mocks.userAccount).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
      await Promise.resolve()
    })

    expect(mocks.requestFlexible).toHaveBeenLastCalledWith(
      '/login/qr/check',
      expect.objectContaining({ key: 'qr-key' })
    )
    expect(mocks.userAccount).toHaveBeenCalledTimes(1)
    expect(mocks.setProfile).toHaveBeenCalledWith(profile)
    expect(mocks.toast.success).toHaveBeenCalledWith('登录成功')
    expect(mocks.routerPush).toHaveBeenCalledWith('/my')
  })

  test('ignores a stale account confirmation failure after unmount', async () => {
    let rejectAccount: ((error: Error) => void) | null = null
    mocks.requestFlexible.mockResolvedValue({ code: 803 })
    mocks.userAccount.mockImplementation(
      () => new Promise((_, reject) => {
        rejectAccount = reject
      })
    )

    const { unmount } = render(<QRLoginPanel />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
      await Promise.resolve()
    })

    expect(mocks.userAccount).toHaveBeenCalledTimes(1)

    unmount()

    await act(async () => {
      rejectAccount?.(new Error('stale account failure'))
      await Promise.resolve()
    })

    expect(mocks.toast.error).not.toHaveBeenCalled()
    expect(mocks.setProfile).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(mocks.routerPush).not.toHaveBeenCalled()
  })

  test('cancels deferred QR generation when unmounted before the microtask runs', async () => {
    const { unmount } = render(<QRLoginPanel />)
    unmount()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mocks.loginQrKey).not.toHaveBeenCalled()
    expect(mocks.loginQrCreate).not.toHaveBeenCalled()
    expect(mocks.requestFlexible).not.toHaveBeenCalled()
  })

  test('waits for each QR poll to finish before scheduling the next one', async () => {
    let resolvePoll: ((value: { code: number }) => void) | null = null
    mocks.requestFlexible.mockImplementation(
      () => new Promise((resolve) => {
        resolvePoll = resolve
      })
    )

    render(<QRLoginPanel />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(mocks.requestFlexible).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(mocks.requestFlexible).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolvePoll?.({ code: 801 })
      await Promise.resolve()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(mocks.requestFlexible).toHaveBeenCalledTimes(2)
  })
})
