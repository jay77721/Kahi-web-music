'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { CommentList } from '@/components/comment/CommentList'
import { Skeleton } from '@/components/ui/skeleton'
import { MVPlayer } from '@/components/mv/MVPlayer'
import { MVInfo } from '@/components/mv/MVInfo'
import { ncmApi } from '@/lib/api'
import { normalizeMvBundle, type NormalizedMvDetail } from '@/lib/api-adapters'
import { imageUrl } from '@/lib/format'
import { PlayerBar } from '@/components/player/PlayerBar'
import { PlayerOverlays } from '@/components/player/PlayerOverlays'
import type { SimiMvResponse, MVDetailResponse } from '@/types/api'

export default function MVPage() {
  const params = useParams()
  const id = (params?.id as string | undefined) ?? ''

  const { data, isLoading, error } = useSWR(id ? `mv-${id}` : null, async (): Promise<NormalizedMvDetail> => {
    const [urlRes, detailRes, infoRes, simiRes] = await Promise.all([
      ncmApi.mvUrl(id).catch(() => null),
      ncmApi.mvDetail(id).catch(() => null) as Promise<MVDetailResponse | null | undefined>,
      ncmApi.mvDetailInfo(id).catch(() => null),
      ncmApi.simiMv(id).catch(() => null) as Promise<SimiMvResponse | null | undefined>,
    ])

    return normalizeMvBundle(urlRes, detailRes, infoRes, simiRes)
  })

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-4 md:p-6" data-testid="mv-skeleton">
          <Skeleton className="aspect-video w-full rounded-xl mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !data?.mv) {
    return (
      <AppShell>
        <div className="p-4 md:p-6" data-testid="mv-error">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
            <p className="text-base text-[var(--text-tertiary)]">MV 不存在或加载失败</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const mv = data.mv
  const info = data.info
  const simiMvs = data.simiMvs
  const tags = extractTags(mv.desc)

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6" data-testid="mv-page">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <MVPlayer
              src={data.url}
              poster={imageUrl(mv.cover ?? mv.picUrl, 720)}
              autoPlay
            />
            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2" data-testid="mv-tags">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="px-3 py-1 text-xs rounded-full
                               bg-[var(--bg-accent-subtle)] text-[var(--accent)]
                               border border-[var(--border-accent)]"
                  >
                    #{tag}
                  </li>
                ))}
              </ul>
            ) : null}
            <CommentList id={id} type="mv" />
          </div>
          <MVInfo
            mv={mv}
            likedCount={info?.likedCount ?? 0}
            shareCount={info?.shareCount ?? 0}
          />
        </section>

        {simiMvs.length > 0 ? (
          <section data-testid="mv-similar">
            <header className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg md:text-xl font-bold tracking-tight">相似 MV</h2>
              <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
                {simiMvs.length} 个推荐
              </span>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {simiMvs.slice(0, 8).map((mvItem) => (
                <Link
                  key={mvItem.id}
                  href={`/mv/${mvItem.id}`}
                  className="group block rounded-xl overflow-hidden"
                >
                  <div className="aspect-video rounded-lg overflow-hidden bg-[var(--bg-surface)] mb-2">
                    <Image
                      src={imageUrl(mvItem.cover ?? mvItem.imgurl, 320)}
                      alt={mvItem.name}
                      width={320}
                      height={180}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-sm font-medium truncate group-hover:text-[var(--accent)] transition-colors">
                    {mvItem.name}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">
                    {mvItem.artistName}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

      </div>
      <PlayerBar />
      <PlayerOverlays />
    </AppShell>
  )
}

const TAG_PATTERN = /#([\p{L}\p{N}_-]+)/gu

function extractTags(desc: string | undefined): string[] {
  if (!desc) return []
  const matches = desc.match(TAG_PATTERN)
  if (!matches) return []
  const seen = new Set<string>()
  const tags: string[] = []
  for (const raw of matches) {
    const tag = raw.slice(1).trim()
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length >= 6) break
  }
  return tags
}
