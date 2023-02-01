import { test, expect } from '../../../playwright.extend'

test('reads request body as array buffer', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  const res = await fetch('/json', {
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

test('reads buffer request body as array buffer', async ({
  loadExample,
  fetch,
  page,
  makeUrl,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  page.evaluate(() => {
    return fetch('/json', {
      method: 'POST',
      body: new TextEncoder().encode(JSON.stringify({ firstName: 'John' })),
    })
  })
  const res = await page.waitForResponse(makeUrl('/json'))
  const body = await res.body()

  expect(res.status()).toBe(200)
  expect(body).toEqual(Buffer.from(JSON.stringify({ firstName: 'John' })))
})

test('reads null request body as empty array buffer', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  const [body, status] = await page.evaluate(() => {
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

test('reads undefined request body as empty array buffer', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'))
  const [body, status] = await page.evaluate(() => {
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
