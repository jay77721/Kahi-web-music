'use client'

import { memo } from 'react'
import Image from 'next/image'
import { imageUrl } from '@/lib/format'

interface VinylDiscProps {
  coverUrl: string
  isPlaying: boolean
  size?: number
  className?: string
}

/**
 * Black-vinyl record wrapped around a cover image.
 *
 * Visual reference: NetEase Cloud Music 12.0+ vinyl upgrade.
 *   - The album cover is embedded in the center of a slowly rotating disc.
 *   - When paused, the disc keeps its last rotation (animation-play-state
 *     is set to `paused` rather than resetting the transform).
 *   - The spin period is ~1.8s per revolution to evoke 33⅓ RPM without
 *     literally matching real-life angular velocity.
 *
 * All motion is delegated to CSS (`vinyl-spin` keyframes in globals.css)
 * so the compositor can run it on the GPU and we avoid per-frame React
 * re-renders.
 */
export const VinylDisc = memo(function VinylDisc({
  coverUrl,
  isPlaying,
  size = 280,
  className,
}: VinylDiscProps) {
  // Inner label diameter is 1/3 of the outer disc; the rest is the groove
  // band that gives the visual cue of "vinyl".
  const labelSize = Math.round(size / 3)
  const hubSize = Math.max(6, Math.round(size / 64))

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
  } as const

  const labelStyle = {
    width: `${labelSize}px`,
    height: `${labelSize}px`,
  } as const

  return (
    <div
      className={['vinyl-disc', isPlaying ? 'vinyl-disc--playing' : 'vinyl-disc--paused', className]
        .filter(Boolean)
        .join(' ')}
      style={containerStyle}
      data-testid="vinyl-disc"
      data-playing={isPlaying ? 'true' : 'false'}
      data-size={size}
      aria-hidden="true"
    >
      <div className="vinyl-disc__cover-wrap">
        {coverUrl ? (
          <Image
            src={imageUrl(coverUrl, size)}
            alt=""
            width={labelSize}
            height={labelSize}
            className="vinyl-disc__cover"
            style={labelStyle}
            unoptimized
          />
        ) : null}
        <span className="vinyl-disc__hub" style={{ width: `${hubSize}px`, height: `${hubSize}px` }} />
      </div>
    </div>
  )
})
