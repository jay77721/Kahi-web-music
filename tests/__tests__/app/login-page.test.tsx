import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  userStoreState: {
    isLoggedIn: false,
    hasRestoredSession: true,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    replace: mocks.routerReplace,
  }),
}))

vi.mock('@/hooks/useDominantColor', () => ({
  useDominantColor: () => ({ color: null }),
}))

vi.mock('@/app/login/_components/PhoneLoginForm', () => ({
  PhoneLoginForm: () => 'PhoneLoginForm',
}))

vi.mock('@/app/login/_components/QRLoginPanel', () => ({
  QRLoginPanel: () => 'QRLoginPanel',
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: (
    selector: (state: { isLoggedIn: boolean; hasRestoredSession: boolean }) => unknown
  ) => selector(mocks.userStoreState),
}))

describe('LoginPage session restoration gate', () => {
  beforeEach(() => {
    mocks.userStoreState.isLoggedIn = false
    mocks.userStoreState.hasRestoredSession = true
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  test('renders the login form after restoration completes for a logged-out user', () => {
    render(<LoginPage />)

    expect(screen.getByText('PhoneLoginForm')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(mocks.routerReplace).not.toHaveBeenCalled()
  })

  test('does not render the login form while session restoration is pending', () => {
    mocks.userStoreState.hasRestoredSession = false

    render(<LoginPage />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('PhoneLoginForm')).not.toBeInTheDocument()
    expect(mocks.routerReplace).not.toHaveBeenCalled()
  })

  test('does not render the login form and redirects when already logged in', async () => {
    mocks.userStoreState.isLoggedIn = true

    render(<LoginPage />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('PhoneLoginForm')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(mocks.routerReplace).toHaveBeenCalledWith('/my')
    })
  })
})
