import { HttpServer } from '@open-draft/test-server/http'
import { test, expect } from '../playwright.extend'

const server = new HttpServer((app) => {
  // Enable a strict CORS policy on this test server.
  // Requests from the test must use `mode: "no-cors"` to obtain the response.
  app.use('*', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', server.http.url())
    next()
  })

  app.get('/', (req, res) => {
    res.status(200).send('hello')
  })
})

test.beforeAll(async () => {
  await server.listen()
})

test.afterAll(async () => {
  await server.close()
})

test('handles a CORS request with an "opaque" response', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./cors.mocks.ts'))

  const errors = []
  page.on('pageerror', (error) => errors.push(error))

  const res = await fetch(server.http.url(), {
    mode: 'no-cors',
  })

  expect(res.status()).toBe(200)
  expect(await res.text()).toBe('hello')

  expect(errors).toEqual([])
})
