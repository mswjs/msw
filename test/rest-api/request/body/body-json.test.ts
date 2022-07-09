import * as path from 'path'
import { pageWith } from 'page-with'

function prepareRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'body.mocks.ts'),
  })
}

test('reads request body as json', async () => {
  const runtime = await prepareRuntime()

  const res = await runtime.request('/deprecated', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({ firstName: 'John' })
})

test('reads a single number as json request body', async () => {
  const runtime = await prepareRuntime()

  const res = await runtime.request('/deprecated', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(123),
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual(123)
})
