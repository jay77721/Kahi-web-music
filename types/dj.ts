/**
 * DJ / Radio types for NetEase Cloud Music API.
 */

export interface DjRadio {
  id: number
  name: string
  desc?: string
  picUrl: string
  subCount: number
  programCount: number
  shareCount: number
  likeCount: number
  score: number
  djId: number
  djName: string
  categoryId?: number
  category?: string
  rcmdtext?: string
}

export interface DjRadioHot extends DjRadio {
  rank?: number
}

export interface DjProgram {
  id: number
  name: string
  coverUrl: string
  dj: {
    userId: number
    nickname: string
    avatarUrl: string
  }
  count: number
  price: number
  fee: number
  duration: number
  createTime: number
  description?: string
  radioId?: number
  serialNum?: number
}

export interface DjProgramToplistItem extends DjProgram {
  rank?: number
  score?: number
}
