// Re-export from the canonical source in ./api to avoid duplicate type
// definitions. The Song-related types (Song, SongArtist, SongAlbum, SongUrl,
// LyricLine, LyricData) live in types/api.ts and are re-exported from here
// so existing imports of `@/types/song` continue to work as a single source
// of truth.
export type {
  Song,
  SongArtist,
  SongAlbum,
  SongUrl,
  LyricLine,
  LyricData,
} from './api'
