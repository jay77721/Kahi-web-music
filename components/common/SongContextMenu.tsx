'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Song } from '@/types/song'
import SongContextMenuContent from './SongContextMenuContent'

interface SongContextMenuProps {
  children: ReactNode
}

interface SongContextMenuState {
  isOpen: boolean
  x: number
  y: number
  song: Song | null
}

export type CloseMenuOptions = {
  restoreFocus?: boolean
}

interface SongContextMenuController {
  openMenu: (song: Song, x: number, y: number, triggerElement?: HTMLElement | null) => void
  closeMenu: (options?: CloseMenuOptions) => void
}

const SongContextMenuContext = createContext<SongContextMenuController | null>(null)

export function useSongContextMenu(): SongContextMenuController | null {
  return useContext(SongContextMenuContext)
}

export function SongContextMenu({ children }: SongContextMenuProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [menu, setMenu] = useState<SongContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    song: null,
  })

  const openMenu = useCallback((song: Song, x: number, y: number, triggerElement?: HTMLElement | null) => {
    const activeElement =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    returnFocusRef.current = triggerElement ?? activeElement
    setMenu({ isOpen: true, x, y, song })
  }, [])

  const closeMenu = useCallback((options: CloseMenuOptions = {}) => {
    const { restoreFocus = true } = options
    setMenu((current) => ({ ...current, isOpen: false, song: null }))
    const returnFocusTo = returnFocusRef.current
    returnFocusRef.current = null

    if (restoreFocus && returnFocusTo?.isConnected) {
      returnFocusTo.focus()
    }
  }, [])

  const controller = useMemo(
    () => ({ openMenu, closeMenu }),
    [closeMenu, openMenu]
  )

  return (
    <SongContextMenuContext.Provider value={controller}>
      {children}
      {menu.isOpen && menu.song && (
        <SongContextMenuContent song={menu.song} x={menu.x} y={menu.y} onClose={closeMenu} />
      )}
    </SongContextMenuContext.Provider>
  )
}
