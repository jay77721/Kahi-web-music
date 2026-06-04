'use client'

import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PlayingIndicator } from '@/components/common/PlayingIndicator'

describe('PlayingIndicator', () => {
  test('renders three bars', () => {
    const { container } = render(<PlayingIndicator isPlaying />)
    const bars = container.querySelectorAll('.playing-indicator__bar')
    expect(bars.length).toBe(3)
  })

  test('applies playing class when isPlaying is true', () => {
    const { container } = render(<PlayingIndicator isPlaying />)
    const indicator = container.querySelector('.playing-indicator')
    expect(indicator).toHaveClass('playing-indicator--playing')
    expect(indicator).not.toHaveClass('playing-indicator--paused')
  })

  test('applies paused class when isPlaying is false', () => {
    const { container } = render(<PlayingIndicator isPlaying={false} />)
    const indicator = container.querySelector('.playing-indicator')
    expect(indicator).toHaveClass('playing-indicator--paused')
    expect(indicator).not.toHaveClass('playing-indicator--playing')
  })

  test('uses default sm size (heights 8/12/6 px)', () => {
    const { container } = render(<PlayingIndicator isPlaying />)
    const bars = container.querySelectorAll('.playing-indicator__bar')
    expect((bars[0] as HTMLElement).style.height).toBe('8px')
    expect((bars[1] as HTMLElement).style.height).toBe('12px')
    expect((bars[2] as HTMLElement).style.height).toBe('6px')
  })

  test('uses md size when specified (heights 12/18/9 px)', () => {
    const { container } = render(<PlayingIndicator isPlaying size="md" />)
    const bars = container.querySelectorAll('.playing-indicator__bar')
    expect((bars[0] as HTMLElement).style.height).toBe('12px')
    expect((bars[1] as HTMLElement).style.height).toBe('18px')
    expect((bars[2] as HTMLElement).style.height).toBe('9px')
  })

  test('forwards additional className to root', () => {
    const { container } = render(<PlayingIndicator isPlaying className="custom-mx" />)
    const indicator = container.querySelector('.playing-indicator')
    expect(indicator).toHaveClass('custom-mx')
  })

  test('marks itself as presentational / hidden from assistive tech', () => {
    const { container } = render(<PlayingIndicator isPlaying />)
    const indicator = container.querySelector('.playing-indicator')
    expect(indicator).toHaveAttribute('aria-hidden', 'true')
    expect(indicator).toHaveAttribute('role', 'presentation')
  })
})
