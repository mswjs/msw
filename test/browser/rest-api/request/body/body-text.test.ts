import { test, expect } from '../../../playwright.extend'

test('reads plain text request body as text', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  const res = await fetch('/text', {
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

test('reads json request body as text', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  const res = await fetch('/text', {
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

test('reads buffer request body as text', async ({
  loadExample,
  page,
  makeUrl,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  page.evaluate(() => {
    return fetch('/text', {
      method: 'POST',
      body: new TextEncoder().encode('hello-world'),
    })
  })
  const res = await page.waitForResponse(makeUrl('/text'))
  const body = await res.text()

  expect(res.status()).toBe(200)
  expect(body).toBe('hello-world')
})

test('reads null request body as empty text', async ({ loadExample, page }) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  const [body, status] = await page.evaluate(() => {
    return fetch('/text', {
      method: 'POST',
      body: null,
    }).then((res) => res.text().then((text) => [text, res.status]))
  })

  expect(status).toBe(200)
  expect(body).toBe('')
})

test('reads undefined request body as empty text', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  const [body, status] = await page.evaluate(() => {
    return fetch('/text', {
      method: 'POST',
      body: undefined,
    }).then((res) => res.text().then((text) => [text, res.status]))
  })

  expect(status).toBe(200)
  expect(body).toBe('')
})
