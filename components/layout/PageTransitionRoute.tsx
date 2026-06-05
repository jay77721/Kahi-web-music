'use client'

import type { ReactNode } from 'react'

interface PageTransitionRouteProps {
  /**
   * A unique key per route, normally from `usePathname()`.
   * Changing it remounts the wrapper so the CSS enter animation replays.
   */
  routeKey: string
  children: ReactNode
  className?: string
}

const baseClassName = 'page-transition page-transition-enter w-full'

function mergeClassName(className?: string) {
  return className ? `${baseClassName} ${className}` : baseClassName
}

/**
 * Root-layout route transition backed by global CSS utilities.
 *
 * This intentionally stays separate from `components/common/PageTransition`,
 * which uses framer-motion for richer local transitions. The root layout only
 * needs a lightweight fade/slide so it should not force motion into the shared
 * client bundle.
 */
export function PageTransitionRoute({
  routeKey,
  children,
  className,
}: PageTransitionRouteProps) {
  return (
    <div
      key={routeKey}
      className={mergeClassName(className)}
      data-page-transition-route="true"
    >
      {children}
    </div>
  )
}
