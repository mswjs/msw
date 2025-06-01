import { it } from 'vitest'
import { sse } from 'msw/browser'

/**
 * @note Define the global property to simulate an EventSource-compatible environment.
 * MSW checks for that and throws to prevent incorrect usage.
 */
Object.defineProperty(global, 'EventSource', { value: () => {} })

it('supports sending anything without an explicit event map type', () => {
  sse('/stream', ({ client }) => {
    client.send({ data: 123 })
    client.send({ data: 'hello' })
  })
})

it('supports an optional "id" property', () => {
  sse('/stream', ({ client }) => {
    client.send({ id: '1', data: 'hello' })
  })
  sse<{ message: 'greeting' }>('/stream', ({ client }) => {
    client.send({ id: '2', data: 'greeting' })
  })
  sse<{ custom: 'goodbye' }>('/stream', ({ client }) => {
    client.send({
      id: '2',
      event: 'custom',
      data: 'goodbye',
    })
  })
})

it('supports custom event map type', () => {
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

    client.send({
      /**
       * @note Sending anonymous events ("message" events)
       * must still accept any data type unless narrowed down
       * in the event map by the "message" key.
       */
      data: 'anything',
    })
  })
})

it('supports event map type argument for unnamed events', () => {
  sse<{ message: number; custom: 'goodbye' }>('/stream', ({ client }) => {
    client.send({
      data: 123,
    })
    client.send({
      // When no explicit "event" key is provided,
      // threat it as if event was set to "message".
      // @ts-expect-error Unexpected data type for "message" event.
      data: 'goodbye',
    })

    client.send({
      event: 'message',
      data: 123,
    })
    client.send({
      event: 'message',
      // @ts-expect-error Unexpected data type for "message" event.
      data: 'invalid',
    })
    client.send({
      event: 'message',
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
    client.send({
      event: 'custom',
      // @ts-expect-error Unexpected data type for "custom" event
      data: 123,
    })

    client.send({
      // Sending unknown events must be forbidden
      // if the EventMap type argument was provided.
      // @ts-expect-error Unknown event type "unknown".
      event: 'invalid',
      data: 123,
    })
  })
})

it('supports sending custom retry duration', () => {
  sse<{ custom: 'goodbye' }>('/stream', ({ client }) => {
    client.send({
      // "retry" must be the only property on the message.
      retry: 1000,
    })

    client.send({
      retry: 1000,
      // @ts-expect-error No properties are allowed.
      id: '1',
    })
    client.send({
      retry: 1000,
      // @ts-expect-error No properties are allowed.
      data: 'hello',
    })
    client.send({
      retry: 1000,
      // @ts-expect-error No properties are allowed.
      event: 'custom',
      data: 'goodbye',
    })
  })
})
