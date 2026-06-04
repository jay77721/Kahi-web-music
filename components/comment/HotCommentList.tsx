'use client'

import { Flame } from 'lucide-react'
import { CommentItem } from './CommentItem'
import type { Comment } from '@/types/api'

interface HotCommentListProps {
  comments: Comment[]
  currentUserId?: number
  onLike?: (commentId: number, next: boolean) => void
  onDelete?: (commentId: number) => void
}

const MAX_HOT_COMMENTS = 5

export function HotCommentList({
  comments,
  currentUserId,
  onLike,
  onDelete,
}: HotCommentListProps) {
  if (comments.length === 0) return null

  const sorted = [...comments]
    .sort((a, b) => b.likedCount - a.likedCount)
    .slice(0, MAX_HOT_COMMENTS)

  return (
    <section
      aria-label="热门评论"
      className="glass-subtle rounded-2xl p-5 mb-6 space-y-4"
    >
      <header className="flex items-center gap-2 mb-2">
        <Flame
          className="w-5 h-5 text-[var(--accent)]"
          aria-hidden="true"
        />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          热门评论
        </h3>
        <span className="text-xs text-[var(--text-tertiary)]">
          Top {sorted.length}
        </span>
      </header>
      <ol className="space-y-4 list-none p-0">
        {sorted.map((comment, idx) => (
          <li
            key={comment.commentId}
            className="flex gap-3"
            aria-label={`热门评论第 ${idx + 1} 名`}
          >
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--bg-surface)] text-[var(--accent)] text-xs font-bold flex items-center justify-center"
              aria-hidden="true"
            >
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                onLike={onLike}
                onDelete={onDelete}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
