import { test, expect } from '../playwright.extend'

type ExpectedResponseBody =
  | {
      status: 'pending' | 'complete'
      count: number
    }
  | {
      status: 'done'
    }

test('supports a generator function as the response resolver', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./generator.mocks.ts'))

  const assertRequest = async (expectedBody: ExpectedResponseBody) => {
    const res = await fetch('/polling/3')
    const body = await res.json()
    expect(res.fromServiceWorker()).toBe(true)
    expect(res.status()).toBe(200)
    expect(body).toEqual(expectedBody)
  }

  await assertRequest({ status: 'pending', count: 1 })
  await assertRequest({ status: 'pending', count: 2 })
  await assertRequest({ status: 'pending', count: 3 })
  await assertRequest({ status: 'complete', count: 3 })
  await assertRequest({ status: 'complete', count: 3 })
  await assertRequest({ status: 'complete', count: 3 })
})

test('supports one-time handlers with the generator as the response resolver', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./generator.mocks.ts'))

  const assertRequest = async (expectedBody: ExpectedResponseBody) => {
    const res = await fetch('/polling/once/3')
    const body = await res.json()
    expect(res.fromServiceWorker()).toBe(true)
    expect(res.status()).toBe(200)
    expect(body).toEqual(expectedBody)
  }

  await assertRequest({ status: 'pending', count: 1 })
  await assertRequest({ status: 'pending', count: 2 })
  await assertRequest({ status: 'pending', count: 3 })
  await assertRequest({ status: 'complete', count: 3 })
  await assertRequest({ status: 'done' })
  await assertRequest({ status: 'done' })
})
