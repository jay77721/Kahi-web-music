"use client"

import type { CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
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

/**
 * Root-level toast host. Uses the app's own theme store so the global
 * layout does not need to pull in the separate next-themes wrapper.
 */
export function RootToaster({ ...props }: ToasterProps) {
  const theme = useUIStore((state) => state.theme)

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
