export interface CommentUser {
  userId: number
  nickname: string
  avatarUrl?: string
}

export interface Comment {
  commentId: number
  user?: CommentUser | null
  content?: string
  time?: number
  likedCount?: number
  liked?: boolean
  beReplied?: {
    user?: CommentUser | null
    content?: string
  }[]
  replyCount?: number
}

export interface CommentResponse {
  hotComments: Comment[]
  comments: Comment[]
  total: number
  hasMore: boolean
}
