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

    const { getByTestId } = render(<UserSessionRestorer />)

    const marker = getByTestId('user-session-restorer')
    expect(marker).toHaveAttribute('aria-hidden', 'true')
    expect(marker).toHaveStyle({ position: 'fixed', width: '0px', height: '0px', overflow: 'hidden' })

    await waitFor(() => {
      expect(mocks.restore).toHaveBeenCalledTimes(1)
    })
  })
})
