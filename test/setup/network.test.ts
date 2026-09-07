import { http, HttpResponse } from 'msw'
import { expect, test } from './vitest'

test('exposes the operational network instance as-is', async ({
  network,
  testServer,
}) => {
  const resourceUrl = testServer.http.url('/resource')

  network.use(
    http.get(resourceUrl.href, () => {
      return HttpResponse.json({ mocked: true })
    }),
  )

  const response = await fetch(resourceUrl)

  expect.soft(network.use).toBeTypeOf('function')
  expect.soft(network.resetHandlers).toBeTypeOf('function')
  expect.soft(network.restoreHandlers).toBeTypeOf('function')
  await expect.soft(response.json()).resolves.toEqual({ mocked: true })
})

test('resets runtime handlers before each test', async ({ testServer }) => {
  const response = await fetch(testServer.http.url('/resource'))
  await expect(response.text()).resolves.toBe('original-response')
})
