'use client'

import { Flame } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import useSWR from 'swr'
import { ncmApi } from '@/lib/api'
import type { ApiResponse, HotSearchResponse } from '@/types/api'

interface HotSearchProps {
  onSelect: (keyword: string) => void
}

export function HotSearch({ onSelect }: HotSearchProps) {
  const { data, isLoading } = useSWR<ApiResponse<HotSearchResponse>>('search-hot', async () => {
    const result = await ncmApi.searchHot()
    return result as ApiResponse<HotSearchResponse>
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
    )
  }

  const hots = data?.data?.result?.hots || []
  if (hots.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
        <Flame className="w-4 h-4 text-orange-500" />
        热搜榜
      </h3>
      <div className="flex flex-wrap gap-2">
        {hots.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelect(item.first)}
            className="px-3 py-1.5 text-sm rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {item.first}
          </button>
        ))}
      </div>
    </div>
  )
}
