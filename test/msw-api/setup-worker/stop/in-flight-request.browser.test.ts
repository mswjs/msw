import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../setup/vitest-helpers'

let responseGate = Promise.withResolvers<void>()

const handlers = [
  http.get('*/events/passthrough', async () => {
    await responseGate.promise
    return HttpResponse.text('hello world')
  }),
]
const test = defineNetwork({ handlers })

test.beforeEach(() => {
  responseGate = Promise.withResolvers<void>()
})

test.afterEach(() => {
  responseGate.resolve()
})

test('handles an in-flight request performed before the worker was stopped', async ({
  network,
  testServer,
}) => {
  if (!('stop' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  const requestStart = Promise.withResolvers<void>()
  network.events.on('request:start', () => {
    requestStart.resolve()
  })

  const dataPromise = fetch(testServer.http.url('/events/passthrough')).then(
    (response) => {
      return response.text()
    },
  )

  await requestStart.promise
  const stopPromise = network.stop()
  responseGate.resolve()
  await stopPromise

  await expect(dataPromise).resolves.toBe('hello world')
})

test('bypasses requests made after the worker was stopped', async ({
  network,
  testServer,
}) => {
  if (!('stop' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  await network.stop()
  const response = await fetch(testServer.http.url('/events/passthrough'))

  await expect(response.text()).resolves.toBe('passthrough-response')
})
