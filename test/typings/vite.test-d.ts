/// <reference types="msw/vite/client" />

import { network } from 'virtual:msw'
import { http, HttpResponse } from 'msw/http'

it('exposes an environment-neutral network', () => {
  network.configure({
    handlers: [http.get('/resource', () => HttpResponse.text('mocked'))],
    onUnhandledFrame: 'error',
  })
  network.use(http.get('/override', () => HttpResponse.text('override')))
  network.resetHandlers()

  expectTypeOf(network.enable).returns.toEqualTypeOf<void | Promise<void>>()
  expectTypeOf(network.disable).returns.toEqualTypeOf<void | Promise<void>>()

  // @ts-expect-error Handlers must be request or event handlers.
  network.configure({ handlers: ['invalid'] })
  // @ts-expect-error Unknown network option.
  network.configure({ invalid: true })
})

it('types network lifecycle events', () => {
  network.events.on('request:start', (event) => {
    expectTypeOf(event.data.request).toEqualTypeOf<Request>()
  })

  // @ts-expect-error Unknown network event.
  network.events.on('invalid', () => {})
})
