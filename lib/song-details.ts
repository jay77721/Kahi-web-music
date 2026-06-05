import { ncmApi } from '@/lib/api'
import { normalizeSongList } from '@/lib/api-adapters'
import type { Song } from '@/types/api'

const DEFAULT_DETAIL_BATCH_SIZE = 100

function chunkIds(ids: readonly number[], batchSize: number): number[][] {
  const chunks: number[][] = []
  for (let start = 0; start < ids.length; start += batchSize) {
    chunks.push(ids.slice(start, start + batchSize))
  }
  return chunks
}

export async function fetchSongDetailsByIds(
  ids: readonly number[],
  batchSize = DEFAULT_DETAIL_BATCH_SIZE
): Promise<Song[]> {
  if (ids.length === 0) return []

  const uniqueIds = Array.from(new Set(ids))
  const batches = chunkIds(uniqueIds, batchSize)
  const responses = await Promise.all(
    batches.map((batch) => ncmApi.songDetail(batch.join(',')))
  )

  const songsById = new Map<number, Song>()
  for (const response of responses) {
    for (const song of normalizeSongList(response)) {
      songsById.set(song.id, song)
    }
  }

  return uniqueIds
    .map((id) => songsById.get(id))
    .filter((song): song is Song => Boolean(song))
}
