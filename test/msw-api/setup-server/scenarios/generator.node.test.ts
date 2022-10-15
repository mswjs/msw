import fetch from 'node-fetch'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get<{ maxCount: string }>('/polling/:maxCount', function* ({ params }) {
    const maxCount = parseInt(params.maxCount)
    let count = 0

    while (count < maxCount) {
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

  rest.get<{ maxCount: string }>(
    '/polling/once/:maxCount',
    function* ({ params }) {
      const maxCount = parseInt(params.maxCount)
      let count = 0

      while (count < maxCount) {
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
  rest.get<{ maxCount: string }>('/polling/once/:maxCount', () => {
    return HttpResponse.json({ status: 'done' })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('supports generator as the response resolver', async () => {
  type ExpectedResponseBody = {
    status: 'pending' | 'complete'
    count: number
  }

  const assertRequest = async (expectedBody: ExpectedResponseBody) => {
    const res = await fetch('http://localhost/polling/3')

    expect(res.status).toBe(200)
    expect(res.headers.get('x-powered-by')).toBe('msw')
    expect(await res.json()).toEqual(expectedBody)
  }

  await assertRequest({ status: 'pending', count: 1 })
  await assertRequest({ status: 'pending', count: 2 })
  await assertRequest({ status: 'pending', count: 3 })

  // Once the generator is done, any subsequent requests
  // return the last mocked response.
  await assertRequest({ status: 'complete', count: 3 })
  await assertRequest({ status: 'complete', count: 3 })
  await assertRequest({ status: 'complete', count: 3 })
})

test('supports one-time handlers with the generator as the response resolver', async () => {
  type ExpectedResponseBody =
    | {
        status: 'pending' | 'complete'
        count: number
      }
    | { status: 'done' }

  const assertRequest = async (expectedBody: ExpectedResponseBody) => {
    const res = await fetch('http://localhost/polling/once/3')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(res.headers.get('x-powered-by')).toBe('msw')
    expect(body).toEqual(expectedBody)
  }

  await assertRequest({ status: 'pending', count: 1 })
  await assertRequest({ status: 'pending', count: 2 })
  await assertRequest({ status: 'pending', count: 3 })
  await assertRequest({ status: 'complete', count: 3 })

  // Since the last response from the one-time handler
  // has been returned, it falls through to the next one.
  await assertRequest({ status: 'done' })
  await assertRequest({ status: 'done' })
})
