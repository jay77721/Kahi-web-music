'use client'

import { memo } from 'react'
import Image from 'next/image'
import { imageUrl } from '@/lib/format'
import { cn } from '@/lib/utils'

interface NowPlayingArtworkProps {
  coverUrl: string
  alt: string
  isPlaying: boolean
  size: number
  imageSize?: number
  className?: string
  testId?: string
}

export const NowPlayingArtwork = memo(function NowPlayingArtwork({
  coverUrl,
  alt,
  isPlaying,
  size,
  imageSize,
  className,
  testId = 'now-playing-artwork',
}: NowPlayingArtworkProps) {
  if (!coverUrl) return null

  const artworkStyle = {
    width: `${size}px`,
    height: `${size}px`,
  } as const

  return (
    <div
      className={cn(
        'now-playing-artwork',
        isPlaying ? 'now-playing-artwork--playing' : 'now-playing-artwork--paused',
        className
      )}
      style={artworkStyle}
      data-testid={testId}
      data-playing={isPlaying ? 'true' : 'false'}
      aria-hidden={alt === '' ? 'true' : undefined}
    >
      <Image
        src={imageUrl(coverUrl, imageSize ?? size)}
        alt={alt}
        width={size}
        height={size}
        className="now-playing-artwork__image"
      />
    </div>
  )
})
