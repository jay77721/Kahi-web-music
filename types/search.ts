export interface SuggestSong {
  id: number
  name: string
  artists?: { id: number; name: string }[]
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

export type SearchSuggestionSection = 'songs' | 'artists' | 'albums' | 'playlists'

export interface SearchSuggestMatch {
  keyword?: string
  type?: number
  alg?: string
  suggestion?: Array<{ type?: number; keyword?: string }>
}

export interface SearchSuggestResult {
  allMatch?: SearchSuggestMatch
  songs?: SuggestSong[]
  artists?: SuggestArtist[]
  albums?: SuggestAlbum[]
  playlists?: SuggestPlaylist[]
}

export interface SearchSuggestResponse {
  code: number
  result: SearchSuggestResult
}
