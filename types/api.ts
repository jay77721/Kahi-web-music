export interface ApiResponse<T = unknown> {
  code: number
  data?: T
  message?: string
  msg?: string
}

export interface PaginatedParams {
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T = unknown> {
  code: number
  data?: T
  hasMore: boolean
  total: number
}

// API response wrappers
export interface SongDetailResponse {
  songs: Song[]
}

export interface LyricDataResponse {
  lrc: { lyric: string }
  tlyric?: { lyric: string }
  klyric?: { lyric: string }
  sgc: boolean
  sfy: boolean
  qfy: boolean
}

export interface SimiSongResponse {
  songs: Song[]
}

export interface PlaylistDetailResponse {
  playlist: Playlist
  code: number
}

export interface PlaylistTrackResponse {
  songs: Song[]
  code: number
}

export interface HotSearchItem {
  first: string
  second: number
  iconType?: number
}

export interface HotSearchResponse {
  result: { hots: HotSearchItem[] }
  code: number
}

export interface LoginCellphoneResponse {
  code: number
  profile?: UserProfile
  cookie?: string
  message?: string
}

export interface LikelistResponse {
  ids: number[]
  code: number
}

export interface UserRecordItem {
  data: Song
  playCount: number
  score: number
}

export interface UserRecordResponse {
  list: UserRecordItem[]
  code: number
}

export interface UserCloudItem {
  id: number
  fileName: string
  artist: string
  albumId: number
  album: string
  fileSize: number
  addTime: number
  simpleSong: Song
  lyricId: string
  flag: number
}

export interface UserCloudResponse {
  list: UserCloudItem[]
  count: number
  code: number
}

export interface UserDetailResponse {
  profile: UserProfile
  code: number
}

export interface UserPlaylistResponse {
  playlist: Playlist[]
  code: number
}

export interface PersonalFMResponse {
  data: Song[]
  code: number
}

export interface ArtistDetailResponse {
  artist: Artist
  hotSongs: Song[]
  more: boolean
  user?: {
    userId: number
    nickname: string
    avatarUrl: string
  }
  code: number
}

export interface ArtistAlbumResponse {
  hotAlbums: Album[]
  code: number
}

export interface MVDetailResponse {
  mv: MV
  code: number
}

export interface MVDetailInfoResponse {
  likedCount: number
  shareCount: number
  commentCount: number
  code: number
}

export interface SimiMvResponse {
  mvs: MV[]
  code: number
}

export interface ToplistResponse {
  list: {
    id: number
    name: string
    coverImgUrl: string
    updateTime: number
  }[]
  code: number
}

export interface TopListResponse {
  playlist: {
    tracks: Song[]
    name: string
    coverImgUrl: string
    trackCount: number
    playCount: number
    description?: string
    creator: UserProfile
    createTime: number
  }
  code: number
}

export interface SearchResponse {
  result: {
    songs?: Song[]
    playlists?: Playlist[]
    artists?: Artist[]
    albums?: Album[]
    mvs?: MV[]
    songCount?: number
    playlistCount?: number
    artistCount?: number
    albumCount?: number
    mvCount?: number
  }
  code: number
}

export interface LyricSearchSong extends Song {
  lyric?: string
}

export interface LyricSearchResponse {
  result: {
    songs?: LyricSearchSong[]
    songCount?: number
  }
  code: number
}

export interface LyricSearchResult {
  id: number
  name: string
  artists: SongArtist[]
  album: SongAlbum
  lyric: string
}

export const SearchType = {
  SONG: 1,
  ALBUM: 10,
  ARTIST: 100,
  PLAYLIST: 1000,
  USER: 1002,
  MV: 1004,
  LYRIC: 1006,
  RADIO: 1009,
  VIDEO: 1014,
} as const

export type SearchTypeValue = (typeof SearchType)[keyof typeof SearchType]

export type PlayMode = 'sequential' | 'shuffle' | 'repeat-one' | 'repeat-all'

export interface Song {
  id: number
  name: string
  ar?: SongArtist[]
  al?: SongAlbum
  dt?: number
  st?: number
  alia?: string[]
  pop?: number
  fee?: number
  publishTime: number
  noCopyrightRcmd: unknown | null
  mv: number
  url?: string | null
  br?: number
  privilege?: {
    id: number
    fee: number
    payed: number
    st: number
    pl: number
    dl: number
    sp: number
    cp: number
    subp: number
    cs: boolean
    maxbr: number
    fl: number
    type: number
    br: number
  }
}

export interface SongArtist {
  id: number
  name: string
  alias?: string[]
}

export interface SongAlbum {
  id: number
  name: string
  picUrl: string
  blurPicUrl?: string
}

export interface SongUrl {
  id: number
  url: string
  br: number
  size: number
  md5?: string
}

export interface LyricSyllable {
  text: string
  time: number // seconds — the start time of this character
  duration?: number // seconds — optional precomputed duration
}

export interface LyricLine {
  time: number    // seconds
  text: string
  translation?: string
  syllables?: LyricSyllable[]
}

export interface LyricData {
  sgc: boolean
  sfy: boolean
  qfy: boolean
  lrc: { lyric: string }
  tlyric?: { lyric: string }
  klyric?: { lyric: string }
}

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

export interface Album {
  id: number
  name: string
  picUrl: string
  publishTime: number
  artist?: Artist
  songs?: Song[]
}

export interface MV {
  id: number
  name: string
  picUrl: string
  cover?: string
  imgurl?: string
  artistId?: number
  artistName?: string
  publishTime?: string
  duration?: number
  playCount?: number
  desc?: string
}

export interface User {
  userId: number
  nickname: string
  avatarUrl: string
  signature?: string
  followeds?: number
  follows?: number
  eventCount?: number
  playlistCount?: number
}

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

export interface Comment {
  commentId: number
  user: CommentUser
  content: string
  time: number
  likedCount: number
  liked: boolean
  beReplied?: {
    user: CommentUser
    content: string
  }[]
  replyCount?: number
}

export interface CommentUser {
  userId: number
  nickname: string
  avatarUrl: string
}

export interface CommentResponse {
  hotComments: Comment[]
  comments: Comment[]
  total: number
  hasMore: boolean
}

export interface UserProfile {
  userId: number
  nickname: string
  avatarUrl: string
  backgroundUrl?: string
  signature?: string
  gender?: number
  birthday?: number
  province?: number
  city?: number
  vipType?: number
  level?: number
  createTime?: number
  listenSongs?: number
  playlistCount?: number
  playlistBeSubscribedCount?: number
  followeds?: number
  follows?: number
  eventCount?: number
  mutualFollow?: boolean
}

export interface UserAccount {
  id: number
  userName: string
  type: number
  anonimousUser: boolean
  createTime: number
  token: string
  profile: UserProfile | null
}

export interface LoginQRKey {
  unikey: string
}

export interface LoginQRCreate {
  qrurl: string
  qrimg: string
}

export enum QRStatus {
  EXPIRED = 800,
  WAITING = 801,
  SCANNED = 802,
  CONFIRMED = 803,
}
