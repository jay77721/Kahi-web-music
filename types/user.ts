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
