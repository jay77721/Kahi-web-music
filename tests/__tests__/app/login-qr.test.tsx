import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
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
      await vi.advanceTimersByTimeAsync(2000)
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
})
