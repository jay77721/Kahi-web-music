import { describe, expect, test } from 'vitest'
import {
  normalizeAlbumDetail,
  normalizeArtistDetail,
  normalizeDjHotList,
  normalizeDjProgramList,
  normalizeDjProgramToplist,
  normalizeDjRadioList,
  normalizeIdList,
  normalizeLeaderboardDetail,
  normalizeLeaderboardList,
  normalizeLyricData,
  normalizePlaylistDetail,
  normalizePlaylistList,
  normalizeSearchResult,
  normalizeSearchSuggest,
  normalizeSongList,
  normalizeUserProfile,
} from '@/lib/api-adapters'
import type { Song } from '@/types/api'
import type { Album } from '@/types/album'
import type { Artist } from '@/types/artist'
import type { Playlist } from '@/types/playlist'
import type { UserProfile } from '@/types/user'

const song: Song = {
  id: 1,
  name: 'Song A',
  ar: [{ id: 10, name: 'Artist A' }],
  al: { id: 20, name: 'Album A', picUrl: 'album.jpg' },
  publishTime: 0,
  noCopyrightRcmd: null,
  mv: 0,
}

const artist: Artist = {
  id: 10,
  name: 'Artist A',
  picUrl: 'artist.jpg',
  albumSize: 1,
  musicSize: 1,
  mvSize: 0,
}

const album: Album = {
  id: 20,
  name: 'Album A',
  picUrl: 'album.jpg',
  publishTime: 0,
  artist,
}

const profile: UserProfile = {
  userId: 99,
  nickname: 'Listener',
  avatarUrl: 'avatar.jpg',
}

const playlist: Playlist = {
  id: 30,
  name: 'Playlist A',
  coverImgUrl: 'cover.jpg',
  creator: {
    userId: profile.userId,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
  },
  tracks: [song],
  trackCount: 1,
  playCount: 100,
  subscribedCount: 2,
  createTime: 1,
  updateTime: 2,
}

