'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ShareMenu } from '@/components/common/ShareMenu'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCopy = vi.fn()

vi.mock('@/lib/share', async () => {
  const actual = await vi.importActual<typeof import('@/lib/share')>('@/lib/share')
  return {
    ...actual,
    copyToClipboard: (...args: unknown[]) => mockCopy(...args),
  }
})

// Default: every copy resolves successfully unless a test overrides it.
const successCopyResult = { ok: true, method: 'clipboard' as const }

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

const { toast } = await import('sonner')

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockCopy.mockReset()
  mockCopy.mockResolvedValue(successCopyResult)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  })
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { origin: 'https://k.test' } as Location,
  })
  ;(toast.success as ReturnType<typeof vi.fn>).mockReset()
  ;(toast.error as ReturnType<typeof vi.fn>).mockReset()
  ;(toast.info as ReturnType<typeof vi.fn>).mockReset()
})

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderMenu(props: Partial<React.ComponentProps<typeof ShareMenu>> = {}) {
  return render(
    <ShareMenu type="playlist" id={42} title="My Playlist" {...props} />
  )
}

function openMenu() {
  const trigger = screen.getByTestId('share-menu-trigger')
  fireEvent.click(trigger)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShareMenu', () => {
  test('renders the share trigger with accessible attributes', () => {
    renderMenu()
    const trigger = screen.getByTestId('share-menu-trigger')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-label', '分享')
  })

  test('opens the menu and lists all share actions', () => {
    renderMenu()
    openMenu()

    const menu = screen.getByTestId('share-menu')
    expect(menu).toBeInTheDocument()
    expect(menu).toHaveAttribute('role', 'menu')
    expect(menu).toHaveAttribute('aria-label', '分享选项')

    expect(screen.getByTestId('share-menu-item-link')).toBeInTheDocument()
    expect(screen.getByTestId('share-menu-item-embed')).toBeInTheDocument()
    expect(screen.getByTestId('share-menu-item-system')).toBeInTheDocument()

    const trigger = screen.getByTestId('share-menu-trigger')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('copies the share url when "复制链接" is clicked', async () => {
    mockCopy.mockResolvedValue({ ok: true, method: 'clipboard' })
    renderMenu()
    openMenu()

    fireEvent.click(screen.getByTestId('share-menu-item-link'))

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledWith('https://k.test/playlist/42')
    })
    expect(toast.success).toHaveBeenCalledWith('链接已复制')
    // menu closes
    expect(screen.queryByTestId('share-menu')).not.toBeInTheDocument()
  })

  test('copies embed code when "复制嵌入代码" is clicked', async () => {
    mockCopy.mockResolvedValue({ ok: true, method: 'clipboard' })
    renderMenu()
    openMenu()

    fireEvent.click(screen.getByTestId('share-menu-item-embed'))

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledTimes(1)
    })
    const [copiedText] = mockCopy.mock.calls[0] as [string]
    expect(copiedText).toContain('<iframe')
    expect(copiedText).toContain('https://k.test/playlist/42')
    expect(toast.success).toHaveBeenCalledWith('嵌入代码已复制')
  })

  test('shows an error toast when copy fails', async () => {
    mockCopy.mockResolvedValue({ ok: false, method: 'clipboard', error: 'denied' })
    renderMenu()
    openMenu()

    fireEvent.click(screen.getByTestId('share-menu-item-link'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('复制失败，请手动选择文本')
    })
  })

  test('closes the menu when pressing Escape', () => {
    renderMenu()
    openMenu()
    expect(screen.getByTestId('share-menu')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('share-menu')).not.toBeInTheDocument()
  })

  test('closes the menu on outside click', () => {
    renderMenu(
      // Use a wrapper so we can click outside the menu container.
      { className: 'my-share' }
    )
    openMenu()
    expect(screen.getByTestId('share-menu')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByTestId('share-menu')).not.toBeInTheDocument()
  })

  test('uses the provided baseUrl when supplied', () => {
    renderMenu({ baseUrl: 'https://cdn.example' })
    openMenu()
    fireEvent.click(screen.getByTestId('share-menu-item-link'))
    expect(mockCopy).toHaveBeenCalledWith('https://cdn.example/playlist/42')
  })

  test('falls back to "系统分享" info when navigator.share is missing', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })
    renderMenu()
    openMenu()
    fireEvent.click(screen.getByTestId('share-menu-item-system'))
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('当前环境不支持系统分享')
    })
  })

  test('uses navigator.share when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
    })
    renderMenu()
    openMenu()
    fireEvent.click(screen.getByTestId('share-menu-item-system'))
    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith({
        title: 'My Playlist',
        text: 'My Playlist - KaHi Music',
        url: 'https://k.test/playlist/42',
      })
    })
  })
})
