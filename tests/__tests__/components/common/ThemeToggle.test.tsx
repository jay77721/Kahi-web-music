import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useUIStore } from '@/stores/uiStore'

function resetStore() {
  localStorage.clear()
  useUIStore.setState({
    sidebarOpen: true,
    sidebarWidth: 240,
    fullScreenPlayerOpen: false,
    playQueueOpen: false,
    searchOpen: false,
    theme: 'dark',
    isMobile: false,
  })
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    cleanup()
    resetStore()
  })

  test('renders a radiogroup with three options', () => {
    render(<ThemeToggle />)
    const group = screen.getByRole('radiogroup', { name: '主题切换' })
    expect(group).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })

  test('marks the current theme as aria-checked', () => {
    useUIStore.setState({ theme: 'light' })
    render(<ThemeToggle />)
    expect(screen.getByTestId('theme-toggle-light')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('theme-toggle-dark')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('theme-toggle-system')).toHaveAttribute('aria-checked', 'false')
  })

  test('clicking a radio updates the store and persists to localStorage', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByTestId('theme-toggle-light'))
    expect(useUIStore.getState().theme).toBe('light')
    expect(localStorage.getItem('kahi-web-music:ui:theme')).toBe('"light"')
  })

  test('clicking "system" switches to system mode', () => {
    useUIStore.setState({ theme: 'light' })
    render(<ThemeToggle />)
    fireEvent.click(screen.getByTestId('theme-toggle-system'))
    expect(useUIStore.getState().theme).toBe('system')
  })

  test('clicking "dark" switches to dark mode', () => {
    useUIStore.setState({ theme: 'light' })
    render(<ThemeToggle />)
    fireEvent.click(screen.getByTestId('theme-toggle-dark'))
    expect(useUIStore.getState().theme).toBe('dark')
  })

  test('each option exposes a descriptive aria-label', () => {
    render(<ThemeToggle />)
    expect(screen.getByTestId('theme-toggle-system')).toHaveAttribute('aria-label', '跟随系统主题')
    expect(screen.getByTestId('theme-toggle-dark')).toHaveAttribute('aria-label', '切换到深色主题')
    expect(screen.getByTestId('theme-toggle-light')).toHaveAttribute('aria-label', '切换到浅色主题')
  })

  test('renders an icon inside every option', () => {
    const { container } = render(<ThemeToggle />)
    // lucide-react emits an <svg> per icon; the three options should
    // each contribute exactly one svg in the rendered tree.
    const radioButtons = screen.getAllByRole('radio')
    for (const button of radioButtons) {
      expect(button.querySelector('svg')).toBeTruthy()
    }
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(3)
  })

  test('forwards custom className to the radiogroup wrapper', () => {
    render(<ThemeToggle className="custom-cls" />)
    const group = screen.getByRole('radiogroup')
    expect(group).toHaveClass('custom-cls')
  })

  test('only one option is aria-checked at a time', () => {
    useUIStore.setState({ theme: 'system' })
    render(<ThemeToggle />)
    const checked = screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0]).toBe(screen.getByTestId('theme-toggle-system'))
  })

  test('uses roving tab index for the selected radio', () => {
    useUIStore.setState({ theme: 'light' })
    render(<ThemeToggle />)

    expect(screen.getByTestId('theme-toggle-light')).toHaveAttribute('tabindex', '0')
    expect(screen.getByTestId('theme-toggle-dark')).toHaveAttribute('tabindex', '-1')
    expect(screen.getByTestId('theme-toggle-system')).toHaveAttribute('tabindex', '-1')
  })

  test('supports arrow-key selection within the radiogroup', () => {
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0)
        return 1
      })

    render(<ThemeToggle />)

    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' })

    expect(useUIStore.getState().theme).toBe('light')
    expect(screen.getByTestId('theme-toggle-light')).toHaveFocus()

    rafSpy.mockRestore()
  })
})
