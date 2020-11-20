import * as fs from 'fs'
import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'

test('supports asynchronous response transformer', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'async-response-transformer.mocks.ts'),
  )

  const res = await runtime.request({
    url: `${runtime.origin}/image`,
  })
  const body = await res.buffer()
  const expectedBuffer = fs.readFileSync(
    path.resolve(__dirname, '../../fixtures/image.jpg'),
  )
  const status = res.status()
  const headers = res.headers()

  expect(status).toBe(201)
  expect(headers).toHaveProperty('content-type', 'image/jpeg')
  expect(headers).toHaveProperty(
    'content-length',
    expectedBuffer.byteLength.toString(),
  )
  expect(new Uint8Array(body)).toEqual(new Uint8Array(expectedBuffer))

  return runtime.cleanup()
})
