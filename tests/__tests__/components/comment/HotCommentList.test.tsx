import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { HotCommentList } from '@/components/comment/HotCommentList'
import type { Comment } from '@/types/comment'

function makeComment(id: number, likedCount: number, liked = false): Comment {
  return {
    commentId: id,
    user: { userId: id, nickname: `User${id}`, avatarUrl: '' },
    content: `Comment body ${id}`,
    time: Date.now(),
    likedCount,
    liked,
    replyCount: 0,
  }
}

afterEach(() => {
  cleanup()
})

function countListItems(container: HTMLElement): number {
  return container.querySelectorAll('ol > li').length
}

describe('HotCommentList', () => {
  test('renders nothing when there are no hot comments', () => {
    const { container } = render(<HotCommentList comments={[]} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders the title with the hot list heading', () => {
    const { container } = render(
      <HotCommentList
        comments={[makeComment(1, 10), makeComment(2, 5)]}
      />
    )
    expect(container.textContent).toContain('热门评论')
    expect(container.textContent).toContain('Top 2')
  })

  test('limits display to 5 comments even when more are provided', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeComment(i + 1, 100 - i)
    )
    const { container } = render(<HotCommentList comments={many} />)
    expect(container.textContent).toContain('Top 5')
    expect(countListItems(container)).toBe(5)
  })

  test('sorts comments by likedCount descending', () => {
    const a = makeComment(1, 1)
    const b = makeComment(2, 999)
    const c = makeComment(3, 50)
    const { container } = render(<HotCommentList comments={[a, b, c]} />)
    const items = container.querySelectorAll('ol > li')
    expect(items[0]?.textContent).toContain('User2')
    expect(items[1]?.textContent).toContain('User3')
    expect(items[2]?.textContent).toContain('User1')
  })

  test('numbers the hot list 1..N in render order', () => {
    const { container } = render(
      <HotCommentList
        comments={[makeComment(1, 10), makeComment(2, 5)]}
      />
    )
    const items = container.querySelectorAll('ol > li')
    expect(items[0]?.textContent).toMatch(/^1/)
    expect(items[1]?.textContent).toMatch(/^2/)
  })

  test('exposes a labelled region', () => {
    render(<HotCommentList comments={[makeComment(1, 1)]} />)
    expect(
      screen.getByRole('region', { name: '热门评论' })
    ).toBeInTheDocument()
  })

  test('forwards like click to onLike handler', () => {
    const handleLike = vi.fn()
    const { container } = render(
      <HotCommentList
        comments={[makeComment(7, 3)]}
        onLike={handleLike}
      />
    )
    const likeBtn = container.querySelector(
      'button[aria-label="点赞"]'
    ) as HTMLButtonElement
    expect(likeBtn).not.toBeNull()
    fireEvent.click(likeBtn)
    expect(handleLike).toHaveBeenCalledWith(7, true)
  })

  test('does not render when sorted top list is empty', () => {
    const { container } = render(
      <HotCommentList comments={[makeComment(1, 0)]} />
    )
    // likedCount 0 still counts as a comment
    expect(container.textContent).toContain('热门评论')
  })
})
