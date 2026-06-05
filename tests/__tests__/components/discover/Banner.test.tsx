import type { CSSProperties } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Banner } from '@/components/discover/Banner'

const mockBanners = vi.hoisted(() => [
  {
    imageUrl: 'https://example.com/banner-a.jpg',
    targetId: 1,
    targetType: 1,
    typeTitle: '推荐',
  },
  {
    imageUrl: 'https://example.com/banner-b.jpg',
    targetId: 2,
    targetType: 1,
    typeTitle: '新歌',
  },
])

vi.mock('swr', () => ({
  default: () => ({
    data: mockBanners,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  }),
}))

vi.mock('next/image', () => ({
  default: ({
    alt,
    className,
    src,
    style,
  }: {
    alt: string
    className?: string
    src: string
    style?: CSSProperties
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} className={className} src={src} style={style} />
  ),
}))

describe('Banner', () => {
  test('toggles pause aria-pressed without parent focus or pointer handlers overriding it', () => {
    render(<Banner />)

    const pauseButton = screen.getByRole('button', { name: '暂停自动轮播' })
    expect(pauseButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.pointerDown(pauseButton)
    fireEvent.focus(pauseButton)
    fireEvent.click(pauseButton)

    const resumeButton = screen.getByRole('button', { name: '恢复自动轮播' })
    expect(resumeButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.pointerDown(resumeButton)
    fireEvent.focus(resumeButton)
    fireEvent.click(resumeButton)

    expect(screen.getByRole('button', { name: '暂停自动轮播' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })
})
