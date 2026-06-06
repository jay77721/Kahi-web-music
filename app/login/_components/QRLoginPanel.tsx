'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ncmApi } from '@/lib/api'
import { useUserStore } from '@/stores/userStore'
import { QRStatus, type UserProfile } from '@/types/user'

type QRViewStatus = 'loading' | 'ready' | 'scanned' | 'expired'

const POLL_INTERVAL_MS = 3000
const QR_EXPIRE_MS = 5 * 60 * 1000

interface QRKeyResult {
  unikey?: string
}

interface QRCreateResult {
  qrimg?: string
}

interface QRCheckResult {
  code: number
  message?: string
}

interface UserAccountResult {
  profile?: UserProfile
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function QRLoginPanel() {
  const router = useRouter()
  const setProfile = useUserStore((s) => s.setProfile)
  const [qrImg, setQrImg] = useState('')
  const [status, setStatus] = useState<QRViewStatus>('loading')
  const pollTimerRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const generationRef = useRef(0)

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current)
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    pollTimerRef.current = null
    timeoutRef.current = null
  }, [])

  const startPolling = useCallback(
    (key: string, generation: number) => {
      const isCurrentGeneration = () => generationRef.current === generation
      const scheduleNextPoll = () => {
        if (!isCurrentGeneration()) return
        pollTimerRef.current = window.setTimeout(() => {
          void pollOnce()
        }, POLL_INTERVAL_MS)
      }
      const pollOnce = async () => {
        if (!isCurrentGeneration()) return
        pollTimerRef.current = null
        try {
          const res = await ncmApi.requestFlexible<QRCheckResult>('/login/qr/check', {
            key,
            timestamp: Date.now(),
          })
          if (!isCurrentGeneration()) return
          if (res.code === QRStatus.EXPIRED) {
            setStatus('expired')
            clearTimers()
          } else if (res.code === QRStatus.SCANNED) {
            setStatus('scanned')
            scheduleNextPoll()
          } else if (res.code === QRStatus.CONFIRMED) {
            clearTimers()
            try {
              const accountRes = (await ncmApi.userAccount()) as unknown as UserAccountResult
              if (!isCurrentGeneration()) return
              if (!accountRes?.profile) {
                throw new Error('登录状态确认失败，请重试')
              }
              setProfile(accountRes.profile)
              toast.success('登录成功')
              router.push('/liked')
            } catch (error) {
              if (!isCurrentGeneration()) return
              toast.error(getErrorMessage(error, '登录状态确认失败，请重试'))
              setStatus('expired')
            }
          } else {
            scheduleNextPoll()
          }
        } catch {
          // Polling can fail transiently — keep retrying until expiry timeout.
          scheduleNextPoll()
        }
      }

      scheduleNextPoll()

      timeoutRef.current = window.setTimeout(() => {
        clearTimers()
        if (!isCurrentGeneration()) return
        setStatus('expired')
      }, QR_EXPIRE_MS)
    },
    [router, setProfile, clearTimers]
  )

  const generateQR = useCallback(async () => {
    const generation = generationRef.current + 1
    generationRef.current = generation
    clearTimers()
    setStatus('loading')
    setQrImg('')
    try {
      const keyRes = (await ncmApi.loginQrKey()) as unknown as QRKeyResult
      if (generationRef.current !== generation) return
      const key = keyRes?.unikey
      if (!key) throw new Error('获取二维码失败')
      const createRes = (await ncmApi.loginQrCreate(key)) as unknown as QRCreateResult
      if (generationRef.current !== generation) return
      const img = createRes?.qrimg
      if (!img) throw new Error('获取二维码失败')
      setQrImg(img)
      setStatus('ready')
      startPolling(key, generation)
    } catch (err: unknown) {
      if (generationRef.current !== generation) return
      const msg = err instanceof Error ? err.message : '获取二维码失败'
      toast.error(msg)
      setStatus('expired')
    }
  }, [startPolling, clearTimers])

  useEffect(() => {
    // Defer to break the synchronous set-state-in-effect pattern flagged by
    // react-hooks/set-state-in-effect. generateQR calls setStatus('loading')
    // before its first await, so it must run in a microtask, not the effect body.
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      void generateQR()
    })
    return () => {
      cancelled = true
      generationRef.current += 1
      clearTimers()
    }
  }, [generateQR, clearTimers])

  return (
    <div className="flex flex-col items-center space-y-5" aria-label="扫码登录面板">
      <div className="relative py-4">
        {qrImg ? (
          <div className="relative">
            <Image
              src={qrImg}
              alt="网易云音乐扫码登录二维码"
              width={192}
              height={192}
              className="w-48 h-48 rounded-2xl border border-[var(--border)]"
              style={{ imageRendering: 'auto' }}
            />
            {status === 'scanned' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                  <span className="text-xs text-white">请在手机上确认</span>
                </div>
              </div>
            )}
            {status === 'expired' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                <p className="text-sm text-white">已过期</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-48 h-48 rounded-2xl border border-[var(--border)] flex items-center justify-center bg-[var(--bg-secondary)]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--text-tertiary)]" />
          </div>
        )}
      </div>

      <p className="text-sm text-[var(--text-tertiary)] text-center min-h-[20px]" role="status">
        {status === 'ready' && '打开网易云音乐 APP 扫码登录'}
        {status === 'scanned' && '已扫码，请在手机上确认登录'}
        {status === 'expired' && '二维码已过期，请重新生成'}
        {status === 'loading' && '正在生成二维码…'}
      </p>

      {status === 'expired' && (
        <div className="animate-slide-up">
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--border)] text-sm rounded-lg hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-all"
            onClick={generateQR}
          >
            重新生成二维码
          </Button>
        </div>
      )}
    </div>
  )
}
