import * as path from 'path'
import { pageWith } from 'page-with'

function prepareRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'body.mocks.ts'),
  })
}

test('reads request body using json() method', async () => {
  const runtime = await prepareRuntime()

  const res = await runtime.request('/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })
  const json = await res.json()

  expect(res.status()).toBe(200)
  expect(json).toEqual({ firstName: 'John' })
})

test('reads array buffer request body using json() method', async () => {
  const runtime = await prepareRuntime()

  runtime.page.evaluate(() => {
    debugger
    return fetch('/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: new TextEncoder().encode(JSON.stringify({ firstName: 'John' })),
    })
  })
  const res = await runtime.page.waitForResponse(runtime.makeUrl('/json'))
  const json = await res.json()

  expect(res.status()).toBe(200)
  expect(json).toEqual({ firstName: 'John' })
})
