/**
 * @note Regression test for Hermes runtime compatibility.
 * Hermes uses a polyfilled `Event` class that does NOT define
 * `stopPropagation` on its prototype, which caused crashes when
 * MSW or its dependencies wrapped it with `new Proxy(event.stopPropagation, ...)`.
 *
 * @see https://github.com/mswjs/msw/issues/2666
 */
import { vi } from 'vitest'

/**
 * A minimal Hermes-like Event polyfill.
 * Hermes's polyfilled `Event` does not define `stopPropagation`
 * or other standard Event methods on its prototype, so accessing
 * `event.stopPropagation` returns `undefined`.
 */
class HermesEvent {
  public type: string
  public bubbles: boolean
  public cancelable: boolean
  public defaultPrevented: boolean

  constructor(
    type: string,
    options?: { bubbles?: boolean; cancelable?: boolean },
  ) {
    this.type = type
    this.bubbles = options?.bubbles ?? false
    this.cancelable = options?.cancelable ?? false
    this.defaultPrevented = false
  }
  // Intentionally NO stopPropagation, stopImmediatePropagation, preventDefault.
}

class HermesMessageEvent extends HermesEvent {
  public data: unknown

  constructor(type: string, init?: { data?: unknown }) {
    super(type)
    this.data = init?.data ?? null
  }
}

vi.stubGlobal('Event', HermesEvent)
vi.stubGlobal('MessageEvent', HermesMessageEvent)

/**
 * Import `setupServer` after stubbing globals so the native entry
 * picks up the Hermes-like Event/MessageEvent polyfills.
 */
const { setupServer } = await import('msw/native')

test('setupServer does not crash in a Hermes-like environment (Event without stopPropagation)', () => {
  expect(() => setupServer()).not.toThrow()
})
