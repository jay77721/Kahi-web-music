'use client'

import { memo } from 'react'

interface TonearmProps {
  isPlaying: boolean
  className?: string
}

/**
 * Stylized tonearm that swings over the vinyl when playback starts.
 *
 * - At rest (`isPlaying === false`): 0deg — arm parked at the outer rest.
 * - When playing: rotates to 25deg, hovering over the inner groove.
 *
 * Motion is a CSS transition so the browser can interpolate the
 * transform on the GPU. The SVG itself is rendered as a single
 * declarative tree — no JS animation loop.
 */
export const Tonearm = memo(function Tonearm({ isPlaying, className }: TonearmProps) {
  return (
    <div
      className={['tonearm', isPlaying ? 'tonearm--playing' : 'tonearm--paused', className]
        .filter(Boolean)
        .join(' ')}
      data-testid="tonearm"
      data-playing={isPlaying ? 'true' : 'false'}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 200" width="32" height="100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="tonearm-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="50%" stopColor="#cfcfcf" />
            <stop offset="100%" stopColor="#2a2a2a" />
          </linearGradient>
        </defs>
        {/* Pivot base */}
        <circle cx="56" cy="20" r="14" fill="var(--bg-elevated)" stroke="var(--border-light)" />
        <circle cx="56" cy="20" r="5" style={{ fill: 'var(--bg-secondary)' }} />
        {/* Arm shaft */}
        <rect x="52" y="20" width="6" height="150" rx="3" fill="url(#tonearm-shade)" />
        {/* Cartridge head */}
        <rect x="46" y="166" width="18" height="22" rx="3" fill="var(--bg-elevated)" />
        <rect x="50" y="170" width="10" height="4" rx="1" fill="var(--accent)" />
      </svg>
    </div>
  )
})
