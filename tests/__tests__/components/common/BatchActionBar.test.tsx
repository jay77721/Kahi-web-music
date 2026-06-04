'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BatchActionBar } from '@/components/common/BatchActionBar'

// The global tests/helpers/setup.ts mock already replaces motion.* with plain
// <div>s and AnimatePresence with a Fragment, so we do not need a local mock.

describe('BatchActionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('visibility', () => {
    test('renders nothing when selectedCount is 0', () => {
      const { container } = render(
        <BatchActionBar selectedCount={0} onClear={vi.fn()} actions={[]} animated={false} />
      )
      expect(container.querySelector('[data-testid="batch-action-bar"]')).toBeNull()
    })

    test('renders the toolbar when selectedCount is greater than 0', () => {
      render(
        <BatchActionBar selectedCount={2} onClear={vi.fn()} actions={[]} animated={false} />
      )
      expect(screen.getByTestId('batch-action-bar')).toBeInTheDocument()
    })
  })

  describe('selected count display', () => {
    test('shows the selected count using Chinese label', () => {
      render(
        <BatchActionBar selectedCount={3} onClear={vi.fn()} actions={[]} animated={false} />
      )
      expect(screen.getByTestId('batch-action-bar-count')).toHaveTextContent('已选 3 首')
    })

    test('updates when selectedCount changes', () => {
      const { rerender } = render(
        <BatchActionBar selectedCount={1} onClear={vi.fn()} actions={[]} animated={false} />
      )
      expect(screen.getByTestId('batch-action-bar-count')).toHaveTextContent('已选 1 首')

      rerender(
        <BatchActionBar selectedCount={5} onClear={vi.fn()} actions={[]} animated={false} />
      )
      expect(screen.getByTestId('batch-action-bar-count')).toHaveTextContent('已选 5 首')
    })
  })

  describe('clear action', () => {
    test('triggers onClear when the close button is clicked', () => {
      const onClear = vi.fn()
      render(
        <BatchActionBar selectedCount={1} onClear={onClear} actions={[]} animated={false} />
      )

      fireEvent.click(screen.getByTestId('batch-action-bar-clear'))
      expect(onClear).toHaveBeenCalledTimes(1)
    })
  })

  describe('action buttons', () => {
    test('renders one button per action with the supplied label', () => {
      render(
        <BatchActionBar
          selectedCount={2}
          onClear={vi.fn()}
          animated={false}
          actions={[
            { label: '收藏', onClick: vi.fn() },
            { label: '删除', onClick: vi.fn(), danger: true },
          ]}
        />
      )

      expect(screen.getByText('收藏')).toBeInTheDocument()
      expect(screen.getByText('删除')).toBeInTheDocument()
    })

    test('invokes action.onClick when the action button is clicked', () => {
      const onFavorite = vi.fn()
      const onDelete = vi.fn()
      render(
        <BatchActionBar
          selectedCount={2}
          onClear={vi.fn()}
          animated={false}
          actions={[
            { label: '收藏', onClick: onFavorite },
            { label: '删除', onClick: onDelete, danger: true },
          ]}
        />
      )

      fireEvent.click(screen.getByText('收藏'))
      expect(onFavorite).toHaveBeenCalledTimes(1)
      expect(onDelete).not.toHaveBeenCalled()

      fireEvent.click(screen.getByText('删除'))
      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    test('disables the button when action.disabled is true', () => {
      const onClick = vi.fn()
      render(
        <BatchActionBar
          selectedCount={1}
          onClear={vi.fn()}
          animated={false}
          actions={[{ label: 'Pending', onClick, disabled: true }]}
        />
      )

      const button = screen.getByText('Pending').closest('button')
      expect(button).toBeDisabled()
      fireEvent.click(button!)
      expect(onClick).not.toHaveBeenCalled()
    })

    test('renders the leading icon when provided', () => {
      render(
        <BatchActionBar
          selectedCount={1}
          onClear={vi.fn()}
          animated={false}
          actions={[
            {
              label: 'With Icon',
              icon: <svg data-testid="action-icon" />,
              onClick: vi.fn(),
            },
          ]}
        />
      )

      expect(screen.getByTestId('action-icon')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    test('uses toolbar role with a meaningful aria-label', () => {
      render(
        <BatchActionBar selectedCount={4} onClear={vi.fn()} actions={[]} animated={false} />
      )
      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveAttribute('aria-label', '批量操作工具栏 - 已选 4 首')
    })
  })
})
