import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface SongTableSkeletonProps {
  className?: string
}

export function SongTableSkeleton({ className }: SongTableSkeletonProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2">
          <Skeleton className="w-6 h-4 rounded bg-[var(--bg-elevated)]" />
          <Skeleton className="w-10 h-10 rounded bg-[var(--bg-elevated)]" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4 rounded bg-[var(--bg-elevated)]" />
            <Skeleton className="h-3 w-1/2 rounded bg-[var(--bg-elevated)]" />
          </div>
          <Skeleton className="h-3 w-14 rounded bg-[var(--bg-elevated)]" />
        </div>
      ))}
    </div>
  )
}
