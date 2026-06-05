import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@/tests/helpers/test-utils'
import { SpectrumVisualizer } from '@/components/player/SpectrumVisualizer'

const requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback): number => {
  void callback
  return 1
})
const cancelAnimationFrameMock = vi.fn()

function installCanvasMock() {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    scale: vi.fn(),
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
  })) as unknown as HTMLCanvasElement['getContext']
}

describe('SpectrumVisualizer', () => {
  beforeEach(() => {
    cleanup()
    installCanvasMock()
    requestAnimationFrameMock.mockReset()
    cancelAnimationFrameMock.mockReset()
    requestAnimationFrameMock.mockImplementation(() => 1)
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  test('does not keep scheduling frames when paused without analyser data', () => {
    render(<SpectrumVisualizer analyser={null} isPlaying={false} />)

    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)
    const draw = requestAnimationFrameMock.mock.calls[0]?.[0]
    expect(draw).toBeTypeOf('function')

    draw?.(0)

    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)
  })
})
