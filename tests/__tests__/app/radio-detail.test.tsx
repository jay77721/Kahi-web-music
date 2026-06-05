'use client'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import type { DjProgram } from '@/types/dj'

const mockUseParams = vi.fn()
const mockUseSWR = vi.fn()

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useParams: () => mockUseParams(),
  }
})

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    djprogram: vi.fn(),
  },
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

const PROGRAMS: DjProgram[] = [
  {
    id: 101,
    name: 'Late Night Episode',
    coverUrl: 'https://pics.example.com/program/101.jpg',
    dj: { userId: 1, nickname: 'Host A', avatarUrl: 'https://pics.example.com/host.jpg' },
    count: 12,
    price: 0,
    fee: 0,
    duration: 360,
    createTime: Date.now() - 60_000,
    description: 'A short episode description',
  },
]

describe('RadioDetailPage', () => {
  beforeEach(() => {
    mockUseParams.mockReset()
    mockUseSWR.mockReset()
    mockUseParams.mockReturnValue({ id: '44' })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('renders loading skeleton while programs are pending', async () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: undefined })

    const { default: RadioDetailPage } = await import('@/app/radio/[id]/page')
    render(<RadioDetailPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('radio-detail-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('radio-detail-page')).not.toBeInTheDocument()
  })

  test('renders error state for invalid ids', async () => {
    mockUseParams.mockReturnValue({ id: 'not-a-number' })
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined })

    const { default: RadioDetailPage } = await import('@/app/radio/[id]/page')
    render(<RadioDetailPage />)

    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function))
    expect(screen.getByTestId('radio-detail-error')).toBeInTheDocument()
  })

  test('renders empty state when the radio has no programs', async () => {
    mockUseSWR.mockReturnValue({ data: [], isLoading: false, error: undefined })

    const { default: RadioDetailPage } = await import('@/app/radio/[id]/page')
    render(<RadioDetailPage />)

    expect(screen.getByTestId('radio-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('radio-detail-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('radio-program-list')).not.toBeInTheDocument()
  })

  test('renders program rows when loaded', async () => {
    mockUseSWR.mockReturnValue({ data: PROGRAMS, isLoading: false, error: undefined })

    const { default: RadioDetailPage } = await import('@/app/radio/[id]/page')
    render(<RadioDetailPage />)

    expect(mockUseSWR).toHaveBeenCalledWith('djprogram-44', expect.any(Function))
    expect(screen.getByTestId('radio-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('radio-program-list')).toBeInTheDocument()
    expect(screen.getByTestId('radio-program-card-101')).toBeInTheDocument()
    expect(screen.getByText('Late Night Episode')).toBeInTheDocument()
    expect(screen.getByText('Host A')).toBeInTheDocument()
  })
})
