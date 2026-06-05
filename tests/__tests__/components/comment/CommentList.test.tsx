import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CommentList } from '@/components/comment/CommentList'
import type { Comment, CommentResponse } from '@/types/comment'

const mockUseSWR = vi.fn()
const mockMutate = vi.fn()
const mockRequest = vi.fn()

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
  useSWRConfig: () => ({ mutate: mockMutate }),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    request: (...args: unknown[]) => mockRequest(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const hotComment: Comment = {
  commentId: 1,
  user: { userId: 1, nickname: 'Alice', avatarUrl: '' },
  content: 'Hot comment',
  time: Date.now(),
  likedCount: 9,
  liked: false,
}

const newComment: Comment = {
  commentId: 2,
  user: { userId: 2, nickname: 'Bob', avatarUrl: '' },
  content: 'New comment',
  time: Date.now(),
  likedCount: 1,
  liked: false,
}

function swrState(overrides: Partial<{ data: CommentResponse; isLoading: boolean; error: unknown }> = {}) {
  return {
    data: undefined,
    isLoading: false,
    error: undefined,
    ...overrides,
  }
}

beforeEach(() => {
  mockUseSWR.mockReset()
  mockMutate.mockReset()
  mockRequest.mockReset()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CommentList', () => {
  test('renders normalized comment data returned by SWR', () => {
    mockUseSWR.mockReturnValue(
      swrState({
        data: {
          hotComments: [hotComment],
          comments: [newComment],
          total: 2,
          hasMore: false,
        },
      })
    )

    render(<CommentList id="123" type="song" />)

    expect(screen.getByText('共 2 条')).toBeInTheDocument()
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hot comment').length).toBeGreaterThan(0)
  })

  test('normalizes nested data responses in its fetcher', async () => {
    let fetcher: (() => Promise<CommentResponse>) | undefined
    mockUseSWR.mockImplementation((_key, nextFetcher) => {
      fetcher = nextFetcher as () => Promise<CommentResponse>
      return swrState({ isLoading: true })
    })
    mockRequest.mockResolvedValue({
      data: {
        hotComments: [hotComment],
        comments: [newComment],
        total: 2,
        hasMore: false,
      },
    })

    render(<CommentList id="123" type="song" />)

    const result = await fetcher?.()
    expect(mockRequest).toHaveBeenCalledWith('/comment/music', {
      id: '123',
      limit: 50,
    })
    expect(result?.hotComments).toEqual([hotComment])
    expect(result?.comments).toEqual([newComment])
    expect(result?.total).toBe(2)
  })

  test('passes a null SWR key when the resource id is empty', () => {
    mockUseSWR.mockReturnValue(swrState())

    render(<CommentList id="" type="mv" />)

    expect(mockUseSWR.mock.calls[0]?.[0]).toBeNull()
  })
})