describe('api adapters', () => {
  describe('normalizeSongList()', () => {
    test('accepts a bare array response', () => {
      expect(normalizeSongList([song])).toEqual([song])
    })

    test('accepts { code, data } wrappers', () => {
      expect(normalizeSongList({ code: 200, data: { songs: [song] } })).toEqual([song])
    })

    test('accepts { code, ...payload } responses', () => {
      expect(normalizeSongList({ code: 200, dailySongs: [song] })).toEqual([song])
    })

    test('accepts nested data.data wrappers', () => {
      expect(normalizeSongList({ data: { data: { songs: [song] } } })).toEqual([song])
    })

    test('maps cloud and recent list items to songs', () => {
      expect(normalizeSongList({ list: [{ simpleSong: song }, { data: song }] })).toEqual([
        song,
        song,
      ])
    })

    test('returns an empty list for missing fields', () => {
      expect(normalizeSongList(null)).toEqual([])
      expect(normalizeSongList({ code: 200 })).toEqual([])
    })
  })

  describe('normalizePlaylistDetail()', () => {
    test('returns playlist and tracks from separate endpoint payloads', () => {
      expect(
        normalizePlaylistDetail(
          { code: 200, playlist },
          { code: 200, data: { songs: [song] } }
        )
      ).toEqual({ playlist, tracks: [song] })
    })

    test('falls back to playlist.tracks when track payload is empty', () => {
      expect(normalizePlaylistDetail({ data: { playlist } })).toEqual({
        playlist,
        tracks: [song],
      })
    })
  })

  describe('normalizeAlbumDetail()', () => {
    test('returns album and songs from top-level payload fields', () => {
      expect(normalizeAlbumDetail({ code: 200, album, songs: [song] })).toEqual({
        album,
        songs: [song],
      })
    })

    test('returns null album and empty songs for empty payloads', () => {
      expect(normalizeAlbumDetail(undefined)).toEqual({ album: null, songs: [] })
    })
  })

  describe('normalizeArtistDetail()', () => {
    test('combines detail, songs, albums, description, and similar artists', () => {
      expect(
        normalizeArtistDetail({
          detail: { data: { artist } },
          songs: { songs: [song] },
          albums: { hotAlbums: [album] },
          desc: { briefDesc: 'Short bio' },
          simi: { artists: [artist] },
        })
      ).toEqual({
        artist,
        songs: [song],
        albums: [album],
        desc: 'Short bio',
        simiArtists: [artist],
      })
    })

    test('supports artist detail hotSongs without extra song payload', () => {
      expect(normalizeArtistDetail({ artist, hotSongs: [song] }).songs).toEqual([song])
    })
  })

  describe('normalizeSearchResult()', () => {
    test('flattens nested collection objects', () => {
      expect(
        normalizeSearchResult({
          code: 200,
          result: {
            songs: { songs: [song], songCount: 8 },
            playlists: { playlists: [playlist], playlistCount: 3 },
          },
        })
      ).toMatchObject({
        songs: [song],
        songCount: 8,
        playlists: [playlist],
        playlistCount: 3,
      })
    })

    test('handles nested data.data result wrappers', () => {
      expect(
        normalizeSearchResult({ data: { data: { result: { albums: [album], albumCount: 1 } } } })
      ).toMatchObject({ albums: [album], albumCount: 1 })
    })

    test('returns stable empty arrays and zero counts for missing fields', () => {
      expect(normalizeSearchResult({ code: 200 })).toEqual({
        songs: [],
        playlists: [],
        artists: [],
        albums: [],
        mvs: [],
        songCount: 0,
        playlistCount: 0,
        artistCount: 0,
        albumCount: 0,
        mvCount: 0,
      })
    })
  })

  describe('normalizeSearchSuggest()', () => {
    test('returns a stable empty result when suggestions are missing', () => {
      expect(normalizeSearchSuggest({ code: 200 })).toEqual({
        code: 200,
        result: {
          allMatch: undefined,
          songs: [],
          artists: [],
          albums: [],
          playlists: [],
        },
      })
    })

    test('accepts array-shaped allMatch payloads and suggestion lists', () => {
      expect(
        normalizeSearchSuggest({
          data: {
            result: {
              allMatch: [{ keyword: 'Song A', type: 1 }, { type: 2 }],
              songs: [{ id: song.id, name: song.name }],
              artists: [{ id: artist.id, name: artist.name }],
              albums: [{ id: album.id, name: album.name }],
              playlists: [{ id: playlist.id, name: playlist.name }],
            },
          },
        })
      ).toEqual({
        code: 200,
        result: {
          allMatch: { keyword: 'Song A', type: 1 },
          songs: [{ id: song.id, name: song.name }],
          artists: [{ id: artist.id, name: artist.name }],
          albums: [{ id: album.id, name: album.name }],
          playlists: [{ id: playlist.id, name: playlist.name }],
        },
      })
    })
  })

  describe('normalizeUserProfile()', () => {
    test('extracts profile from a wrapped response', () => {
      expect(normalizeUserProfile({ data: { profile } })).toEqual(profile)
    })

    test('accepts profile-like payloads directly', () => {
      expect(normalizeUserProfile(profile)).toEqual(profile)
    })

    test('returns null when profile fields are absent', () => {
      expect(normalizeUserProfile({ code: 200 })).toBeNull()
    })
  })

  describe('small adapter helpers used by pages', () => {
    test('normalizes playlist arrays and id arrays', () => {
      expect(normalizePlaylistList({ playlist: [playlist] })).toEqual([playlist])
      expect(normalizeIdList({ data: { ids: ['1', 2, 'bad'] } })).toEqual([1, 2])
    })

    test('normalizes lyric data from direct and wrapped responses', () => {
      const lyric = { lrc: { lyric: '[00:00]Line' }, sgc: false, sfy: false, qfy: false }
      expect(normalizeLyricData(lyric)).toEqual(lyric)
      expect(normalizeLyricData({ data: lyric })).toEqual(lyric)
    })

    test('normalizes leaderboard list and detail payloads', () => {
      expect(normalizeLeaderboardList({ list: [{ id: 1, name: 'Chart', coverImgUrl: 'x' }] })).toEqual([
        { id: 1, name: 'Chart', coverImgUrl: 'x' },
      ])
      expect(normalizeLeaderboardDetail({ playlist })).toEqual({
        name: playlist.name,
        coverImgUrl: playlist.coverImgUrl,
        tracks: [song],
      })
    })

    test('normalizes radio and program payload variants', () => {
      const radio = {
        id: 44,
        name: 'Late Show',
        picUrl: 'radio.jpg',
        subCount: 12,
        programCount: 3,
        shareCount: 0,
        likeCount: 0,
        score: 88,
        djId: 9,
        djName: 'Host',
      }
      const program = {
        id: 88,
        name: 'Episode 1',
        coverUrl: 'program.jpg',
        dj: { userId: 9, nickname: 'Host', avatarUrl: 'avatar.jpg' },
        count: 10,
        price: 0,
        fee: 0,
        duration: 60,
        createTime: 1000,
      }

      expect(normalizeDjRadioList({ djRadios: [radio] })).toEqual([radio])
      expect(normalizeDjHotList({ data: [radio] })[0]).toMatchObject({ id: radio.id, rank: 1 })
      expect(normalizeDjProgramList({ programs: [program] })).toEqual([program])
      expect(normalizeDjProgramToplist({ toplist: [program] })).toEqual([program])
    })
  })
})
