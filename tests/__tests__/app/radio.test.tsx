'use client'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import type { DjRadio } from '@/types/dj'

const mockUseSWR = vi.fn()

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    djhot: vi.fn(),
    djprogramToplist: vi.fn(),
    djradio: vi.fn(),
  },
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

function swrState<T>(overrides: Partial<{ data: T; error: unknown; isLoading: boolean }> = {}) {
  return {
    data: undefined as T | undefined,
    error: undefined,
    isLoading: false,
    ...overrides,
  }
}

function makeRadios(count: number): DjRadio[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Radio ${index + 1}`,
    desc: '',
    picUrl: `https://pics.example.com/radio/${index + 1}.jpg`,
    subCount: 1000 + index,
    programCount: 20 + index,
    shareCount: 0,
    likeCount: 0,
    score: 0,
    djId: index + 1,
    djName: `DJ ${index + 1}`,
  }))
}

describe('RadioPage', () => {
  beforeEach(() => {
    mockUseSWR.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('renders the all-radio grid in batches and expands on demand', async () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'djradio-all') return swrState({ data: makeRadios(26) })
      return swrState({ data: [] })
    })

    const { default: RadioPage } = await import('@/app/radio/page')
    render(<RadioPage />)

    fireEvent.click(screen.getByTestId('radio-tab-all'))

    expect(screen.getByTestId('radio-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('radio-card-24')).toBeInTheDocument()
    expect(screen.queryByTestId('radio-card-25')).not.toBeInTheDocument()

    const firstCover = screen.getByRole('img', { name: 'Radio 1' })
    expect(firstCover).toHaveAttribute('loading', 'lazy')
    expect(firstCover).toHaveAttribute('decoding', 'async')

    fireEvent.click(screen.getByTestId('radio-load-more'))

    expect(screen.getByTestId('radio-card-25')).toBeInTheDocument()
    expect(screen.getByTestId('radio-card-26')).toBeInTheDocument()
    expect(screen.queryByTestId('radio-load-more')).not.toBeInTheDocument()
  })

  test('does not retry hot-radio failures and can render another radio section', async () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'djradio-hot') return swrState({ error: new Error('404 Not Found') })
      if (key === 'djradio-all') return swrState({ data: makeRadios(1) })
      return swrState({ data: [] })
    })

    const { default: RadioPage } = await import('@/app/radio/page')
    render(<RadioPage />)

    expect(screen.getByTestId('radio-error-state')).toBeInTheDocument()

    const hotCall = mockUseSWR.mock.calls.find(([key]) => key === 'djradio-hot')
    expect(hotCall?.[2]).toMatchObject({ shouldRetryOnError: false })

    fireEvent.click(screen.getByTestId('radio-tab-all'))

    expect(screen.getByTestId('radio-card-1')).toBeInTheDocument()
    expect(mockUseSWR.mock.calls.filter(([key]) => key === 'djradio-hot')).toHaveLength(1)
  })
})
