import { afterEach, describe, expect, it, vi } from 'vitest'
import { delay, SET_TIMEOUT_MAX_ALLOWED_INT } from './delay'

describe('delay', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('unrefs infinite delays in Node.js', () => {
    const unref = vi.fn()

    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback, ms) => {
      return {
        unref,
      } as ReturnType<typeof setTimeout>
    }) as typeof setTimeout)

    void delay('infinite')

    expect(setTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      SET_TIMEOUT_MAX_ALLOWED_INT,
    )
    expect(unref).toHaveBeenCalledTimes(1)
  })

  it('does not unref finite delays', () => {
    const unref = vi.fn()

    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback, ms) => {
      return {
        unref,
      } as ReturnType<typeof setTimeout>
    }) as typeof setTimeout)

    void delay(500)

    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 500)
    expect(unref).not.toHaveBeenCalled()
  })
})
