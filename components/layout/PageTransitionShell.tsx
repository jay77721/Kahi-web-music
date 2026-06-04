'use client'

import { usePathname } from 'next/navigation'
import { PageTransitionRoute } from '@/components/common/PageTransition'

/**
 * Client-side wrapper that triggers the `PageTransition` whenever
 * the route changes. Lives next to the server `RootLayout` so the
 * layout itself can stay a server component (preserves SSR).
 */
export function PageTransitionShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  return <PageTransitionRoute routeKey={pathname}>{children}</PageTransitionRoute>
}
