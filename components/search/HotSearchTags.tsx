'use client'

interface HotSearchTagsProps {
  onSelect: (keyword: string) => void
}

const HOT_SEARCH_TAGS = [
  '周杰伦',
  'Taylor Swift',
  '夜曲',
  '晴天',
  '稻香',
  '告白气球',
  '七里香',
  '起风了',
  'Mojito',
  'Shape of You',
]

export function HotSearchTags({ onSelect }: HotSearchTagsProps) {
  if (HOT_SEARCH_TAGS.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
        热门搜索
      </h3>
      <div className="flex flex-wrap gap-2">
        {HOT_SEARCH_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onSelect(tag)}
            className="px-3 py-1.5 text-sm rounded-full bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-white/5 transition-colors duration-200"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
