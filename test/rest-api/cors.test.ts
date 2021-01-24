import * as path from 'path'
import { ServerApi, createServer } from '@open-draft/test-server'
import { runBrowserWith } from '../support/runBrowserWith'

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
  const runtime = await runBrowserWith(path.resolve(__dirname, 'cors.mocks.ts'))

  const errors = []
  runtime.page.on('pageerror', (err) => {
    errors.push(err)
  })

  const res = await runtime.request({
    url: server.http.makeUrl(),
    fetchOptions: {
      mode: 'no-cors',
    },
  })

  expect(res.status()).toBe(200)
  expect(await res.text()).toBe('hello')

  expect(errors).toEqual([])

  return runtime.cleanup()
})
