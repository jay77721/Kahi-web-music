'use client'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import type { DjProgramToplistItem, DjRadio } from '@/types/dj'

const mockUseSWR = vi.fn()

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    djhot: vi.fn(),
    djprogram: vi.fn(),
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

function makePrograms(count: number): DjProgramToplistItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 101,
    name: `Program ${index + 1}`,
    coverUrl: `https://pics.example.com/program/${index + 1}.jpg`,
    dj: {
      userId: index + 1,
      nickname: `Host ${index + 1}`,
      avatarUrl: `https://pics.example.com/host/${index + 1}.jpg`,
    },
    count: 0,
    price: 0,
    fee: 0,
    duration: 180 + index,
    createTime: Date.now() - index * 60_000,
    description: '',
    radioId: 1,
    rank: index + 1,
  }))
}

function getSwrCall(key: string) {
  return mockUseSWR.mock.calls.find(([callKey]) => callKey === key)
}

describe('RadioPage', () => {
  beforeEach(() => {
    mockUseSWR.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('renders a compact hot-radio first paint and keeps browsing paths available', async () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'djradio-hot') return swrState({ data: makeRadios(10) })
      if (key === 'djradio-all') return swrState({ data: makeRadios(13) })
      return swrState({ data: [] })
    })

    const { default: RadioPage } = await import('@/app/radio/page')
    render(<RadioPage />)

    expect(screen.getByTestId('radio-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('radio-card-6')).toBeInTheDocument()
    expect(screen.queryByTestId('radio-card-7')).not.toBeInTheDocument()

    const firstCover = screen.getByRole('img', { name: 'Radio 1' })
    expect(firstCover).toHaveAttribute('loading', 'lazy')
    expect(firstCover).toHaveAttribute('decoding', 'async')
    expect(firstCover).toHaveAttribute('sizes')
    expect(firstCover.getAttribute('src')).toContain('?param=180y180')

    fireEvent.click(screen.getByTestId('radio-load-more'))

    expect(screen.getByTestId('radio-card-10')).toBeInTheDocument()
    expect(screen.queryByTestId('radio-load-more')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('radio-hot-view-all'))

    expect(screen.getByTestId('radio-tab-all')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('radio-card-12')).toBeInTheDocument()
    expect(screen.queryByTestId('radio-card-13')).not.toBeInTheDocument()
  })

  test('renders the all-radio grid in smaller batches and expands on demand', async () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'djradio-all') return swrState({ data: makeRadios(14) })
      return swrState({ data: [] })
    })
    const { ncmApi } = await import('@/lib/api')
    vi.mocked(ncmApi.djhot).mockResolvedValue({ djRadios: makeRadios(14) })

    const { default: RadioPage } = await import('@/app/radio/page')
    render(<RadioPage />)

    fireEvent.click(screen.getByTestId('radio-tab-all'))

    expect(screen.getByTestId('radio-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('radio-card-12')).toBeInTheDocument()
    expect(screen.queryByTestId('radio-card-13')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('radio-load-more'))

    expect(screen.getByTestId('radio-card-13')).toBeInTheDocument()
    expect(screen.getByTestId('radio-card-14')).toBeInTheDocument()
    expect(screen.queryByTestId('radio-load-more')).not.toBeInTheDocument()

    const allCall = getSwrCall('djradio-all')
    expect(allCall?.[2]).toMatchObject({ shouldRetryOnError: false })

    const allFetcher = allCall?.[1] as (() => Promise<DjRadio[]>) | undefined
    expect(allFetcher).toBeDefined()
    const allRadios = await allFetcher!()
    expect(allRadios).toHaveLength(14)
    expect(ncmApi.djhot).toHaveBeenCalledWith(24)
    expect(ncmApi.djradio).not.toHaveBeenCalled()
  })

  test('builds the program toplist without calling the 404-prone toplist endpoint', async () => {
    mockUseSWR.mockImplementation((key: string) => {
      if (key === 'djprogram-toplist') return swrState({ data: makePrograms(2) })
      return swrState({ data: [] })
    })
    const { ncmApi } = await import('@/lib/api')
    vi.mocked(ncmApi.djhot).mockResolvedValue({ djRadios: makeRadios(1) })
    vi.mocked(ncmApi.djprogram).mockResolvedValue({ programs: makePrograms(3) })

    const { default: RadioPage } = await import('@/app/radio/page')
    render(<RadioPage />)

    fireEvent.click(screen.getByTestId('radio-tab-toplist'))

    expect(screen.getByText('Program 1')).toBeInTheDocument()
    expect(screen.getByText('Program 2')).toBeInTheDocument()

    const toplistCall = getSwrCall('djprogram-toplist')
    expect(toplistCall?.[2]).toMatchObject({ shouldRetryOnError: false })

    const toplistFetcher = toplistCall?.[1] as (() => Promise<DjProgramToplistItem[]>) | undefined
    expect(toplistFetcher).toBeDefined()
    const programs = await toplistFetcher!()
    expect(programs).toHaveLength(3)
    expect(ncmApi.djhot).toHaveBeenCalledWith(1)
    expect(ncmApi.djprogram).toHaveBeenCalledWith(1, 20)
    expect(ncmApi.djprogramToplist).not.toHaveBeenCalled()
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
