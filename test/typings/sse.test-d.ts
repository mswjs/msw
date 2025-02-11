import { it } from 'vitest'
import { sse } from 'msw/browser'

/**
 * @note Define the global property to simulate an EventSource-compatible environment.
 * MSW checks for that and throws to prevent incorrect usage.
 */
Object.defineProperty(globalThis, 'EventSource', { value: () => {} })

it('supports custom event map type argument', () => {
  sse<{ myevent: string }>('/stream', ({ client }) => {
    client.send({
      event: 'myevent',
      data: 'hello',
    })

    client.send({
      // @ts-expect-error Unknown event type "unknown".
      event: 'unknown',
      data: 'hello',
    })
  })
})

it('supports event map type argument for unnamed events', () => {
  sse<{ message: number; custom: 'goodbye' }>('/stream', ({ client }) => {
    client.send({
      data: 123,
    })
    client.send({
      // @ts-expect-error Unexpected data type for "message" event.
      data: 'goodbye',
    })

    client.send({
      event: 'custom',
      data: 'goodbye',
    })
    client.send({
      event: 'custom',
      // @ts-expect-error Unexpected data type for "custom" event.
      data: 'invalid',
    })
  })
})
