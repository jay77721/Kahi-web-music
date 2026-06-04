'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Share2, Link as LinkIcon, Code2, MessageCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  buildWebShareData,
  copyToClipboard,
  getEmbedCode,
  getShareUrl,
  type ShareableType,
} from '@/lib/share'

export interface ShareMenuProps {
  type: ShareableType
  id: string | number
  title: string
  className?: string
  /** Optional base URL override; defaults to window.location.origin. */
  baseUrl?: string
}

interface MenuAction {
  key: string
  label: string
  icon: typeof LinkIcon
  hint: string
  run: () => void | Promise<void>
}

function resolveBaseUrl(override?: string): string {
  if (override && override.length > 0) return override
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

export function ShareMenu({
  type,
  id,
  title,
  className,
  baseUrl,
}: ShareMenuProps) {
  const [open, setOpen] = useState<boolean>(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = `share-menu-${type}-${id}`

  const base = resolveBaseUrl(baseUrl)
  const shareUrl = getShareUrl(type, id, base)
  const embedCode = getEmbedCode(type, id, base)

  const handleClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleClose()
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, handleClose])

  const runCopy = useCallback(
    async (key: string, text: string, successMsg: string) => {
      const result = await copyToClipboard(text)
      if (result.ok) {
        toast.success(successMsg)
        setCopiedKey(key)
        window.setTimeout(() => {
          setCopiedKey((current) => (current === key ? null : current))
        }, 1500)
      } else {
        toast.error('复制失败，请手动选择文本')
      }
      handleClose()
    },
    [handleClose]
  )

  const actions: MenuAction[] = [
    {
      key: 'link',
      label: copiedKey === 'link' ? '已复制' : '复制链接',
      icon: copiedKey === 'link' ? Check : LinkIcon,
      hint: '复制当前页面 URL',
      run: () => runCopy('link', shareUrl, '链接已复制'),
    },
    {
      key: 'embed',
      label: copiedKey === 'embed' ? '已复制' : '复制嵌入代码',
      icon: copiedKey === 'embed' ? Check : Code2,
      hint: '复制 iframe 代码',
      run: () => runCopy('embed', embedCode, '嵌入代码已复制'),
    },
  ]

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      toast.info('当前环境不支持系统分享')
      handleClose()
      return
    }
    try {
      await navigator.share(buildWebShareData(type, id, title, base))
      handleClose()
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return
      toast.error('分享失败')
    }
  }, [type, id, title, base, handleClose])

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className ?? ''}`}
    >
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="分享"
        data-testid="share-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        className="border-[var(--border)]"
      >
        <Share2 className="w-4 h-4 mr-1" />
        分享
      </Button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="分享选项"
          data-testid="share-menu"
          className="absolute right-0 mt-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl z-50 overflow-hidden backdrop-blur-xl"
        >
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <p className="text-xs text-[var(--text-tertiary)] truncate" title={title}>
              分享「{title}」
            </p>
          </div>

          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                data-testid={`share-menu-item-${action.key}`}
                onClick={() => void action.run()}
                className="w-full flex items-start gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors text-left"
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0 text-[var(--accent)]" />
                <span className="flex flex-col min-w-0">
                  <span className="leading-tight">{action.label}</span>
                  <span className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                    {action.hint}
                  </span>
                </span>
              </button>
            )
          })}

          <div className="border-t border-[var(--border)]">
            <p
              id={`${menuId}-group`}
              className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]"
            >
              分享到
            </p>
            <button
              type="button"
              role="menuitem"
              data-testid="share-menu-item-system"
              onClick={() => void handleNativeShare()}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              <MessageCircle className="w-4 h-4 shrink-0 text-[var(--accent)]" />
              <span>系统分享…</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
