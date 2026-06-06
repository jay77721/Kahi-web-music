'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ncmApi } from '@/lib/api'
import { useUserStore } from '@/stores/userStore'
import { useCaptchaCountdown } from '@/hooks/useCaptchaCountdown'

const PHONE_LENGTH = 11
const CAPTCHA_LENGTH = 6

function onlyDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone)
}

function isValidCaptcha(captcha: string): boolean {
  return /^\d{6}$/.test(captcha)
}

interface CaptchaSentResult {
  code: number
  message?: string
}

export function PhoneLoginForm() {
  const router = useRouter()
  const login = useUserStore((s) => s.login)
  const [phone, setPhone] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [touchedPhone, setTouchedPhone] = useState(false)
  const [touchedCaptcha, setTouchedCaptcha] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const sendingRef = useRef(false)
  const submittingRef = useRef(false)
  const { seconds, isCountingDown, start, reset } = useCaptchaCountdown(60)

  const phoneError = useMemo(
    () => (touchedPhone && phone.length > 0 && !isValidPhone(phone) ? '请输入 11 位手机号' : ''),
    [touchedPhone, phone]
  )
  const captchaError = useMemo(
    () => (touchedCaptcha && captcha.length > 0 && !isValidCaptcha(captcha) ? '验证码为 6 位数字' : ''),
    [touchedCaptcha, captcha]
  )
  const canSendCaptcha = isValidPhone(phone) && !isCountingDown && !sending
  const canSubmit = isValidPhone(phone) && isValidCaptcha(captcha) && !submitting

  const handleSendCaptcha = useCallback(async () => {
    if (!canSendCaptcha || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    try {
      const res = (await ncmApi.captchaSent(phone)) as unknown as CaptchaSentResult
      if (res?.code !== 200) {
        throw new Error(res.message || '验证码发送失败')
      }
      toast.success('验证码已发送，请注意查收')
      start()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '验证码发送失败'
      toast.error(msg)
      reset()
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }, [canSendCaptcha, phone, start, reset])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      setTouchedPhone(true)
      setTouchedCaptcha(true)
      if (!canSubmit || submittingRef.current) return
      submittingRef.current = true
      setSubmitting(true)
      try {
        await login(phone, captcha)
        toast.success('登录成功')
        router.push('/liked')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '登录失败'
        toast.error(msg)
      } finally {
        submittingRef.current = false
        setSubmitting(false)
      }
    },
    [canSubmit, login, phone, captcha, router]
  )

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="手机号登录表单"
      className="space-y-4"
    >
      <div className="space-y-1">
        <label htmlFor="login-phone" className="sr-only">
          手机号
        </label>
        <Input
          id="login-phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={PHONE_LENGTH}
          placeholder="请输入手机号"
          value={phone}
          onChange={(e) => setPhone(onlyDigits(e.target.value, PHONE_LENGTH))}
          onBlur={() => setTouchedPhone(true)}
          aria-invalid={!!phoneError}
          aria-describedby={phoneError ? 'login-phone-error' : undefined}
          className="h-12 rounded-xl text-base bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
        />
        {phoneError && (
          <p id="login-phone-error" role="alert" className="text-xs text-[var(--accent-text)] pl-1">
            {phoneError}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="login-captcha" className="sr-only">
          验证码
        </label>
        <div className="flex gap-2">
          <Input
            id="login-captcha"
            name="captcha"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CAPTCHA_LENGTH}
            placeholder="6 位验证码"
            value={captcha}
            onChange={(e) => setCaptcha(onlyDigits(e.target.value, CAPTCHA_LENGTH))}
            onBlur={() => setTouchedCaptcha(true)}
            aria-invalid={!!captchaError}
            aria-describedby={captchaError ? 'login-captcha-error' : undefined}
            className="h-12 rounded-xl text-base bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSendCaptcha}
            disabled={!canSendCaptcha}
            aria-live="polite"
            className="flex-shrink-0 h-12 text-sm rounded-xl border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-all disabled:opacity-40 px-4 min-w-[120px]"
          >
            {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {!sending && (isCountingDown ? `${seconds}s 后重发` : '获取验证码')}
          </Button>
        </div>
        {captchaError && (
          <p id="login-captcha-error" role="alert" className="text-xs text-[var(--accent-text)] pl-1">
            {captchaError}
          </p>
        )}
      </div>

      <div className="transition-transform duration-150 active:scale-[0.985]">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] font-semibold rounded-xl text-base transition-all duration-200 hover:shadow-[0_0_24px_var(--accent-glow)]"
        >
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitting ? '登录中…' : '登 录'}
        </Button>
      </div>
    </form>
  )
}
