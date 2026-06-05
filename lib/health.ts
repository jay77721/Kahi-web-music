import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

type HealthStatus = {
  api: boolean
  audioContext: boolean
  timestamp: number
}

type HealthCheckResult = {
  success: boolean
  data: HealthStatus
  error?: string
}

/**
 * Check if the API server is reachable
 */
export async function checkApiHealth(timeoutMs = 5000): Promise<boolean> {
  try {
    // Use a lightweight GET request instead of HEAD to avoid Next.js API route issues
    const response = await fetchWithTimeout('/api/check/music?ids=1', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }, timeoutMs)

    return response.ok
  } catch {
    return false
  }
}

/**
 * Check if the browser supports audio playback
 */
export function checkAudioContext(): boolean {
  return typeof window !== 'undefined'
    && ('AudioContext' in window || 'webkitAudioContext' in window)
}

/**
 * Run all health checks
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  const [apiHealthy, audioContextHealthy] = await Promise.all([
    checkApiHealth(),
    Promise.resolve(checkAudioContext()),
  ])

  const data: HealthStatus = {
    api: apiHealthy,
    audioContext: audioContextHealthy,
    timestamp: Date.now(),
  }

  if (!apiHealthy) {
    return {
      success: false,
      data,
      error: '无法连接到音乐服务，请检查网络或稍后重试',
    }
  }

  if (!audioContextHealthy) {
    return {
      success: false,
      data,
      error: '您的浏览器不支持音频播放，请升级浏览器',
    }
  }

  return { success: true, data }
}
