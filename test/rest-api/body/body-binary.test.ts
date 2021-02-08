import * as fs from 'fs'
import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'

test('responds with a given binary body', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'body-binary.mocks.ts'),
  )

  const res = await runtime.request({
    url: runtime.makeUrl('/images/abc-123'),
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.buffer()

  const expectedBuffer = fs.readFileSync(
    path.resolve(__dirname, '../../fixtures/image.jpg'),
  )

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(new Uint8Array(body)).toEqual(new Uint8Array(expectedBuffer))

  return runtime.cleanup()
})
