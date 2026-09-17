import { defineNetwork, expect } from '../../setup/vitest-helpers'

const test = defineNetwork()

test('handles a CORS request with an "opaque" response', async ({
  page,
  testServer,
}) => {
  const errors: Array<Error> = []
  page.on('pageerror', (error) => errors.push(error))

  const res = await globalThis.fetch(testServer.http.url('/cors'), {
    mode: 'no-cors',
  })

  expect(res.status).toBe(0)
  expect(res.type).toBe('opaque')
  expect(errors).toEqual([])
})
