import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { PlaybackController } from "@/components/player/PlaybackController"
import { PageTransitionShell } from "@/components/layout/PageTransitionShell"
import { GlobalShortcuts } from "@/components/common/GlobalShortcuts"
import { RootToaster } from "@/components/common/RootToaster"
import { ServiceWorkerRegistrar } from "@/components/common/ServiceWorkerRegistrar"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { ThemeProvider } from "@/components/common/ThemeProvider"
import { SkipNav } from "@/components/common/SkipNav"
import { UserSessionRestorer } from "@/components/common/UserSessionRestorer"
import "./globals.css"

const themeInitScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("kahi-web-music:ui:theme")
    const theme = stored ? JSON.parse(stored) : "dark"
    const resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme

    if (resolved === "dark" || resolved === "light") {
      document.documentElement.dataset.theme = resolved
    }
  } catch {
    document.documentElement.dataset.theme = "dark"
  }
})()
`

export const metadata: Metadata = {
  title: "Kahi Music",
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
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <SkipNav />
        <UserSessionRestorer />
        <ThemeProvider>
          <ErrorBoundary>
            <PageTransitionShell>{children}</PageTransitionShell>
          </ErrorBoundary>
          <PlaybackController />
          <GlobalShortcuts />
          <ServiceWorkerRegistrar />
          <RootToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
