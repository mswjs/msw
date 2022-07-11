import * as path from 'path'
import { pageWith } from 'page-with'

function prepareRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'body.mocks.ts'),
  })
}

test('reads request body as array buffer', async () => {
  const runtime = await prepareRuntime()

  const res = await runtime.request('/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })
  const body = await res.body()

  expect(res.status()).toBe(200)
  expect(body).toEqual(Buffer.from(JSON.stringify({ firstName: 'John' })))
})

test('reads buffer request body as array buffer', async () => {
  const runtime = await prepareRuntime()

  runtime.page.evaluate(() => {
    return fetch('/json', {
      method: 'POST',
      body: new TextEncoder().encode(JSON.stringify({ firstName: 'John' })),
    })
  })
  const res = await runtime.page.waitForResponse(runtime.makeUrl('/json'))
  const body = await res.body()

  expect(res.status()).toBe(200)
  expect(body).toEqual(Buffer.from(JSON.stringify({ firstName: 'John' })))
})

test('reads null request body as empty array buffer', async () => {
  const runtime = await prepareRuntime()
  const [body, status] = await runtime.page.evaluate(() => {
    return fetch('/arrayBuffer', {
      method: 'POST',
      body: null,
    }).then((res) =>
      res
        .arrayBuffer()
        .then((body) => [new TextDecoder().decode(body), res.status]),
    )
  })

  expect(status).toBe(200)
  expect(body).toBe('')
})

test('reads undefined request body as empty array buffer', async () => {
  const runtime = await prepareRuntime()
  const [body, status] = await runtime.page.evaluate(() => {
    return fetch('/arrayBuffer', {
      method: 'POST',
      body: undefined,
    }).then((res) =>
      res
        .arrayBuffer()
        .then((body) => [new TextDecoder().decode(body), res.status]),
    )
  })

  expect(status).toBe(200)
  expect(body).toBe('')
})
