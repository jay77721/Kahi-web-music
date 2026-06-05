import type { ApiResponse, SearchResponse, LyricSearchResponse } from '@/types/api'
import { readField } from '@/lib/api-shape'

const BASE_URL = '/api'

/**
 * Defensive unwrap for endpoints whose response shape can vary:
 *  - Pattern A: `{ code, data: T }` — already unwrapped by `request()`
 *  - Pattern B: `{ code, ...T }` — `request()` returns the whole object
 *  - Pattern C: nested `data.data.X` — `request()` returns the inner `data`
 *  - Pattern D: bare arrays (e.g. `/song/url`) — `request()` returns as-is
 *
 * This helper lets a caller pull a specific field (`songs`, `playlist`, etc.)
 * no matter which pattern the endpoint happens to follow.
 */
export function unwrapField<T = unknown>(raw: unknown, field: string): T | undefined {
  return readField<T>(raw, field, { includeNull: true })
}

class NcmApiClient {
  private cache = new Map<string, { data: unknown; expiry: number }>()
  private pendingRequests = new Map<string, Promise<unknown>>()
  private cacheTTL = 5 * 60 * 1000
  private readonly MAX_CACHE_SIZE = 200
  private readonly MAX_RETRIES = 2
  private readonly RETRY_DELAY_MS = 500

  private getCacheKey(endpoint: string, params: Record<string, unknown>, typeTag?: string): string {
    // `typeTag` disambiguates cache entries that share an endpoint + params
    // tuple but are consumed as different generic types `T`. TypeScript
    // erases generics at runtime, so callers must opt in by passing a
    // string tag (e.g. `'UserDetail'`) when calling `request<T>` directly.
    return typeTag
      ? `${typeTag}::${endpoint}:${JSON.stringify(params)}`
      : `${endpoint}:${JSON.stringify(params)}`
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  private setCache(key: string, data: unknown): void {
    this.evictExpiredEntries()
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }
    this.cache.set(key, { data, expiry: Date.now() + this.cacheTTL })
  }

  private evictExpiredEntries(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }

  private buildUrl(endpoint: string, params: Record<string, unknown>): string {
    const url = new URL(`${BASE_URL}${endpoint}`, window.location.origin)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
    return url.toString()
  }

