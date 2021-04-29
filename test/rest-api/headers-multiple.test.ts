import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'headers-multiple.mocks.ts'),
  })
}

test('receives all headers from the request header with multiple values', async () => {
  const runtime = await createRuntime()

  const headers = new Headers({ 'x-header': 'application/json' })
  headers.append('x-header', 'application/hal+json')

  const res = await runtime.request('https://test.mswjs.io', {
    method: 'POST',
    headers,
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toEqual(200)
  expect(body).toEqual({
    'x-header': 'application/json,application/hal+json',
  })
})

test('supports setting a header with multiple values on the mocked response', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('https://test.mswjs.io')
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toEqual(200)
  expect(headers).toHaveProperty('accept', 'application/json, image/png')
  expect(body).toEqual({
    mocked: true,
  })
})
