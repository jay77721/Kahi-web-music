'use client'

import Image, { type ImageProps } from 'next/image'
import { useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Reusable 1x1 #202020 blur placeholder.
 * Encoded as a base64 SVG so the browser shows it instantly while the
 * real image streams in. Reused across every <BlurImage /> to avoid
 * re-encoding the same bytes per render.
 *
 * The base64 payload is precomputed at module load time instead of using
 * `btoa()` so the file works unchanged across the browser, edge runtime,
 * and Node SSR — `btoa` is not available in all server runtimes.
 */
const BLUR_PLACEHOLDER_SRC =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxIDEnPjxyZWN0IHdpZHRoPScxJyBoZWlnaHQ9JzEnIGZpbGw9JyUyMzIwMjAyMCcvPjwvc3ZnPg=='

interface BlurImageProps extends Omit<ImageProps, 'placeholder' | 'blurDataURL' | 'alt'> {
  /** Required for accessibility — describes the image contents. */
  alt: string
  /** Optional className forwarded to the underlying <Image>. */
  className?: string
  /** Optional inline style forwarded to the underlying <Image>. */
  style?: CSSProperties
}

/**
 * BlurImage — opinionated wrapper around `next/image`.
 *
 * - Uses a tiny base64 SVG placeholder so the layout reserves the
 *   correct space and the user sees a soft grey block immediately.
 * - Defaults to `loading="lazy"`. Pass `priority` (or `loading="eager"`)
 *   for above-the-fold hero images.
 * - Fades the image in (200ms) once the source has loaded, avoiding
 *   the "pop" effect of an unstyled raw <img>.
 */
export function BlurImage({
  alt,
  className,
  style,
  loading,
  onLoad,
  priority,
  ...rest
}: BlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  // `next/image` forbids passing both `priority` and `loading="lazy"`.
  // For above-the-fold hero shots, callers pass `priority`; in that case
  // we omit the explicit `loading` attribute so next/image defaults to
  // eager loading. For everything else, we opt into native lazy loading.
  const resolvedLoading = priority ? undefined : (loading ?? 'lazy')

  const handleLoad = (event: Parameters<NonNullable<ImageProps['onLoad']>>[0]) => {
    setIsLoaded(true)
    onLoad?.(event)
  }

  return (
    <Image
      {...rest}
      alt={alt}
      placeholder="blur"
      blurDataURL={BLUR_PLACEHOLDER_SRC}
      priority={priority}
      loading={resolvedLoading}
      onLoad={handleLoad}
      className={cn('blur-placeholder', isLoaded && 'blur-placeholder--loaded', className)}
      style={style}
    />
  )
}
