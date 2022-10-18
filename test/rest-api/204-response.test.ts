import * as path from 'path'
import { pageWith } from 'page-with'
import { ServerApi, createServer } from '@open-draft/test-server'

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
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'basic.mocks.ts'),
  })
  let pageError: Error

  runtime.page.on('pageerror', (error) => {
    pageError = error
  })

  const res = await runtime.request(server.http.makeUrl('/posts'))
  const allHeaders = await res.allHeaders()

  // There must be no such exception:
  // Failed to construct 'Response': Response with null body status cannot have body.
  expect(pageError).toBeUndefined()
  expect(res.status()).toBe(204)
  expect(allHeaders).toHaveProperty('x-powered-by', 'Express')
})
