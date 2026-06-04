'use client'

import { useState, useCallback } from 'react'
import { useSWRConfig } from 'swr'
import useSWR from 'swr'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { HotCommentList } from './HotCommentList'
import { CommentItem } from './CommentItem'
import { ncmApi } from '@/lib/api'
import { formatCount } from '@/lib/format'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types/api'
import type { Comment, CommentResponse } from '@/types/comment'

interface CommentListProps {
  id: number | string
  type: 'song' | 'playlist' | 'album' | 'mv'
}

const COMMENT_LIMIT = 50

export function CommentList({ id, type }: CommentListProps) {
  const [tab, setTab] = useState('hot')
  const swrKey = `comments-${type}-${id}`
  const { mutate } = useSWRConfig()

  const fetcher = useCallback(async (): Promise<ApiResponse<CommentResponse>> => {
    if (type === 'song') return ncmApi.request<ApiResponse<CommentResponse>>('/comment/music', { id, limit: COMMENT_LIMIT })
    if (type === 'playlist') return ncmApi.request<ApiResponse<CommentResponse>>('/comment/playlist', { id, limit: COMMENT_LIMIT })
    if (type === 'album') return ncmApi.request<ApiResponse<CommentResponse>>('/comment/album', { id, limit: COMMENT_LIMIT })
    if (type === 'mv') return ncmApi.request<ApiResponse<CommentResponse>>('/comment/mv', { id, limit: COMMENT_LIMIT })
    throw new Error(`Unsupported comment type: ${type}`)
  }, [id, type])

  const { data, isLoading, error } = useSWR<ApiResponse<CommentResponse>>(swrKey, fetcher)

  const hotComments: Comment[] = data?.data?.hotComments ?? []
  const comments: Comment[] = data?.data?.comments ?? []
  const total: number = data?.data?.total ?? 0

  if (isLoading) return <CommentListSkeleton />

  if (error) {
    return (
      <ErrorState
        message="评论加载失败"
        onRetry={() => mutate(swrKey)}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">评论</h3>
        <span className="text-sm text-[var(--text-tertiary)]">
          共 {formatCount(total)} 条
        </span>
      </div>

      {hotComments.length > 0 && (
        <HotCommentList comments={hotComments} />
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[var(--bg-surface)] mb-4">
          <TabsTrigger value="hot" className="data-[state=active]:bg-[var(--bg-hover)]">
            热门评论
          </TabsTrigger>
          <TabsTrigger value="new" className="data-[state=active]:bg-[var(--bg-hover)]">
            最新评论
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hot">
          <CommentItems comments={hotComments} tabKey="hot" />
        </TabsContent>
        <TabsContent value="new">
          <CommentItems comments={comments} tabKey="new" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface CommentItemsProps {
  comments: Comment[]
  tabKey: 'hot' | 'new'
}

function CommentItems({ comments, tabKey }: CommentItemsProps) {
  const { mutate } = useSWRConfig()

  const handleLike = useCallback(
    (commentId: number) => {
      void commentId
      toast.success(tabKey === 'hot' ? '已点赞热门评论' : '已点赞评论')
    },
    [tabKey]
  )

  const handleDelete = useCallback(
    (commentId: number) => {
      void commentId
      mutate(
        (key) => typeof key === 'string' && key.startsWith('comments-'),
        undefined,
        { revalidate: true }
      )
      toast.success('评论已删除')
    },
    [mutate]
  )

  if (comments.length === 0) {
    return (
      <p className="text-center text-[var(--text-tertiary)] py-8">
        暂无评论
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.commentId}
          comment={comment}
          onLike={handleLike}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}

function CommentListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="评论加载中">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      className="text-center py-12"
      role="alert"
      aria-live="polite"
    >
      <p className="text-[var(--error,#ef4444)] mb-3">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm text-[var(--accent)] hover:underline"
      >
        重试
      </button>
    </div>
  )
}
