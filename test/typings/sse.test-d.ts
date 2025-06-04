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
  sse<{ message: number; custom: string; other: boolean }>(
    '/stream',
    ({ client }) => {
      /**
       * @note TS 5.0 reports errors at different locations
       * to satisfy a wide range of TS versions in type tests formatting gets disabled here
       * so that @ts-expect-error can assert the reported errors regardless of the location
       * see: https://github.com/mswjs/msw/pull/2521#issuecomment-2931733565
       */
      // prettier-ignore-start
      client.send({
        data: 123,
      })
      // When no explicit "event" key is provided,
      // threat it as if event was set to "message".
      // @ts-expect-error Unexpected data type for "message" event.
      client.send({ data: 'goodbye' })

      client.send({
        event: 'message',
        data: 123,
      })
      // @ts-expect-error Unexpected data type for "message" event.
      client.send({ event: 'message', data: 'invalid' })
      // @ts-expect-error Unexpected data type for "message" event.
      client.send({ event: 'message', data: 'goodbye' })

      client.send({
        event: 'custom',
        data: 'goodbye',
      })
      // @ts-expect-error Unexpected data type for "custom" event
      client.send({ event: 'custom', data: 123 })

      // Sending unknown events must be forbidden
      // if the EventMap type argument was provided.
      // @ts-expect-error Unknown event type "unknown".
      client.send({ event: 'invalid', data: 123 })

      // boolean is only allowed for "other" event
      // @ts-expect-error
      client.send({ event: 'custom', data: true })

      // boolean is only allowed for "other" event
      // @ts-expect-error
      client.send({ event: 'custom' as 'custom' | 'other', data: true })

      // should error when required data is missing
      // @ts-expect-error
      client.send({ event: 'other' })

      // prettier-ignore-end
    },
  )
})

it('supports optional event data', () => {
  sse<{ maybe?: string }>('/stream', ({ client }) => {
    // No data is fine because data is optional.
    client.send({ event: 'maybe' })

    // Allows explicit undefined as optional data.
    client.send({ event: 'maybe', data: undefined })

    // Data is still validated even if optional.
    client.send({ event: 'maybe', data: 'hello' })
    client.send({
      event: 'maybe',
      // @ts-expect-error Invalid data type.
      data: 123,
    })
  })
})

it('supports sending custom retry duration', () => {
  sse<{ custom: 'goodbye' }>('/stream', ({ client }) => {
    /**
     * @note TS 5.0 reports errors at different locations
     * to satisfy a wide range of TS versions in type tests formatting gets disabled here
     * so that @ts-expect-error can assert the reported errors regardless of the location
     * see: https://github.com/mswjs/msw/pull/2521#issuecomment-2931733565
     */
    // prettier-ignore-start
    client.send({ retry: 1000 })

    // @ts-expect-error Cannot use message properties with "retry".
    client.send({ retry: 1000, id: '1' })
    // @ts-expect-error Cannot use message properties with "retry".
    client.send({ retry: 1000, data: 'hello' })
    // @ts-expect-error Cannot use message properties with "retry".
    client.send({ retry: 1000, event: 'custom', data: 'goodbye' })
    // prettier-ignore-end
  })
})
