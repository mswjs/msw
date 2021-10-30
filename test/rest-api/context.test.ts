import * as path from 'path'
import { pageWith } from 'page-with'

test('composes various context utilities into a valid mocked response', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'context.mocks.ts'),
  })

  const res = await runtime.request('https://test.mswjs.io/')
  const headers = res.headers()
  const body = await res.json()

  expect(res.status()).toEqual(201)
  expect(res.statusText()).toEqual('Yahoo!')
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(headers).toHaveProperty('accept', 'foo/bar')
  expect(headers).toHaveProperty('custom-header', 'arbitrary-value')
  expect(body).toEqual({
    mocked: true,
  })
})
