import * as path from 'path'
import { ServerApi, createServer } from '@open-draft/test-server'
import { runBrowserWith } from '../support/runBrowserWith'

let server: ServerApi

beforeAll(async () => {
  server = await createServer((app) => {
    app.get('/posts', (req, res) => {
      return res.status(204).end()
    })
  })
})

afterAll(async () => {
  await server.close()
})

test('handles a 204 status response without Response instance exceptions', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'basic.mocks.ts'),
  )
  let pageError: Error

  runtime.page.on('pageerror', (error) => {
    pageError = error
  })

  const res = await runtime.request({
    url: server.http.makeUrl('/posts'),
  })

  // There must be no such exception:
  // Failed to construct 'Response': Response with null body status cannot have body
  expect(pageError).toBeUndefined()
  expect(res.status()).toBe(204)

  return runtime.cleanup()
})
