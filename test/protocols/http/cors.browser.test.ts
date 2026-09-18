import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

const test = defineTestNetwork()

test('handles a CORS request with an "opaque" response', async ({
  page,
  testServer,
}) => {
  const errors: Array<Error> = []
  page.on('pageerror', (error) => errors.push(error))

  const response = await globalThis.fetch(testServer.http.url('/cors'), {
    mode: 'no-cors',
  })

  expect(response.status).toBe(0)
  expect(response.type).toBe('opaque')
  expect(errors).toEqual([])
})
