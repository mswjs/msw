import { test, expect } from '../playwright.extend'
import { HttpServer } from '@open-draft/test-server/http'

const httpServer = new HttpServer((app) => {
  /**
   * @todo Test setup already spawns a single API server.
   * Reuse it instead of creating a new one in tests.
   */
  app.get('/posts', (req, res) => {
    return res.status(204).end()
  })
})

test.beforeAll(async () => {
  await httpServer.listen()
})

test.afterAll(async () => {
  await httpServer.close()
})

test('handles a 204 status response without Response instance exceptions', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./basic.mocks.ts'))

  let pageError: Error

  page.on('pageerror', (error) => {
    pageError = error
  })

  const res = await fetch(httpServer.http.url('/posts'))

  // There must be no such exception:
  // Failed to construct 'Response': Response with null body status cannot have body
  expect(pageError).toBeUndefined()
  expect(res.status()).toBe(204)
})
