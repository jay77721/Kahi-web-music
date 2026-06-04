import type { Song } from './api'
import type { Artist } from './artist'

export interface Album {
  id: number
  name: string
  picUrl: string
  publishTime: number
  artist?: Artist
  songs?: Song[]
}
