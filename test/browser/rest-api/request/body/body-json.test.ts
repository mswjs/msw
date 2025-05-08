import { test, expect } from '../../../playwright.extend'

test('reads request body as json', async ({ loadExample, fetch, page }) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  const res = await fetch('/json', {
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

test('reads a single number as json request body', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  const res = await fetch('/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(123),
  })
  const json = await res.json()

  expect(res.status()).toBe(200)
  expect(json).toEqual(123)
})

test('reads request body using json() method', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  const res = await fetch('/json', {
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

test('reads array buffer request body using json() method', async ({
  loadExample,
  fetch,
  page,
  makeUrl,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'))

  page.evaluate(() => {
    return fetch('/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: new TextEncoder().encode(
        JSON.stringify({
          firstName: 'John',
        }),
      ),
    })
  })
  const res = await page.waitForResponse(makeUrl('/json'))
  const json = await res.json()

  expect(res.status()).toBe(200)
  expect(json).toEqual({ firstName: 'John' })
})
