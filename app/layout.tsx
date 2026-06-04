import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/sonner"
import { PlaybackController } from "@/components/player/PlaybackController"
import { PageTransitionShell } from "@/components/layout/PageTransitionShell"
import { GlobalShortcuts } from "@/components/common/GlobalShortcuts"
import { ServiceWorkerRegistrar } from "@/components/common/ServiceWorkerRegistrar"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { ThemeProvider } from "@/components/common/ThemeProvider"
import { SkipNav } from "@/components/common/SkipNav"
import { UserSessionRestorer } from "@/components/common/UserSessionRestorer"
import "./globals.css"

export const metadata: Metadata = {
  title: "KaQi Music",
  description: "Web music player",
  manifest: "/manifest.json",
  applicationName: "Kahi Music",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kahi Music",
  },
}

export const viewport: Viewport = {
  themeColor: "#1ed760",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning: ThemeProvider sets data-theme on the client;
    // the html attribute is intentionally absent on the first server-rendered
    // paint so we don't ship a wrong theme to the user.
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <SkipNav />
        <UserSessionRestorer />
        <ThemeProvider>
          <ErrorBoundary>
            <PageTransitionShell>{children}</PageTransitionShell>
          </ErrorBoundary>
          <PlaybackController />
          <GlobalShortcuts />
          <ServiceWorkerRegistrar />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
