'use client'

import { useEffect, useState, useCallback } from 'react'
import { runHealthCheck } from '@/lib/health'
import { toast } from 'sonner'

interface HealthState {
  isHealthy: boolean | null
  apiDown: boolean
  errorMessage: string | null
  lastChecked: number | null
  isChecking: boolean
}

export function useHealthCheck(checkOnMount = true, retryIntervalMs = 60000) {
  const [state, setState] = useState<HealthState>({
    isHealthy: null,
    apiDown: false,
    errorMessage: null,
    lastChecked: null,
    isChecking: false,
  })

  const runCheck = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true }))

    try {
      const result = await runHealthCheck()

      if (!result.success) {
        setState({
          isHealthy: false,
          apiDown: !result.data.api,
          errorMessage: result.error || '服务异常',
          lastChecked: Date.now(),
          isChecking: false,
        })

        // Show toast for API down
        if (!result.data.api) {
          toast.error(result.error || '无法连接到音乐服务')
        }
      } else {
        setState({
          isHealthy: true,
          apiDown: false,
          errorMessage: null,
          lastChecked: Date.now(),
          isChecking: false,
        })
      }
    } catch {
      setState(prev => ({ ...prev, isChecking: false }))
    }
  }, [])

  const retryApi = useCallback(async () => {
    setState(prev => ({ ...prev, apiDown: false, errorMessage: null }))
    await runCheck()
  }, [runCheck])

  useEffect(() => {
    if (!checkOnMount) return
    if (typeof window === 'undefined') return

    // Delay health check to not block initial render
    const timer = setTimeout(() => {
      runCheck()

      // Periodic re-check when API was down
      if (state.apiDown) {
        const retryTimer = setInterval(runCheck, retryIntervalMs)
        return () => clearInterval(retryTimer)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [checkOnMount, runCheck, retryIntervalMs, state.apiDown])

  return {
    ...state,
    runCheck,
    retryApi,
  }
}
