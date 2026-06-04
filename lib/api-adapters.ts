import type {
  LoginCellphoneResponse,
  LyricDataResponse,
  MVDetailInfoResponse,
  SearchResponse,
  Song,
} from '@/types/api'
import type { Album } from '@/types/album'
import type { Artist, ArtistDetail } from '@/types/artist'
import type { CommentResponse } from '@/types/comment'
import type { DjProgramToplistItem, DjRadio, DjRadioHot } from '@/types/dj'
import type { MV } from '@/types/mv'
import type { Playlist } from '@/types/playlist'
import type { SearchSuggestResponse } from '@/types/search'
import type { LoginQRCreate, LoginQRKey, UserProfile } from '@/types/user'

type UnknownRecord = Record<string, unknown>

export type NormalizedSearchResult = SearchResponse['result']

export type NormalizedAlbum = Album & {
  size?: number
  company?: string
  description?: string
}

export interface NormalizedPlaylistDetail {
  playlist: Playlist | null
  tracks: Song[]
}

export interface NormalizedAlbumDetail {
  album: NormalizedAlbum | null
  songs: Song[]
}

export interface NormalizedArtistDetail {
  artist: Artist | null
  songs: Song[]
  albums: Album[]
  desc: string
  simiArtists: Artist[]
}

export interface NormalizedLeaderboardItem {
  id: number
  name: string
  coverImgUrl: string
}

export interface NormalizedLeaderboardDetail {
  name: string
  coverImgUrl: string
  tracks: Song[]
}

export interface NormalizedMvDetail {
  url: string | null
  mv: MV | null
  info: MVDetailInfoResponse | null
  simiMvs: MV[]
}

export interface NormalizedDiscoverItem {
  id: number
  name: string
  picUrl?: string
  coverImgUrl?: string
  playCount?: number
}

