import * as fs from 'fs'
import * as path from 'path'
import { test, expect } from '../../playwright.extend'

test('supports asynchronous response transformer', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./async-response-transformer.mocks.ts'))

  const res = await fetch('/image')
  const body = await res.body()
  const expectedBuffer = fs.readFileSync(
    path.resolve(__dirname, '../../fixtures/image.jpg'),
  )
  const status = res.status()
  const headers = await res.allHeaders()

  expect(status).toBe(201)
  expect(headers).toHaveProperty('content-type', 'image/jpeg')
  expect(headers).toHaveProperty(
    'content-length',
    expectedBuffer.byteLength.toString(),
  )
  expect(new Uint8Array(body)).toEqual(new Uint8Array(expectedBuffer))
})

test('supports asynchronous default response transformer', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./async-response-transformer.mocks.ts'))

  const res = await fetch('/search', {
    method: 'POST',
  })
  const status = res.status()
  const statusText = res.statusText()
  const headers = await res.allHeaders()

  expect(status).toBe(301)
  expect(statusText).toBe('Custom Status Text')
  expect(headers).toHaveProperty('x-custom', 'yes')
})
