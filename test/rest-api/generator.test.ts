import * as path from 'path'
import { pageWith } from 'page-with'

type ExpectedResponseBody =
  | {
      status: 'pending' | 'complete'
      count: number
    }
  | {
      status: 'done'
    }

test('supports a generator function as the response resolver', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'generator.mocks.ts'),
  })

  const assertRequest = async (expectedBody: ExpectedResponseBody) => {
    const res = await runtime.request('/polling/3')
    const body = await res.json()
    expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
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

test('supports one-time handlers with the generator as the response resolver', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'generator.mocks.ts'),
  })

  const assertRequest = async (expectedBody: ExpectedResponseBody) => {
    const res = await runtime.request('/polling/once/3')
    const body = await res.json()
    expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
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