export interface NormalizedHomepageBlock {
  blockCode?: string
  showType?: string
  creatives?: unknown[]
  [key: string]: unknown
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function candidateLayers(raw: unknown): unknown[] {
  const layers: unknown[] = []
  let current = raw

  for (let depth = 0; depth < 5; depth += 1) {
    layers.push(current)

    if (!isRecord(current) || current.data === undefined || current.data === null) {
      break
    }

    current = current.data
  }

  return layers
}

function readField<T = unknown>(raw: unknown, field: string): T | undefined {
  for (const layer of candidateLayers(raw)) {
    if (!isRecord(layer)) continue
    const value = layer[field]
    if (value !== undefined && value !== null) return value as T
  }
  return undefined
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function looksLikeUserProfile(value: unknown): value is UserProfile {
  return isRecord(value) && typeof value.userId === 'number' && typeof value.nickname === 'string'
}

function looksLikePlaylist(value: unknown): value is Playlist {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.coverImgUrl === 'string'
  )
}

function looksLikeLyricData(value: unknown): value is LyricDataResponse {
  return (
    isRecord(value) &&
    isRecord(value.lrc) &&
    typeof value.lrc.lyric === 'string'
  )
}

function looksLikeMv(value: unknown): value is MV {
  return isRecord(value) && typeof value.id === 'number' && typeof value.name === 'string'
}

function unwrapSingleRecord(raw: unknown): UnknownRecord | null {
  for (const layer of candidateLayers(raw)) {
    if (isRecord(layer)) return layer
  }
  return null
}

function normalizeMappedSongs(items: unknown[]): Song[] {
  return items
    .map((item) => {
      if (!isRecord(item)) return item
      return item.simpleSong ?? item.data ?? item.song ?? item
    })
    .filter((item): item is Song => isRecord(item) && typeof item.id === 'number')
}

export function normalizeSongList(raw: unknown): Song[] {
  if (Array.isArray(raw)) return normalizeMappedSongs(raw)

  const direct =
    readField<unknown>(raw, 'songs') ??
    readField<unknown>(raw, 'hotSongs') ??
    readField<unknown>(raw, 'dailySongs') ??
    readField<unknown>(raw, 'recommend') ??
    readField<unknown>(raw, 'data')

  const directSongs = asArray<unknown>(direct)
  if (directSongs.length > 0) return normalizeMappedSongs(directSongs)

  const listSongs = asArray<unknown>(readField<unknown>(raw, 'list'))
  if (listSongs.length > 0) return normalizeMappedSongs(listSongs)

  return []
}

export function normalizeIdList(raw: unknown): number[] {
  return asArray<unknown>(readField<unknown>(raw, 'ids'))
    .map((id) => (typeof id === 'string' ? Number(id) : id))
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
}

export function normalizePlaylistList(raw: unknown): Playlist[] {
  if (Array.isArray(raw)) return raw as Playlist[]

  return asArray<Playlist>(
    readField<unknown>(raw, 'playlist') ??
    readField<unknown>(raw, 'playlists') ??
    readField<unknown>(raw, 'list')
  )
}

export function normalizePlaylistDetail(
  detailRaw: unknown,
  tracksRaw?: unknown
): NormalizedPlaylistDetail {
  const playlist =
    readField<Playlist>(detailRaw, 'playlist') ??
    (looksLikePlaylist(detailRaw) ? detailRaw : null)

  const tracksFromRequest = tracksRaw === undefined ? [] : normalizeSongList(tracksRaw)
  const tracks = tracksFromRequest.length > 0 ? tracksFromRequest : playlist?.tracks ?? []

  return {
    playlist,
    tracks,
  }
}

export function normalizeAlbumDetail(raw: unknown): NormalizedAlbumDetail {
  const album = readField<NormalizedAlbum>(raw, 'album') ?? null
  const songs = normalizeSongList(raw)

  return {
    album,
    songs,
  }
}

export function normalizeArtistDetail(raw: unknown): NormalizedArtistDetail {
  const composite = unwrapSingleRecord(raw)
  const detailSource = composite?.detail ?? raw
  const songsSource = composite?.songs ?? detailSource
  const albumsSource = composite?.albums ?? raw
  const descSource = composite?.desc ?? raw
  const simiSource = composite?.simi ?? raw

  const detail =
    readField<ArtistDetail>(detailSource, 'artist') !== undefined
      ? (unwrapSingleRecord(detailSource) as ArtistDetail | null)
      : readField<ArtistDetail>(detailSource, 'data') ?? null

  const artist = detail?.artist ?? readField<Artist>(detailSource, 'artist') ?? null
  const songs = normalizeSongList(songsSource)
  const albums = asArray<Album>(
    readField<unknown>(albumsSource, 'hotAlbums') ??
    readField<unknown>(albumsSource, 'albums')
  )
  const desc =
    asString(readField<unknown>(descSource, 'briefDesc')) ||
    asString(readField<unknown>(descSource, 'desc'))
  const simiArtists = asArray<Artist>(
    readField<unknown>(simiSource, 'artists') ??
    readField<unknown>(simiSource, 'simiArtists')
  )

  return {
    artist,
    songs,
    albums,
    desc,
    simiArtists,
  }
}

function normalizeSearchCollection<T>(
  result: UnknownRecord,
  collectionKey: string,
  countKey: string
): { items: T[]; count: number } {
  const nested = result[collectionKey]
  const items = asArray<T>(
    Array.isArray(nested)
      ? nested
      : isRecord(nested)
        ? nested[collectionKey]
        : result[collectionKey]
  )

  const nestedCount = isRecord(nested) ? nested[countKey] : undefined
  return {
    items,
    count: asNumber(result[countKey], asNumber(nestedCount, items.length)),
  }
}

export function normalizeSearchResult(raw: unknown): NormalizedSearchResult {
  const result = readField<UnknownRecord>(raw, 'result') ?? unwrapSingleRecord(raw) ?? {}

  const songs = normalizeSearchCollection<Song>(result, 'songs', 'songCount')
  const playlists = normalizeSearchCollection<Playlist>(result, 'playlists', 'playlistCount')
  const artists = normalizeSearchCollection<Artist>(result, 'artists', 'artistCount')
  const albums = normalizeSearchCollection<Album>(result, 'albums', 'albumCount')
  const mvs = normalizeSearchCollection<MV>(result, 'mvs', 'mvCount')

  return {
    songs: songs.items,
    playlists: playlists.items,
    artists: artists.items,
    albums: albums.items,
    mvs: mvs.items,
    songCount: songs.count,
    playlistCount: playlists.count,
    artistCount: artists.count,
    albumCount: albums.count,
    mvCount: mvs.count,
  }
}

export function normalizeUserProfile(raw: unknown): UserProfile | null {
  const profile = readField<unknown>(raw, 'profile')
  if (looksLikeUserProfile(profile)) return profile

  for (const layer of candidateLayers(raw)) {
    if (looksLikeUserProfile(layer)) return layer
  }

  return null
}

export function normalizeLyricData(raw: unknown): LyricDataResponse | null {
  for (const layer of candidateLayers(raw)) {
    if (looksLikeLyricData(layer)) {
      return layer
    }
  }

  return readField<LyricDataResponse>(raw, 'data') ?? null
}

export function normalizeLeaderboardList(raw: unknown): NormalizedLeaderboardItem[] {
  if (Array.isArray(raw)) return raw as NormalizedLeaderboardItem[]

  return asArray<NormalizedLeaderboardItem>(readField<unknown>(raw, 'list'))
}

export function normalizeLeaderboardDetail(raw: unknown): NormalizedLeaderboardDetail | null {
  const { playlist } = normalizePlaylistDetail(raw)
  if (!playlist) return null

  return {
    name: playlist.name,
    coverImgUrl: playlist.coverImgUrl,
    tracks: playlist.tracks ?? [],
  }
}


export function normalizeMvUrl(raw: unknown): string | null {
  const direct = readField<string>(raw, 'url')
  if (direct) return direct

  const urls = asArray<UnknownRecord>(readField<unknown>(raw, 'urls'))
  const firstUrl = urls.find((item) => typeof item.url === 'string')?.url
  return typeof firstUrl === 'string' ? firstUrl : null
}

export function normalizeMvDetail(raw: unknown): MV | null {
  const mv = readField<MV>(raw, 'mv')
  if (looksLikeMv(mv)) return mv

  for (const layer of candidateLayers(raw)) {
    if (looksLikeMv(layer)) return layer
  }

  return null
}

export function normalizeMvInfo(raw: unknown): MVDetailInfoResponse | null {
  const info = unwrapSingleRecord(raw)
  if (!info) return null

  return {
    likedCount: asNumber(info.likedCount),
    shareCount: asNumber(info.shareCount),
    commentCount: asNumber(info.commentCount),
    code: asNumber(info.code, 200),
  }
}

export function normalizeMvList(raw: unknown): MV[] {
  if (Array.isArray(raw)) return raw.filter(looksLikeMv)

  return asArray<unknown>(
    readField<unknown>(raw, 'mvs') ??
    readField<unknown>(raw, 'data') ??
    readField<unknown>(raw, 'result')
  ).filter(looksLikeMv)
}

export function normalizeMvBundle(
  urlRaw: unknown,
  detailRaw: unknown,
  infoRaw: unknown,
  simiRaw: unknown
): NormalizedMvDetail {
  return {
    url: normalizeMvUrl(urlRaw),
    mv: normalizeMvDetail(detailRaw),
    info: normalizeMvInfo(infoRaw),
    simiMvs: normalizeMvList(simiRaw),
  }
}

export function normalizeLoginQrKey(raw: unknown): LoginQRKey | null {
  const unikey = readField<string>(raw, 'unikey')
  return unikey ? { unikey } : null
}

export function normalizeLoginQrCreate(raw: unknown): LoginQRCreate | null {
  const qrurl = readField<string>(raw, 'qrurl') ?? ''
  const qrimg = readField<string>(raw, 'qrimg')
  return qrimg ? { qrurl, qrimg } : null
}

export function normalizeQrCheck(raw: unknown): { code: number; message?: string } | null {
  const record = unwrapSingleRecord(raw)
  if (!record) return null

  return {
    code: asNumber(record.code),
    message: typeof record.message === 'string' ? record.message : undefined,
  }
}

export function normalizeLoginCellphone(raw: unknown): LoginCellphoneResponse {
  const record = unwrapSingleRecord(raw) ?? {}
  const profile = normalizeUserProfile(raw) ?? undefined
  return {
    code: asNumber(record.code, 200),
    profile,
    cookie: typeof record.cookie === 'string' ? record.cookie : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
  }
}

export function normalizeSearchSuggest(raw: unknown): SearchSuggestResponse {
  const result = readField<UnknownRecord>(raw, 'result') ?? unwrapSingleRecord(raw) ?? {}

  return {
    code: asNumber(readField<unknown>(raw, 'code'), 200),
    result: {
      allMatch: isRecord(result.allMatch) ? result.allMatch as SearchSuggestResponse['result']['allMatch'] : undefined,
      songs: asArray<NonNullable<SearchSuggestResponse['result']['songs']>[number]>(result.songs),
      artists: asArray<NonNullable<SearchSuggestResponse['result']['artists']>[number]>(result.artists),
      albums: asArray<NonNullable<SearchSuggestResponse['result']['albums']>[number]>(result.albums),
      playlists: asArray<NonNullable<SearchSuggestResponse['result']['playlists']>[number]>(result.playlists),
    },
  }
}

export function normalizeCommentResponse(raw: unknown): CommentResponse {
  return {
    hotComments: asArray(readField<unknown>(raw, 'hotComments')),
    comments: asArray(readField<unknown>(raw, 'comments')),
    total: asNumber(readField<unknown>(raw, 'total')),
    hasMore: Boolean(readField<unknown>(raw, 'hasMore')),
  }
}

export function normalizeDiscoverItems(raw: unknown): NormalizedDiscoverItem[] {
  if (Array.isArray(raw)) return raw as NormalizedDiscoverItem[]

  return asArray<NormalizedDiscoverItem>(
    readField<unknown>(raw, 'result') ??
    readField<unknown>(raw, 'recommend') ??
    readField<unknown>(raw, 'resources') ??
    readField<unknown>(raw, 'data')
  )
}

export function normalizeHomepageBlocks(raw: unknown): NormalizedHomepageBlock[] {
  return asArray<NormalizedHomepageBlock>(
    readField<unknown>(raw, 'blocks') ??
    readField<unknown>(raw, 'block')
  )
}

export function normalizeDjRadioList(raw: unknown): DjRadio[] {
  if (Array.isArray(raw)) return raw as DjRadio[]

  return asArray<DjRadio>(
    readField<unknown>(raw, 'djRadios') ??
    readField<unknown>(raw, 'radios') ??
    readField<unknown>(raw, 'data')
  )
}

export function normalizeDjHotList(raw: unknown): DjRadioHot[] {
  return normalizeDjRadioList(raw).map((radio, index) => ({
    ...radio,
    rank: typeof (radio as DjRadioHot).rank === 'number' ? (radio as DjRadioHot).rank : index + 1,
  }))
}

export function normalizeDjProgramToplist(raw: unknown): DjProgramToplistItem[] {
  if (Array.isArray(raw)) return raw as DjProgramToplistItem[]

  return asArray<DjProgramToplistItem>(
    readField<unknown>(raw, 'toplist') ??
    readField<unknown>(raw, 'programs') ??
    readField<unknown>(raw, 'data')
  )
}
