import * as fs from 'fs'
import * as path from 'path'
import { pageWith } from 'page-with'
import { createServer, ServerApi } from '@open-draft/test-server'

const imageBuffer = fs.readFileSync(
  path.resolve(__dirname, '../../../fixtures/image.jpg'),
)

let httpServer: ServerApi

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'body-binary.mocks.ts'),
  })
}

beforeAll(async () => {
  httpServer = await createServer((app) => {
    app.get('/image', (req, res) => {
      res.type('jpg')
      res.end(imageBuffer, 'binary')
    })
  })
})

afterAll(async () => {
  await httpServer.close()
})

test('responds with a mocked binary response body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/images/abc-123')
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.body()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(new Uint8Array(body)).toEqual(new Uint8Array(imageBuffer))
})

test('responds with an original binary response body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request(httpServer.http.makeUrl('/image'))
  const status = res.status()
  const headers = res.headers()
  const body = await res.body()

  expect(status).toEqual(200)
  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(new Uint8Array(body)).toEqual(new Uint8Array(imageBuffer))
})
