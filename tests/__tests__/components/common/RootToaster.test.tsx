import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { RootToaster } from "@/components/common/RootToaster"
import { useUIStore } from "@/stores/uiStore"

const toasterCalls = vi.hoisted(() => [] as Record<string, unknown>[])

vi.mock("sonner", async () => {
  const React = await import("react")

  return {
    Toaster: (props: Record<string, unknown>) => {
      toasterCalls.push(props)
      return React.createElement("div", {
        "data-testid": "sonner-toaster",
        "data-theme": String(props.theme),
        "data-class-name": String(props.className),
      })
    },
  }
})

function resetUIStore() {
  localStorage.clear()
  useUIStore.setState({
    sidebarOpen: true,
    sidebarWidth: 240,
    fullScreenPlayerOpen: false,
    playQueueOpen: false,
    searchOpen: false,
    theme: "dark",
    isMobile: false,
  })
}

describe("RootToaster", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toasterCalls.length = 0
    resetUIStore()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    resetUIStore()
    vi.clearAllMocks()
  })

  async function renderLoadedRootToaster() {
    render(<RootToaster />)
    expect(screen.queryByTestId("sonner-toaster")).not.toBeInTheDocument()

    await act(async () => {
      vi.runOnlyPendingTimers()
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  test("passes the app theme store value to Sonner", async () => {
    useUIStore.setState({ theme: "light" })

    await renderLoadedRootToaster()

    expect(screen.getByTestId("sonner-toaster")).toHaveAttribute("data-theme", "light")
    expect(toasterCalls.at(-1)).toMatchObject({
      className: "toaster group",
      toastOptions: { classNames: { toast: "cn-toast" } },
    })
  })

  test("updates Sonner when the app theme changes", async () => {
    await renderLoadedRootToaster()
    expect(screen.getByTestId("sonner-toaster")).toHaveAttribute("data-theme", "dark")

    act(() => {
      useUIStore.setState({ theme: "system" })
    })

    expect(screen.getByTestId("sonner-toaster")).toHaveAttribute("data-theme", "system")
  })

  test("keeps the root toast token style contract", async () => {
    await renderLoadedRootToaster()

    const latestProps = toasterCalls.at(-1)
    expect(latestProps?.style).toMatchObject({
      "--normal-bg": "var(--popover)",
      "--normal-text": "var(--popover-foreground)",
      "--normal-border": "var(--border)",
      "--border-radius": "var(--radius)",
    })
  })
})
