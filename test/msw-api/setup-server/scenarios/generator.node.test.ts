import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get<never, { maxCount: string }>(
    '/polling/:maxCount',
    function* (req, res, ctx) {
      const maxCount = parseInt(req.params.maxCount)
      let count = 0

      while (count < maxCount) {
        count += 1
        yield res(
          ctx.json({
            status: 'pending',
            count,
          }),
        )
      }

      return res(
        ctx.json({
          status: 'complete',
          count,
        }),
      )
    },
  ),

  rest.get<never, { maxCount: string }>(
    '/polling/once/:maxCount',
    function* (req, res, ctx) {
      const maxCount = parseInt(req.params.maxCount)
      let count = 0

      while (count < maxCount) {
        count += 1
        yield res(
          ctx.json({
            status: 'pending',
            count,
          }),
        )
      }

      return res.once(
        ctx.json({
          status: 'complete',
          count,
        }),
      )
    },
  ),
  rest.get<never, { maxCount: string }>(
    '/polling/once/:maxCount',
    (req, res, ctx) => {
      return res(ctx.json({ status: 'done' }))
    },
  ),
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
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(res.headers.get('x-powered-by')).toEqual('msw')
    expect(body).toEqual(expectedBody)
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
    expect(res.headers.get('x-powered-by')).toEqual('msw')
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