  async request<T>(endpoint: string, params: Record<string, unknown> = {}, skipCache = false, typeTag?: string): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params, typeTag)

    if (!skipCache) {
      const cached = this.getFromCache<T>(cacheKey)
      if (cached) return cached
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<T>
    }

    const promise = this.executeRequestWithRetry<T>(endpoint, params)
    this.pendingRequests.set(cacheKey, promise)

    try {
      const result = await promise
      this.setCache(cacheKey, result)
      return result
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  private async executeRequestWithRetry<T>(
    endpoint: string,
    params: Record<string, unknown>,
    attempt = 1
  ): Promise<T> {
    try {
      return await this.executeRequest<T>(endpoint, params)
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1)
        await this.sleep(delay)
        return this.executeRequestWithRetry<T>(endpoint, params, attempt + 1)
      }
      throw error
    }
  }

  private async executeRequest<T>(endpoint: string, params: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.buildUrl(endpoint, params), {
      credentials: 'include',
    })

    return this.parseResponse<T>(response)
  }

  async requestPost<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    return this.parseResponse<T>(response)
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    const json: ApiResponse<T> = await response.json()

    if (json.code !== 200) {
      throw new Error(json.message || json.msg || `API returned code ${json.code}`)
    }

    // Pattern A: wrapped in data
    // Pattern B: direct response (NO data wrapper)
    // Pattern C: mixed nesting (data.data.xxx)
    // Pattern D: special cases (songs, playlist, hotComments, profile, account)
    if (json.data !== undefined) {
      return json.data as T
    }

    // For Pattern B and D - return the whole response
    return json as unknown as T
  }

  /**
   * Same as request() but with more lenient error handling for endpoints
   * with non-standard response patterns (e.g. QR login polling).
   *
   * Important: unlike `request()`, this method does NOT read from or write
   * to the response cache. It only deduplicates concurrent in-flight
   * requests via `pendingRequests`. Use this for endpoints whose results
   * must always be fresh, whose response shape is non-standard, or whose
   * code path must not be affected by cached entries.
   */
  async requestFlexible<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params)

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<T>
    }

    const promise = this.executeRequestFlexible<T>(endpoint, params)
    this.pendingRequests.set(cacheKey, promise)

    try {
      return await promise
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  private async executeRequestFlexible<T>(
    endpoint: string,
    params: Record<string, unknown>,
    attempt = 1
  ): Promise<T> {
    try {
      const response = await fetch(this.buildUrl(endpoint, params), {
        credentials: 'include',
      })

      if (!response.ok) {
        return { code: response.status } as unknown as T
      }

      const json: ApiResponse<T> = await response.json()
      return ('data' in json ? json.data : json) as T
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1)
        await this.sleep(delay)
        return this.executeRequestFlexible<T>(endpoint, params, attempt + 1)
      }
      throw error
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Banner
  banner = async <T = unknown>(type?: number): Promise<T[]> => {
    const raw = await this.request('/banner', type !== undefined ? { type } : {})
    return unwrapField<T[]>(raw, 'banners') ?? []
  }

  // Personalized
  personalized = (limit = 12) => this.request('/personalized', { limit })
  personalizedNewSong = async <T = unknown>(limit = 12): Promise<T[]> => {
    const raw = await this.request('/personalized/newsong', { limit })
    return unwrapField<T[]>(raw, 'result') ?? []
  }
  personalizedMv = () => this.request('/personalized/mv')

  // Song
  songUrl = (id: number | string, br = 320000) => this.request('/song/url', { id, br })
  songDetail = (ids: number | string) => this.request('/song/detail', { ids })
  songLyric = (id: number | string) => this.request('/lyric', { id })
  songCheck = (id: number | string) => this.request('/check/music', { id })
  songDownloadUrl = (id: number | string, br = 320000) =>
    this.request('/song/download/url', { id, br })
  songComment = (id: number | string, limit = 20, offset = 0) =>
    this.request('/comment/music', { id, limit, offset })
  scrobble = (id: number | string, sourceid: number | string) =>
    this.requestPost('/scrobble', { id, sourceid })

  // Search
  search = (keywords: string, type = 1, limit = 30, offset = 0) =>
    this.request<SearchResponse>('/search', { keywords, type, limit, offset })
  searchMultimatch = (keywords: string) =>
    this.request('/search/multimatch', { keywords })
  searchMatch = (keywords: string) =>
    this.request('/search/match', { keywords })
  searchHot = () => this.request('/search/hot')
  searchSuggest = (keywords: string) => this.request('/search/suggest', { keywords })
  searchDefault = () => this.request('/search/default')
  cloudsearch = (keywords: string, type?: number, limit?: number) =>
    this.request('/cloudsearch', { keywords, type, limit })
  searchComplex = (keywords: string) =>
    this.request('/search/complex', { keywords })
  searchLyric = (keywords: string, limit = 30) =>
    this.request<LyricSearchResponse>('/cloudsearch', { keywords, type: 1006, limit })

  // Playlist
  playlistDetail = (id: number | string) => this.request('/playlist/detail', { id })
  playlistDetailDynamic = (playlistId: number | string) =>
    this.request('/playlist/detail/dynamic', { id: playlistId })
  playlistTrackAll = (id: number | string, limit = 50, offset = 0) =>
    this.request('/playlist/track/all', { id, limit, offset })
  playlistTrackAdd = (id: number | string, songIds: (number | string)[]) =>
    this.requestPost('/playlist/track/add', { id, op: 0, tracks: songIds.join(',') })
  playlistTrackDelete = (id: number | string, songIds: (number | string)[]) =>
    this.requestPost('/playlist/track/delete', { id, tracks: songIds.join(',') })
  playlistOrderUpdate = (ids: (number | string)[]) =>
    this.requestPost('/playlist/order/update', { ids: ids.join(',') })
  playlistCoverUpdate = (id: number | string, url: string) =>
    this.requestPost('/playlist/cover/update', { id, url })
  playlistCreate = (name: string, privacy = 0) =>
    this.requestPost('/playlist/create', { name, privacy })
  playlistUpdate = (id: number | string, name?: string, desc?: string) =>
    this.requestPost('/playlist/update', { id, name, desc })
  playlistDelete = (id: number | string) =>
    this.requestPost('/playlist/delete', { id })
  playlistSubscribe = (id: number | string, t: 1 | 2) =>
    this.requestPost('/playlist/subscribe', { id, t })
  playlistSubscribers = (playlistId: number | string, limit = 50, offset = 0) =>
    this.request('/playlist/subscribers', { id: playlistId, limit, offset })
  playlistCatlist = (returnHotTags = true) =>
    this.request('/playlist/catalog/playlist', { returnHotTags })
  topPlaylist = (cat = '全部', limit = 50, offset = 0) =>
    this.request('/top/playlist', { cat, limit, offset })

  // Artist
  artistDetail = (id: number | string) => this.request('/artist/detail', { id })
  artistSongs = (id: number | string, limit = 50, offset = 0) =>
    this.request('/artist/songs', { id, limit, offset })
  artistAlbum = (id: number | string, limit = 12, offset = 0) =>
    this.request('/artist/album', { id, limit, offset })
  artistMv = (id: number | string, limit = 12, offset = 0) =>
    this.request('/artist/mv', { id, limit, offset })
  artistDesc = (id: number | string) => this.request('/artist/desc', { id })
  artistSub = (id: number | string, t: 1 | 2) =>
    this.requestPost('/artist/sub', { id, t })
  simiArtist = (id: number | string) => this.request('/simi/artist', { id })
  topArtists = async <T = unknown>(limit = 50, offset = 0): Promise<T[]> => {
    const raw = await this.request('/top/artists', { limit, offset })
    return unwrapField<T[]>(raw, 'artists') ?? []
  }

  // Album
  album = (id: number | string) => this.request('/album', { id })
  albumNew = (limit = 12, area = 'ALL') => this.request('/album/new', { limit, area })
  albumSub = (id: number | string, t: 1 | 2) =>
    this.requestPost('/album/sub', { id, t })
  albumDetailDynamic = (id: number | string) =>
    this.request('/album/detail/dynamic', { id })
  topAlbum = (limit = 12, area = 'ALL', offset = 0) =>
    this.request('/top/album', { limit, area, offset })

  // MV
  mvUrl = (id: number | string) => this.request('/mv/url', { id })
  mvDetail = (mvid: number | string) => this.request('/mv/detail', { mvid })
  mvDetailInfo = (mvid: number | string) => this.request('/mv/detail/info', { mvid })
  mvAll = (limit = 20, offset = 0, area = '全部', type = '全部', order = '最热') =>
    this.request('/mv/all', { limit, offset, area, type, order })
  simiMv = (mvid: number | string) => this.request('/simi/mv', { mvid })

  // Video
  videoUrl = (id: number | string) => this.request('/video/url', { id })
  videoDetail = (vid: number | string) => this.request('/video/detail', { vid })
  videoTimeline = () => this.request('/video/timeline')
  videoGroupList = () => this.request('/video/group/list')
  videoLike = (vid: string, t: number) => this.requestPost('/video/like', { vid, t })

  // Comment
  commentMusic = (id: number | string, limit = 20, offset = 0) =>
    this.request('/comment/music', { id, limit, offset })
  commentPlaylist = (id: number | string, limit = 20, offset = 0) =>
    this.request('/comment/playlist', { id, limit, offset })
  commentAlbum = (id: number | string, limit = 20, offset = 0) =>
    this.request('/comment/album', { id, limit, offset })
  commentMv = (id: number | string, limit = 20, offset = 0) =>
    this.request('/comment/mv', { id, limit, offset })
  commentHot = (id: number | string, type = 0, limit = 20, offset = 0) =>
    this.request('/comment/hot', { id, type, limit, offset })
  commentLike = (id: number | string, cid: number | string, t = 1) =>
    this.requestPost('/comment/like', { id, cid, t })
  commentNew = (id: number | string, type = 0, limit = 20, offset = 0, before?: number) =>
    this.request('/comment/new', { id, type, limit, offset, before })
  commentEvent = (id: number | string) =>
    this.request('/comment/event', { id })
  commentDj = (id: number | string, limit = 20, offset = 0) =>
    this.request('/comment/dj', { id, limit, offset })
  commentVideo = (id: number | string, limit = 20, offset = 0) =>
    this.request('/comment/video', { id, limit, offset })
  commentReply = (parentCommentId: number, content: string, type: number, bizId: number) =>
    this.requestPost('/comment', { parentCommentId, content, type, id: bizId })
  commentFloor = (commentId: number, type: number, bizId: number) =>
    this.request('/comment/floor', { commentId, type, id: bizId })

  // Top Lists
  toplist = async <T = unknown>(): Promise<T[]> => {
    const raw = await this.request('/toplist')
    return unwrapField<T[]>(raw, 'list') ?? []
  }
  topList = (id: number | string) => this.request('/top/list', { id })
  toplistDetail = () => this.request('/toplist/detail')

  // DJ / Radio
  djradio = (limit = 30, offset = 0) => this.request('/dj/hot', { limit, offset })
  djprogram = (rid: number, limit = 10) => this.request('/dj/program', { rid, limit })
  djprogramToplist = (limit = 20, offset = 0) =>
    this.request('/dj/program/toplist', { limit, offset })
  djhot = (limit = 12) => this.request('/dj/hot', { limit })

  // Cloud Disk
  cloudAdd = (songId: number) => this.requestPost('/user/cloud/add', { songId })
  cloudDel = (id: number) => this.requestPost('/user/cloud/del', { id })

  // User
  userAccount = () => this.request('/user/account')
  userDetail = (uid: number | string) => this.request('/user/detail', { uid })
  userPlaylist = (uid: number | string, limit = 50, offset = 0) =>
    this.request('/user/playlist', { uid, limit, offset })
  userRecord = (uid: number | string, type = 0) => this.request('/user/record', { uid, type })
  userFollow = (id: number | string, t = 1) =>
    this.requestPost('/user/follow', { id, t })
  userUpdate = (uid: number | string, options?: {
    nickname?: string
    signature?: string
    gender?: number
    birthday?: number
    province?: number
    city?: number
  }) => this.requestPost('/user/update', { uid, ...options })
  userEvent = (uid: number | string, limit = 30, lasttime?: number) =>
    this.request('/user/event', { uid, limit, lasttime })
  userFollows = (uid: number | string) =>
    this.request('/user/follows', { uid })
  userFolloweds = (uid: number | string) =>
    this.request('/user/followeds', { uid })
  userLevel = () => this.request('/user/level')
  userVipInfo = () => this.request('/user/vip/info')
  userSocialStatus = () => this.request('/user/social/status')
  likelist = (uid: number | string) => this.request('/likelist', { uid })
  like = (id: number | string, like = true) => this.requestPost('/like', { id, like })
  songLikeCheck = (ids: (number | string)[]) =>
    this.request('/song/like/check', { ids: ids.join(',') })
  userCloud = (limit = 100, offset = 0) =>
    this.request<unknown>('/user/cloud', { limit, offset })
  simiUser = (uid: number | string) => this.request('/simi/user', { uid })
  userPlaylistOrder = (uid: number | string, limit = 50, offset = 0) =>
    this.request('/user/playlist/order', { uid, limit, offset })
  userAccountStatus = () => this.request('/user/account/status')

  // Login
  loginCellphone = (phone: string, captcha: string) =>
    this.requestPost('/login/cellphone', { phone, captcha })
  captchaSent = (phone: string) => this.requestPost('/captcha/sent', { phone })
  loginQrKey = () => this.request('/login/qr/key')
  loginQrCreate = (key: string, qrimg = true) =>
    this.request('/login/qr/create', { key, qrimg })
  loginQrCheck = (key: string) => this.request('/login/qr/check', { key })
  loginStatus = () => this.request('/login/status', {}, true)
  loginRefresh = () => this.requestPost('/login/refresh')
  logout = () => this.requestPost('/logout')

  // Daily / Recommend
  recommendSongs = () => this.request('/recommend/songs')
  dailySignin = () => this.requestPost('/daily_signin')

  // Personal FM
  personalFm = () => this.request('/personal_fm')
  personalFmMode = (mode?: number) => this.request('/personal_fm/mode', { mode })
  fmTrash = (id: number | string) => this.requestPost('/fm/trash', { id })

  // Similar
  simiSong = (id: number | string) => this.request('/simi/song', { id })
  simiPlaylist = (id: number | string) => this.request('/simi/playlist', { id })

  // Homepage / Dashboard
  homepageBlockPage = (loadType?: string) => this.request('/homepage/block/page', { loadType })
  homepageDragonBall = () => this.request('/homepage/dragon/ball')
  recommendResource = async <T = unknown>(type?: string): Promise<T[]> => {
    const raw = await this.request('/recommend/resource', { type })
    return unwrapField<T[]>(raw, 'recommend') ?? []
  }
  recommendMv = () => this.request('/personalized/mv')

  // Subscription
  albumSublist = (limit = 50, offset = 0) => this.request('/album/sublist', { limit, offset })
  artistSublist = (limit = 50, offset = 0) => this.request('/artist/sublist', { limit, offset })

  // Recent records
  recordRecentSong = (limit = 50) => this.request('/record/recent/song', { limit })
  recordRecentAlbum = (limit = 50) => this.request('/record/recent/album', { limit })
  recordRecentPlaylist = (limit = 50) => this.request('/record/recent/playlist', { limit })

  // Other
  checkMusic = (id: number | string) => this.request('/check/music', { id })
  videoCategoryList = () => this.request('/video/category/list')
  mvFirst = (area?: string, type?: number, limit?: number, offset?: number) =>
    this.request('/mv/first', { area, type, limit, offset })

  // Clear cache
  clearCache(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }
}

export const ncmApi = new NcmApiClient()
export default ncmApi
