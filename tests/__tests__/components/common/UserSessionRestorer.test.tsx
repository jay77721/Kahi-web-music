import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  restore: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: () => ({
      restore: mocks.restore,
    }),
  },
}))

describe('UserSessionRestorer', () => {
  beforeEach(() => {
    mocks.restore.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  test('starts restore on mount', async () => {
    mocks.restore.mockResolvedValueOnce()
    const { UserSessionRestorer } = await import('@/components/common/UserSessionRestorer')

    render(<UserSessionRestorer />)

    await waitFor(() => {
      expect(mocks.restore).toHaveBeenCalledTimes(1)
    })
  })
})
