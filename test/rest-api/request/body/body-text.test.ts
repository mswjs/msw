import * as path from 'path'
import { pageWith } from 'page-with'

function prepareRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'body.mocks.ts'),
  })
}

test('reads plain text request body as text', async () => {
  const runtime = await prepareRuntime()
  const res = await runtime.request('/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: 'hello-world',
  })
  const body = await res.text()

  expect(res.status()).toBe(200)
  expect(body).toBe('hello-world')
})

test('reads json request body as text', async () => {
  const runtime = await prepareRuntime()
  const res = await runtime.request('/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })
  const body = await res.text()

  expect(res.status()).toBe(200)
  expect(body).toBe(`{"firstName":"John"}`)
})

test('reads array buffer request body as text', async () => {
  const runtime = await prepareRuntime()

  runtime.page.evaluate(() => {
    return fetch('/text', {
      method: 'POST',
      body: new TextEncoder().encode('hello-world'),
    })
  })
  const res = await runtime.page.waitForResponse(runtime.makeUrl('/text'))
  const body = await res.text()

  expect(res.status()).toBe(200)
  expect(body).toBe('hello-world')
})
