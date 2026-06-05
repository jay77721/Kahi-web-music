import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  userStoreState: {
    isLoggedIn: false,
    hasRestoredSession: true,
  },
}))

const LOGIN_CLIENT_SOURCE_FILES = [
  'app/login/page.tsx',
  'app/login/_components/QRLoginPanel.tsx',
  'app/login/_components/PhoneLoginForm.tsx',
] as const

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

function getLoginShell(): HTMLElement {
  return screen.getByRole('main', { name: /Kahi Music/i })
}

function getClassNames(container: HTMLElement): string {
  return Array.from(container.querySelectorAll<HTMLElement>('*'))
    .map((element) => element.className)
    .filter((className): className is string => typeof className === 'string')
    .join(' ')
}

function getLoginTabs(): HTMLButtonElement[] {
  return screen.getAllByRole('tab') as HTMLButtonElement[]
}

describe('LoginPage motion dependency', () => {
  test('keeps login client sources free of framer-motion imports', () => {
    for (const filePath of LOGIN_CLIENT_SOURCE_FILES) {
      const source = readFileSync(join(process.cwd(), filePath), 'utf8')

      expect(source).not.toContain('framer-motion')
    }
  })
})

describe('LoginPage session restoration gate', () => {
  beforeEach(() => {
    mocks.userStoreState.isLoggedIn = false
    mocks.userStoreState.hasRestoredSession = true
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    document.documentElement.removeAttribute('data-theme')
  })

  test('renders the login form after restoration completes for a logged-out user', () => {
    render(<LoginPage />)

    expect(screen.getByText('PhoneLoginForm')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(mocks.routerReplace).not.toHaveBeenCalled()
  })

  test('switches login panels with native tab state', () => {
    render(<LoginPage />)

    const [phoneTab, qrTab] = getLoginTabs()
    expect(phoneTab).toHaveAttribute('aria-selected', 'true')
    expect(phoneTab).toHaveAttribute('data-state', 'active')
    expect(phoneTab).toHaveClass('bg-[var(--accent)]')
    expect(qrTab).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel')).toHaveClass('animate-slide-up')
    expect(screen.getByText('PhoneLoginForm')).toBeInTheDocument()

    fireEvent.click(qrTab)

    expect(phoneTab).toHaveAttribute('aria-selected', 'false')
    expect(phoneTab).toHaveAttribute('data-state', 'inactive')
    expect(qrTab).toHaveAttribute('aria-selected', 'true')
    expect(qrTab).toHaveAttribute('data-state', 'active')
    expect(screen.getByText('QRLoginPanel')).toBeInTheDocument()
    expect(screen.queryByText('PhoneLoginForm')).not.toBeInTheDocument()
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

  test('redirects an authenticated StrictMode render to /my only once', async () => {
    mocks.userStoreState.isLoggedIn = true

    render(
      <StrictMode>
        <LoginPage />
      </StrictMode>
    )

    await waitFor(() => {
      expect(mocks.routerReplace).toHaveBeenCalledTimes(1)
    })
    expect(mocks.routerReplace).toHaveBeenCalledWith('/my')
  })

  test('allows a fresh authenticated remount to redirect after a previous StrictMode redirect', async () => {
    mocks.userStoreState.isLoggedIn = true

    const { unmount } = render(
      <StrictMode>
        <LoginPage />
      </StrictMode>
    )

    await waitFor(() => {
      expect(mocks.routerReplace).toHaveBeenCalledTimes(1)
    })

    unmount()
    render(<LoginPage />)

    await waitFor(() => {
      expect(mocks.routerReplace).toHaveBeenCalledTimes(2)
    })
    expect(mocks.routerReplace).toHaveBeenLastCalledWith('/my')
  })
})

describe('LoginPage theme tokens', () => {
  beforeEach(() => {
    mocks.userStoreState.isLoggedIn = false
    mocks.userStoreState.hasRestoredSession = true
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    document.documentElement.removeAttribute('data-theme')
  })

  test('uses design tokens for login page chrome instead of dark-only palette classes', () => {
    render(<LoginPage />)

    const shell = getLoginShell()
    const classNames = getClassNames(shell)

    expect(shell).toHaveClass('bg-[var(--bg-primary)]')
    expect(shell).toHaveClass('text-[var(--text-primary)]')
    expect(classNames).toContain('bg-[var(--bg-elevated)]')
    expect(classNames).toContain('text-[var(--text-primary)]')
    expect(classNames).toContain('text-[var(--accent-foreground)]')
    expect(classNames).not.toMatch(/\bbg-black\b|\bbg-white\/5\b|\btext-white\b|\btext-black\b|hover:text-white/)
  })

  test.each(['light', 'dark'] as const)(
    'keeps login shell tokenized under %s theme attributes',
    (theme) => {
      document.documentElement.setAttribute('data-theme', theme)

      render(<LoginPage />)

      const shell = getLoginShell()
      const classNames = getClassNames(shell)

      expect(document.documentElement).toHaveAttribute('data-theme', theme)
      expect(shell).toHaveClass('bg-[var(--bg-primary)]')
      expect(shell).toHaveClass('text-[var(--text-primary)]')
      expect(classNames).toContain('bg-[var(--bg-elevated)]')
      expect(classNames).toContain('border-[var(--border)]')
      expect(classNames).not.toMatch(/\bbg-black\b|\bbg-white\/5\b|\btext-white\b|\btext-black\b|hover:text-white/)
    }
  )
})
