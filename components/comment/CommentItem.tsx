'use client'

import { useState, useCallback } from 'react'
import { ThumbsUp, MessageCircle, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatRelativeTime, formatCount } from '@/lib/format'
import { toast } from 'sonner'
import type { Comment } from '@/types/comment'

interface CommentItemProps {
  comment: Comment
  currentUserId?: number
  onLike?: (commentId: number, next: boolean) => void
  onDelete?: (commentId: number) => void
}

export function CommentItem({
  comment,
  currentUserId,
  onLike,
  onDelete,
}: CommentItemProps) {
  const initialLikedCount = Math.max(comment.likedCount ?? 0, 0)
  const [liked, setLiked] = useState<boolean>(Boolean(comment.liked))
  const [likeCount, setLikeCount] = useState<number>(initialLikedCount)

  const isOwner = currentUserId !== undefined && currentUserId === comment.user?.userId
  const nickname = comment.user?.nickname?.trim() || '匿名用户'
  const avatarAlt = nickname === '匿名用户' ? '用户头像' : `${nickname}的头像`
  const avatarFallback = nickname === '匿名用户' ? '?' : nickname[0]
  const content = comment.content?.trim() || '暂无评论内容'
  const timestamp = Number.isFinite(comment.time) ? comment.time : Date.now()

  const handleLike = useCallback(() => {
    const nextLiked = !liked
    const nextCount = nextLiked ? likeCount + 1 : Math.max(likeCount - 1, 0)
    setLiked(nextLiked)
    setLikeCount(nextCount)
    onLike?.(comment.commentId, nextLiked)
  }, [liked, likeCount, comment.commentId, onLike])

  const handleReply = useCallback(() => {
    toast.info('回复功能即将上线')
  }, [])

  const handleDelete = useCallback(() => {
    onDelete?.(comment.commentId)
  }, [comment.commentId, onDelete])

  return (
    <article
      className="flex gap-3 group"
      aria-label={`${nickname}的评论`}
    >
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={comment.user?.avatarUrl} alt={avatarAlt} />
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {nickname}
          </span>
          <time
            className="text-xs text-[var(--text-tertiary)]"
            dateTime={new Date(timestamp).toISOString()}
          >
            {formatRelativeTime(timestamp)}
          </time>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-2 break-words whitespace-pre-wrap">
          {content}
        </p>
        {comment.beReplied && comment.beReplied.length > 0 && (
          <ReplyQuote replies={comment.beReplied} />
        )}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleLike}
            aria-pressed={liked}
            aria-label={liked ? '取消点赞' : '点赞'}
            className={
              'flex items-center gap-1 text-xs transition-colors ' +
              (liked
                ? 'text-[var(--accent-text)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--accent-text)]')
            }
          >
            <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
            {likeCount > 0 && <span>{formatCount(likeCount)}</span>}
          </button>
          <button
            type="button"
            onClick={handleReply}
            aria-label="回复评论"
            className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {comment.replyCount !== undefined && comment.replyCount > 0 && (
              <span>{comment.replyCount}</span>
            )}
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="删除评论"
              className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--error,#ef4444)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              删除
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

interface ReplyQuoteProps {
  replies: NonNullable<Comment['beReplied']>
}

function ReplyQuote({ replies }: ReplyQuoteProps) {
  return (
    <div
      className="bg-[var(--bg-surface)] border-l-2 border-[var(--accent)] rounded-r-lg p-3 mb-2 text-sm text-[var(--text-tertiary)]"
      role="group"
      aria-label="引用回复"
    >
      {replies.map((reply, idx) => (
        <p key={`${reply.user?.userId ?? 'reply'}-${idx}`}>
          <span className="text-[var(--accent-text)]">@{reply.user?.nickname || '匿名'}</span>
          {': '}
          {reply.content?.trim() || '暂无回复内容'}
        </p>
      ))}
    </div>
  )
}
