import * as fs from 'fs'
import * as path from 'path'
import { pageWith } from 'page-with'

test('supports asynchronous response transformer', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'async-response-transformer.mocks.ts'),
  })

  const res = await runtime.request('/image')
  const body = await res.body()
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
})

test('supports asynchronous default response transformer', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'async-response-transformer.mocks.ts'),
  })

  const res = await runtime.request('/search', {
    method: 'POST',
  })
  const status = res.status()
  const statusText = res.statusText()
  const headers = res.headers()

  expect(status).toBe(301)
  expect(statusText).toBe('Custom Status Text')
  expect(headers).toHaveProperty('x-custom', 'yes')
})
