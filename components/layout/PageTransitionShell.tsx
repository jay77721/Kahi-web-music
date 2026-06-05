'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { PageTransitionRoute } from '@/components/layout/PageTransitionRoute'

/**
 * Client-side wrapper that triggers the `PageTransition` whenever
 * the route changes. Lives next to the server `RootLayout` so the
 * layout itself can stay a server component (preserves SSR).
 */
export function PageTransitionShell({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  return <PageTransitionRoute routeKey={pathname}>{children}</PageTransitionRoute>
}
