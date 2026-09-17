import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

type ExpectedResponseBody =
  | {
      status: 'pending' | 'complete'
      count: number
    }
  | {
      status: 'done'
    }

const handlers = [
  http.get<{ maxCount: string }>('*/polling/:maxCount', function* ({ params }) {
    const { maxCount } = params
    let count = 0

    while (count < Number(maxCount)) {
      count += 1

      yield HttpResponse.json({
        status: 'pending',
        count,
      })
    }

    return HttpResponse.json({
      status: 'complete',
      count,
    })
  }),
  http.get<{ maxCount: string }>(
    '*/polling/once/:maxCount',
    function* ({ params }) {
      const { maxCount } = params
      let count = 0

      while (count < Number(maxCount)) {
        count += 1

        yield HttpResponse.json({
          status: 'pending',
          count,
        })
      }

      return HttpResponse.json({
        status: 'complete',
        count,
      })
    },
    { once: true },
  ),
  http.get('*/polling/once/:maxCount', () => {
    return HttpResponse.json({ status: 'done' })
  }),
]

const test = defineNetwork({ handlers })

test('supports a generator function as the response resolver', async ({
  fetch,
}) => {
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
  fetch,
}) => {
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
