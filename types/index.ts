// Domain types — defined in their respective files
export type { Artist, ArtistDetail } from './artist'
export type { Album } from './album'
export type { MV } from './mv'
export type { Comment, CommentUser, CommentResponse } from './comment'
export type { Playlist } from './playlist'
export type { User, UserProfile, UserAccount, LoginQRKey, LoginQRCreate } from './user'
export { QRStatus } from './user'

// Shared types — defined in api.ts
export type {
  Song,
  SongArtist,
  SongAlbum,
  SongUrl,
  LyricLine,
  LyricSyllable,
  LyricData,
  ApiResponse,
  PaginatedParams,
  PaginatedResponse,
  SongDetailResponse,
  LyricDataResponse,
  SimiSongResponse,
  PlaylistDetailResponse,
  PlaylistTrackResponse,
  HotSearchItem,
  HotSearchResponse,
  LoginCellphoneResponse,
  LikelistResponse,
  UserRecordItem,
  UserRecordResponse,
  UserCloudItem,
  UserCloudResponse,
  UserDetailResponse,
  UserPlaylistResponse,
  PersonalFMResponse,
  ArtistDetailResponse,
  ArtistAlbumResponse,
  MVDetailResponse,
  MVDetailInfoResponse,
  SimiMvResponse,
  ToplistResponse,
  TopListResponse,
  SearchResponse,
  LyricSearchSong,
  LyricSearchResponse,
  LyricSearchResult,
  SearchType,
  SearchTypeValue,
  PlayMode,
} from './api'
