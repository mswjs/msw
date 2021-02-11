import * as path from 'path'
import { pageWith } from 'page-with'
import { ServerApi, createServer } from '@open-draft/test-server'

let server: ServerApi

beforeAll(async () => {
  server = await createServer((app) => {
    // Enable a strict CORS policy on this test server.
    // Requests from the test must use `mode: "no-cors"` to obtain the response.
    app.use('*', (req, res, next) => {
      res.set('Access-Control-Allow-Origin', server.http.makeUrl())
      next()
    })

    app.get('/', (req, res) => {
      res.status(200).send('hello')
    })
  })
})

afterAll(async () => {
  await server.close()
})

test('handles a CORS request with an "opaque" response', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'cors.mocks.ts'),
  })

  const errors = []
  runtime.page.on('pageerror', (error) => {
    errors.push(error)
  })

  const res = await runtime.request(server.http.makeUrl(), {
    mode: 'no-cors',
  })

  expect(res.status()).toBe(200)
  expect(await res.text()).toBe('hello')

  expect(errors).toEqual([])
})
