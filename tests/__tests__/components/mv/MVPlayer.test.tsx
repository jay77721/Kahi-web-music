import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MVPlayer } from '@/components/mv/MVPlayer'

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ 'aria-label': ariaLabel }: { 'aria-label'?: string }) => (
    <input aria-label={ariaLabel} type="range" />
  ),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MVPlayer', () => {
  test('renders an error state when the source is missing', () => {
    const { container } = render(<MVPlayer src={null} />)

    expect(screen.getByTestId('mv-player-error')).toHaveTextContent('无法获取播放地址')
    expect(container.querySelector('video')).toBeNull()
  })

  test('resets to the missing-source error when the source is removed', () => {
    const { rerender } = render(<MVPlayer src="https://cdn.example.com/mv.mp4" />)

    expect(screen.getByTestId('mv-player-loading')).toBeInTheDocument()

    rerender(<MVPlayer src={undefined} />)

    expect(screen.getByTestId('mv-player-error')).toHaveTextContent('无法获取播放地址')
  })

  test('notifies callers when the video element reports a load error', () => {
    const handleError = vi.fn()
    const { container } = render(
      <MVPlayer src="https://cdn.example.com/mv.mp4" onError={handleError} />
    )

    const video = container.querySelector('video')
    expect(video).not.toBeNull()

    fireEvent.error(video as HTMLVideoElement)

    expect(handleError).toHaveBeenCalledWith('视频加载失败')
    expect(screen.getByTestId('mv-player-error')).toHaveTextContent('视频加载失败')
  })
})
