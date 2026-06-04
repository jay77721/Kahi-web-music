export interface SuggestSong {
  id: number
  name: string
  artists: { id: number; name: string }[]
  album?: { id: number; name: string; picUrl?: string }
}

export interface SuggestArtist {
  id: number
  name: string
  picUrl?: string
}

export interface SuggestAlbum {
  id: number
  name: string
  artist?: { id: number; name: string }
  picUrl?: string
}

export interface SuggestPlaylist {
  id: number
  name: string
  coverImgUrl?: string
  creator?: { nickname?: string }
}

export interface SearchSuggestResponse {
  code: number
  result: {
    allMatch?: {
      keyword: string
      type?: number
      suggestion?: Array<{ type?: number; keyword?: string }>
    }
    songs?: SuggestSong[]
    artists?: SuggestArtist[]
    albums?: SuggestAlbum[]
    playlists?: SuggestPlaylist[]
  }
}
