import { delay, http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../setup/vitest-helpers'

const handlers = [
  http.get('*/events/passthrough', async () => {
    await delay(500)
    return HttpResponse.text('hello world')
  }),
]
const test = defineNetwork({ handlers })

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
  await network.stop()

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
