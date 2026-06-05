'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/stores/userStore'

export function useRequireSession() {
  const router = useRouter()
  const { isLoggedIn, hasRestoredSession, profile, restore } = useUserStore()

  useEffect(() => {
    if (!hasRestoredSession) {
      void restore?.()
    }
  }, [hasRestoredSession, restore])

  useEffect(() => {
    if (hasRestoredSession && !isLoggedIn) {
      router.replace('/login')
    }
  }, [hasRestoredSession, isLoggedIn, router])

  return {
    isLoggedIn,
    hasRestoredSession,
    isRestoringSession: !hasRestoredSession,
    profile,
  }
}
