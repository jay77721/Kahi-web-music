# Testing Guide

This project uses **Vitest** for unit/integration tests and **Playwright** for E2E tests.

## Test Structure

```
tests/
├── helpers/
│   ├── setup.ts              # Global test setup (mocks, globals)
│   ├── mock-data.ts          # Reusable test fixtures
│   └── test-utils.tsx        # Custom render wrapper with providers
├── __tests__/
│   ├── lib/                  # Unit tests for utilities
│   │   ├── format.test.ts
│   │   ├── storage.test.ts
│   │   ├── lrc.test.ts
│   │   ├── api.test.ts
│   │   └── utils.test.ts
│   ├── hooks/                # Hook tests
│   │   ├── useKeyboardShortcuts.test.ts
│   │   ├── useMediaQuery.test.ts
│   │   └── useIntersectionObserver.test.ts
│   ├── stores/               # Zustand store tests
│   │   ├── playerStore.test.ts
│   │   └── uiStore.test.ts
│   └── components/           # Component tests
│       ├── ui/
│       ├── player/
│       ├── layout/
│       └── common/
└── e2e/                      # Playwright E2E tests
    ├── home.spec.ts
    ├── navigation.spec.ts
    └── player-flow.spec.ts
```

## Running Tests

```bash
# Run all unit/integration tests
pnpm test

# Run in watch mode (during development)
pnpm test:watch

# Run with coverage report
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run everything
pnpm test:all
```

## Writing Tests

### Unit Tests (Vitest)

```typescript
import { describe, test, expect } from 'vitest'
import { formatDuration } from '@/lib/format'

describe('formatDuration', () => {
  test('formats 90 seconds as 1:30', () => {
    expect(formatDuration(90000)).toBe('1:30')
  })

  test('formats 0 as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00')
  })
})
```

### Component Tests (React Testing Library)

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  test('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeVisible()
  })

  test('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
})
```

## Mocking

### Global Mocks (in `tests/helpers/setup.ts`)

- `window.matchMedia` - returns { matches: false }
- `IntersectionObserver` - no-op mock
- `ResizeObserver` - no-op mock
- `localStorage` / `sessionStorage` - in-memory mock
- `Howler` - mocked audio library
- `SWR` - returns empty data

### Test Data

Use fixtures from `tests/helpers/mock-data.ts`:

```typescript
import { mockSong, mockPlaylist, mockArtist } from '@/tests/helpers/mock-data'
```

### Store Testing

```typescript
import { usePlayerStore } from '@/stores/playerStore'

// Get current state
const state = usePlayerStore.getState()

// Update state
usePlayerStore.setState({ isPlaying: true })

// Call an action
usePlayerStore.getState().playSong(mockSong)
```

## Coverage Thresholds

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

View coverage report:
```bash
pnpm test:coverage
# Open coverage/index.html in browser
```

## Tips

1. **Use `@testing-library/react` queries**: Prefer `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
2. **Test behavior, not implementation**: Don't test internal state, test what users see and do
3. **Avoid snapshots**: They're brittle and add maintenance burden
4. **Keep tests independent**: Each test should be runnable alone
5. **Use `waitFor` for async**: Don't use arbitrary timeouts
