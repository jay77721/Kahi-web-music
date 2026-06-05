import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { QRLoginPanel } from '@/app/login/_components/QRLoginPanel'

const mockRouterPush = vi.fn()
const mockSetProfile = vi.fn()
const mockLoginQrKey = vi.fn()
const mockLoginQrCreate = vi.fn()
const mockRequestFlexible = vi.fn()
const mockUserAccount = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: { setProfile: typeof mockSetProfile }) => unknown) =>
    selector({ setProfile: mockSetProfile }),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    loginQrKey: (...args: unknown[]) => mockLoginQrKey(...args),
    loginQrCreate: (...args: unknown[]) => mockLoginQrCreate(...args),
    requestFlexible: (...args: unknown[]) => mockRequestFlexible(...args),
    userAccount: (...args: unknown[]) => mockUserAccount(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { alt, src, ...rest } = props
    return React.createElement('img', { alt: (alt as string) ?? '', src: (src as string) ?? '', ...rest })
  },
}))

describe('QRLoginPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockRouterPush.mockReset()
    mockSetProfile.mockReset()
    mockLoginQrKey.mockReset()
    mockLoginQrCreate.mockReset()
    mockRequestFlexible.mockReset()
    mockUserAccount.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()

    mockLoginQrKey.mockResolvedValue({ unikey: 'qr-key' })
    mockLoginQrCreate.mockResolvedValue({ qrimg: 'data:image/png;base64,abc' })
  })

  afterEach(() => {
    cleanup()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('does not authenticate or redirect when confirmed QR login has no profile', async () => {
    mockRequestFlexible.mockResolvedValue({ code: 803 })
    mockUserAccount.mockResolvedValue({})

    render(<QRLoginPanel />)

    await waitFor(() => {
      expect(mockLoginQrCreate).toHaveBeenCalledWith('qr-key')
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('登录状态确认失败，请重试')
    })
    expect(mockSetProfile).not.toHaveBeenCalled()
    expect(mockToastSuccess).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(screen.getByText('二维码已过期，请重新生成')).toBeInTheDocument()
  })
})
