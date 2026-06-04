import type { Song } from './api'

export interface Artist {
  id: number
  name: string
  picUrl?: string
  img1v1Url?: string
  alias?: string[]
  albumSize?: number
  mvSize?: number
  musicSize?: number
}

export interface ArtistDetail {
  artist: Artist
  hotSongs: Song[]
  more: boolean
  user?: {
    userId: number
    nickname: string
    avatarUrl: string
  }
}
