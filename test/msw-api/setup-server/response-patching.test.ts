/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('https://test.mswjs.io/user', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch('https://httpbin.org/get')

    return res(
      ctx.json({
        url: originalResponse.url,
        mocked: true,
      }),
    )
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('given mocked and original requests differ', () => {
  it('should return a combination of mocked and original responses', async () => {
    const res = await fetch('https://test.mswjs.io/user')
    const status = res.status
    const body = await res.json()

    expect(status).toBe(200)
    expect(body).toEqual({
      url: 'https://httpbin.org/get',
      mocked: true,
    })
  })
})
