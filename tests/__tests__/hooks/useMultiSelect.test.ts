import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useMultiSelect } from '@/hooks/useMultiSelect'

describe('useMultiSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('initial state', () => {
    it('starts with an empty selection', () => {
      const { result } = renderHook(() => useMultiSelect({ enableKeyboard: false }))

      expect(result.current.count).toBe(0)
      expect(result.current.selectedIds.size).toBe(0)
    })
  })

  describe('toggle', () => {
    it('adds an id when not previously selected', () => {
      const { result } = renderHook(() => useMultiSelect({ enableKeyboard: false }))

      act(() => {
        result.current.toggle('1')
      })

      expect(result.current.count).toBe(1)
      expect(result.current.isSelected('1')).toBe(true)
    })

    it('removes an id when toggled twice', () => {
      const { result } = renderHook(() => useMultiSelect({ enableKeyboard: false }))

      act(() => {
        result.current.toggle('1')
      })
      act(() => {
        result.current.toggle('1')
      })

      expect(result.current.count).toBe(0)
      expect(result.current.isSelected('1')).toBe(false)
    })

    it('produces a new Set instance on every change (immutability)', () => {
      const { result } = renderHook(() => useMultiSelect({ enableKeyboard: false }))
      const initialRef = result.current.selectedIds

      act(() => {
        result.current.toggle('1')
      })

      expect(result.current.selectedIds).not.toBe(initialRef)
    })
  })

  describe('selectAll', () => {
    it('replaces the selection with the supplied ids', () => {
      const { result } = renderHook(() => useMultiSelect({ enableKeyboard: false }))

      act(() => {
        result.current.toggle('99')
      })
      act(() => {
        result.current.selectAll(['1', '2', '3'])
      })

      expect(result.current.count).toBe(3)
      expect(result.current.isSelected('1')).toBe(true)
      expect(result.current.isSelected('99')).toBe(false)
    })

    it('dedupes duplicate ids supplied in the input', () => {
      const { result } = renderHook(() => useMultiSelect({ enableKeyboard: false }))

      act(() => {
        result.current.selectAll(['a', 'a', 'b', 'b', 'c'])
      })

      expect(result.current.count).toBe(3)
    })
  })

  describe('clear', () => {
    it('drops every selection', () => {
      const { result } = renderHook(() => useMultiSelect({ enableKeyboard: false }))

      act(() => {
        result.current.selectAll(['1', '2', '3'])
      })
      act(() => {
        result.current.clear()
      })

      expect(result.current.count).toBe(0)
      expect(result.current.isSelected('1')).toBe(false)
    })
  })

  describe('count', () => {
    it('reflects the number of selected ids', () => {
      const { result } = renderHook(() => useMultiSelect({ enableKeyboard: false }))

      expect(result.current.count).toBe(0)

      act(() => {
        result.current.toggle('1')
      })
      expect(result.current.count).toBe(1)

      act(() => {
        result.current.toggle('2')
      })
      expect(result.current.count).toBe(2)

      act(() => {
        result.current.toggle('1')
      })
      expect(result.current.count).toBe(1)
    })
  })

  describe('isSelected', () => {
    it('returns false for ids that have never been added', () => {
      const { result } = renderHook(() => useMultiSelect({ enableKeyboard: false }))

      expect(result.current.isSelected('ghost')).toBe(false)
    })

    it('returns true for currently-selected ids', () => {
      const { result } = renderHook(() => useMultiSelect({ enableKeyboard: false }))

      act(() => {
        result.current.toggle('alpha')
      })

      expect(result.current.isSelected('alpha')).toBe(true)
    })
  })

  describe('keyboard shortcuts', () => {
    function dispatchKey(key: string, options: Partial<KeyboardEventInit> = {}) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
      })
      window.dispatchEvent(event)
      return event
    }

    it('selects all ids on Ctrl+A when enabled', () => {
      const { result } = renderHook(() =>
        useMultiSelect({ enableKeyboard: true, allIds: ['1', '2', '3'] })
      )

      act(() => {
        dispatchKey('a', { ctrlKey: true })
      })

      expect(result.current.count).toBe(3)
    })

    it('clears the selection on Escape', () => {
      const { result } = renderHook(() =>
        useMultiSelect({ enableKeyboard: true, allIds: ['1', '2'] })
      )

      act(() => {
        result.current.selectAll(['1', '2'])
      })
      act(() => {
        dispatchKey('Escape')
      })

      expect(result.current.count).toBe(0)
    })

    it('does not bind shortcuts when keyboard is disabled', () => {
      const { result } = renderHook(() =>
        useMultiSelect({ enableKeyboard: false, allIds: ['1', '2'] })
      )

      act(() => {
        dispatchKey('a', { ctrlKey: true })
      })

      expect(result.current.count).toBe(0)
    })

    it('ignores Ctrl+A when allIds is empty', () => {
      const { result } = renderHook(() =>
        useMultiSelect({ enableKeyboard: true, allIds: [] })
      )

      act(() => {
        dispatchKey('a', { ctrlKey: true })
      })

      expect(result.current.count).toBe(0)
    })

    it('skips Ctrl+A when the event target sits inside an ARIA listbox', () => {
      const { result } = renderHook(() =>
        useMultiSelect({ enableKeyboard: true, allIds: ['1', '2', '3'] })
      )

      const listbox = document.createElement('div')
      listbox.setAttribute('role', 'listbox')
      const option = document.createElement('div')
      listbox.appendChild(option)
      document.body.appendChild(listbox)

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        })
        option.dispatchEvent(event)
      })

      expect(result.current.count).toBe(0)
      listbox.remove()
    })
  })
})
