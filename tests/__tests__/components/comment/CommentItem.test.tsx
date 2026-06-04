import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { CommentItem } from '@/components/comment/CommentItem'
import type { Comment } from '@/types/comment'

const baseComment: Comment = {
  commentId: 101,
  user: { userId: 1, nickname: 'Alice', avatarUrl: 'https://example.com/a.png' },
  content: 'This is a test comment',
  time: Date.now() - 5_000,
  likedCount: 5,
  liked: false,
  replyCount: 0,
}

afterEach(() => {
  cleanup()
})

function getLikeButton(container: HTMLElement): HTMLButtonElement {
  const btn = container.querySelector(
    'button[aria-label="点赞"], button[aria-label="取消点赞"]'
  )
  if (!btn) throw new Error('Like button not found')
  return btn as HTMLButtonElement
}

function getReplyButton(container: HTMLElement): HTMLButtonElement {
  const btn = container.querySelector('button[aria-label="回复评论"]')
  if (!btn) throw new Error('Reply button not found')
  return btn as HTMLButtonElement
}

function getDeleteButton(container: HTMLElement): HTMLButtonElement {
  const btn = container.querySelector('button[aria-label="删除评论"]')
  if (!btn) throw new Error('Delete button not found')
  return btn as HTMLButtonElement
}

describe('CommentItem', () => {
  test('renders nickname, content and time', () => {
    const { container } = render(<CommentItem comment={baseComment} />)
    expect(container.textContent).toContain('Alice')
    expect(container.textContent).toContain('This is a test comment')
    expect(container.textContent).toContain('刚刚')
  })

  test('toggles like state on click', () => {
    const handleLike = vi.fn()
    const { container } = render(
      <CommentItem comment={baseComment} onLike={handleLike} />
    )
    const likeBtn = getLikeButton(container)
    expect(likeBtn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(likeBtn)
    expect(likeBtn.getAttribute('aria-pressed')).toBe('true')
    expect(handleLike).toHaveBeenCalledWith(101, true)
  })

  test('increments likedCount locally when liked', () => {
    const { container } = render(<CommentItem comment={baseComment} />)
    expect(container.textContent).toContain('5')
    fireEvent.click(getLikeButton(container))
    expect(container.textContent).toContain('6')
  })

  test('decrements likedCount when unliked', () => {
    const liked: Comment = { ...baseComment, liked: true, likedCount: 10 }
    const { container } = render(<CommentItem comment={liked} />)
    expect(container.textContent).toContain('10')
    fireEvent.click(getLikeButton(container))
    expect(container.textContent).toContain('9')
  })

  test('shows delete button only for owner', () => {
    const { container: owned } = render(
      <CommentItem comment={baseComment} currentUserId={1} />
    )
    expect(owned.querySelector('button[aria-label="删除评论"]')).not.toBeNull()

    cleanup()

    const { container: other } = render(
      <CommentItem comment={baseComment} currentUserId={2} />
    )
    expect(other.querySelector('button[aria-label="删除评论"]')).toBeNull()
  })

  test('invokes onDelete with the comment id', () => {
    const handleDelete = vi.fn()
    const { container } = render(
      <CommentItem
        comment={baseComment}
        currentUserId={1}
        onDelete={handleDelete}
      />
    )
    fireEvent.click(getDeleteButton(container))
    expect(handleDelete).toHaveBeenCalledWith(101)
  })

  test('reply button is keyboard reachable', () => {
    const { container } = render(<CommentItem comment={baseComment} />)
    const replyBtn = getReplyButton(container)
    expect(replyBtn).toBeInTheDocument()
    fireEvent.click(replyBtn)
  })

  test('renders reply count when present', () => {
    const { container } = render(
      <CommentItem comment={{ ...baseComment, replyCount: 12 }} />
    )
    expect(container.textContent).toContain('12')
  })

  test('hides like count when zero', () => {
    const { container } = render(
      <CommentItem comment={{ ...baseComment, likedCount: 0 }} />
    )
    const likeBtn = getLikeButton(container)
    expect(likeBtn.querySelector('span')).toBeNull()
  })

  test('falls back to anonymous user when fields missing', () => {
    const orphan: Comment = {
      ...baseComment,
      user: { userId: 0, nickname: '', avatarUrl: '' },
    }
    const { container } = render(<CommentItem comment={orphan} />)
    expect(container.textContent).toContain('匿名用户')
  })
})
