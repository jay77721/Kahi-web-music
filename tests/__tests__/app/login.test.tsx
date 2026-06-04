'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhoneLoginForm } from '@/app/login/_components/PhoneLoginForm'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogin = vi.fn()
const mockCaptchaSent = vi.fn()

vi.mock('@/lib/api', () => ({
  ncmApi: {
    captchaSent: (...args: unknown[]) => mockCaptchaSent(...args),
    loginCellphone: (...args: unknown[]) => mockLogin(...args),
  },
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (s: { login: (phone: string, captcha: string) => Promise<unknown> }) => unknown) =>
    selector({ login: mockLogin }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const { toast } = await import('sonner')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPhoneInput() {
  return screen.getByPlaceholderText('请输入手机号') as HTMLInputElement
}

function getCaptchaInput() {
  return screen.getByPlaceholderText('6 位验证码') as HTMLInputElement
}

function getSendButton() {
  return screen.getByRole('button', { name: /获取验证码|后重发/ })
}

function getSubmitButton() {
  return screen.getByRole('button', { name: /登 录/ })
}

async function fillValidPhoneAndCaptcha(): Promise<void> {
  const user = userEvent.setup()
  await user.type(getPhoneInput(), '13800138000')
  await user.type(getCaptchaInput(), '123456')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PhoneLoginForm', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockCaptchaSent.mockReset()
    mockLogin.mockResolvedValue({ id: 1, nickname: 'tester' })
    mockCaptchaSent.mockResolvedValue({ code: 200 })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders phone input, captcha input, and submit button', () => {
      render(<PhoneLoginForm />)
      expect(getPhoneInput()).toBeInTheDocument()
      expect(getCaptchaInput()).toBeInTheDocument()
      expect(getSubmitButton()).toBeInTheDocument()
    })

    test('phone input has correct type and maxLength', () => {
      render(<PhoneLoginForm />)
      const phone = getPhoneInput()
      expect(phone).toHaveAttribute('type', 'tel')
      expect(phone).toHaveAttribute('inputmode', 'numeric')
      expect(phone).toHaveAttribute('maxlength', '11')
    })

    test('captcha input has 6 digit max length and numeric inputmode', () => {
      render(<PhoneLoginForm />)
      const captcha = getCaptchaInput()
      expect(captcha).toHaveAttribute('maxlength', '6')
      expect(captcha).toHaveAttribute('inputmode', 'numeric')
    })

    test('initial captcha button is disabled when phone is empty', () => {
      render(<PhoneLoginForm />)
      expect(getSendButton()).toBeDisabled()
    })
  })

  describe('phone number validation', () => {
    test('shows error when phone is not 11 digits after blur', async () => {
      const user = userEvent.setup()
      render(<PhoneLoginForm />)
      const phone = getPhoneInput()
      await user.type(phone, '12345')
      await user.tab()
      expect(await screen.findByText('请输入 11 位手机号')).toBeInTheDocument()
      expect(phone).toHaveAttribute('aria-invalid', 'true')
    })

    test('strips non-digit input', async () => {
      const user = userEvent.setup()
      render(<PhoneLoginForm />)
      const phone = getPhoneInput()
      await user.type(phone, 'abc13800138000xyz')
      expect(phone.value).toBe('13800138000')
    })

    test('caps phone input at 11 digits', async () => {
      const user = userEvent.setup()
      render(<PhoneLoginForm />)
      const phone = getPhoneInput()
      await user.type(phone, '1380013800012345')
      expect(phone.value.length).toBeLessThanOrEqual(11)
    })

    test('does not show error before user has touched the input', () => {
      render(<PhoneLoginForm />)
      expect(screen.queryByText('请输入 11 位手机号')).not.toBeInTheDocument()
    })
  })

  describe('captcha validation', () => {
    test('shows error when captcha is not 6 digits after blur', async () => {
      const user = userEvent.setup()
      render(<PhoneLoginForm />)
      await user.type(getCaptchaInput(), '123')
      await user.tab()
      expect(await screen.findByText('验证码为 6 位数字')).toBeInTheDocument()
      expect(getCaptchaInput()).toHaveAttribute('aria-invalid', 'true')
    })

    test('accepts valid 6-digit captcha without error', async () => {
      const user = userEvent.setup()
      render(<PhoneLoginForm />)
      await user.type(getCaptchaInput(), '123456')
      await user.tab()
      expect(screen.queryByText('验证码为 6 位数字')).not.toBeInTheDocument()
      expect(getCaptchaInput()).toHaveAttribute('aria-invalid', 'false')
    })

    test('strips non-digits from captcha', async () => {
      const user = userEvent.setup()
      render(<PhoneLoginForm />)
      await user.type(getCaptchaInput(), '1a2b3c4d5e6f')
      expect(getCaptchaInput().value).toBe('123456')
    })
  })

  describe('submit behavior', () => {
    test('submit button is disabled when form is invalid', () => {
      render(<PhoneLoginForm />)
      expect(getSubmitButton()).toBeDisabled()
    })

    test('calls login with phone and captcha on valid submit', async () => {
      render(<PhoneLoginForm />)
      await fillValidPhoneAndCaptcha()
      // Submit via the form directly to avoid userEvent's enabled-button check
      // racing with React's batched state updates.
      const form = document.querySelector('form') as HTMLFormElement
      fireEvent.submit(form)
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('13800138000', '123456')
      })
    })

    test('shows error toast when login throws', async () => {
      mockLogin.mockRejectedValueOnce(new Error('验证码错误'))
      render(<PhoneLoginForm />)
      await fillValidPhoneAndCaptcha()
      const form = document.querySelector('form') as HTMLFormElement
      fireEvent.submit(form)
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('验证码错误')
      })
    })
  })

  describe('captcha send button + countdown', () => {
    test('enables send button when phone is valid', async () => {
      const user = userEvent.setup()
      render(<PhoneLoginForm />)
      await user.type(getPhoneInput(), '13800138000')
      expect(getSendButton()).not.toBeDisabled()
    })

    test('calls captchaSent on click and starts countdown', async () => {
      const user = userEvent.setup()
      render(<PhoneLoginForm />)
      await user.type(getPhoneInput(), '13800138000')
      await user.click(getSendButton())
      await waitFor(() => {
        expect(mockCaptchaSent).toHaveBeenCalledWith('13800138000')
      })
      expect(toast.success).toHaveBeenCalled()
    })

    test('disables button and shows countdown text after sending', async () => {
      const user = userEvent.setup()
      render(<PhoneLoginForm />)
      await user.type(getPhoneInput(), '13800138000')
      await user.click(getSendButton())
      await waitFor(() => {
        expect(getSendButton()).toBeDisabled()
      })
      expect(getSendButton().textContent).toMatch(/后重发/)
    })

    test('shows error toast when captcha send fails and keeps button usable', async () => {
      mockCaptchaSent.mockRejectedValueOnce(new Error('网络错误'))
      const user = userEvent.setup()
      render(<PhoneLoginForm />)
      await user.type(getPhoneInput(), '13800138000')
      await user.click(getSendButton())
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('网络错误')
      })
      // After failure, countdown was reset, so the button should re-enable.
      await waitFor(() => {
        expect(getSendButton()).not.toBeDisabled()
      })
    })
  })
})
