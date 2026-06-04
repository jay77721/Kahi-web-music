import type { Song } from './api'
import type { User } from './user'

export interface Playlist {
  id: number
  name: string
  coverImgUrl: string
  creator: User
  description?: string
  tracks?: Song[]
  trackCount: number
  playCount: number
  subscribedCount: number
  createTime: number
  updateTime: number
  tags?: string[]
}
