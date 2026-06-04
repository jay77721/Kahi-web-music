/**
 * Custom render wrapper for testing components.
 * Provides a basic SWR provider context.
 */

import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SWRConfig } from 'swr'

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        suspense: false,
      }}
    >
      {children}
    </SWRConfig>
  )
}

function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
