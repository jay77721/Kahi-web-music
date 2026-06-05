"use client"

import { useEffect, useState, type CSSProperties, type ComponentType } from "react"
import type { ToasterProps } from "sonner"
import { useUIStore } from "@/stores/uiStore"

const TOASTER_STYLE = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
} as CSSProperties

const TOAST_OPTIONS = {
  classNames: {
    toast: "cn-toast",
  },
} satisfies ToasterProps["toastOptions"]

type SonnerToaster = ComponentType<ToasterProps>

let sonnerToasterPromise: Promise<SonnerToaster> | undefined

function loadSonnerToaster() {
  sonnerToasterPromise ??= import("sonner").then(({ Toaster }) => Toaster)
  return sonnerToasterPromise
}

/**
 * Root-level toast host. Uses the app's own theme store so the global
 * layout does not need to pull in the separate next-themes wrapper.
 */
export function RootToaster({ ...props }: ToasterProps) {
  const theme = useUIStore((state) => state.theme)
  const [Sonner, setSonner] = useState<SonnerToaster | null>(null)

  useEffect(() => {
    let mounted = true
    const load = () => {
      void loadSonnerToaster().then((Toaster) => {
        if (mounted) {
          setSonner(() => Toaster)
        }
      })
    }

    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(load, { timeout: 3000 })

      return () => {
        mounted = false
        window.cancelIdleCallback(handle)
      }
    }

    const handle = globalThis.setTimeout(load, 0)

    return () => {
      mounted = false
      globalThis.clearTimeout(handle)
    }
  }, [])

  if (!Sonner) {
    return null
  }

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={TOASTER_STYLE}
      toastOptions={TOAST_OPTIONS}
      {...props}
    />
  )
}
