/**
 * @jest-environment jsdom
 */
import * as path from 'path'
import { pageWith } from 'page-with'

test('responds with a JSON response body', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'body-json.mocks.ts'),
  })

  const res = await runtime.request('/json')

  const headers = await res.allHeaders()
  expect(headers).toHaveProperty('content-type', 'application/json')

  const json = await res.json()
  expect(json).toEqual({ firstName: 'John' })
})

test('responds with a single number JSON response body', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'body-json.mocks.ts'),
  })

  const res = await runtime.request('/number')

  const headers = await res.allHeaders()
  expect(headers).toHaveProperty('content-type', 'application/json')

  const json = await res.json()
  expect(json).toEqual(123)
})
