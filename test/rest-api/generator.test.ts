import * as path from 'path'
import { pageWith } from 'page-with'

test('mocks response with a generator as request resolver', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'generator.mocks.ts'),
  })

  const assertRequest = async (expectedBody: any) => {
    const res = await runtime.request(
      'https://test.mswjs.io/polling-endpoint/3',
    )
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
  await assertRequest({ status: 'done' })
})
