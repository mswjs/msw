/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('https://test.mswjs.io/user', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(
      'https://api.github.com/users/octocat',
    )

    return res(
      ctx.json({
        name: originalResponse.name,
        location: originalResponse.location,
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
    const headers = res.headers
    const body = await res.json()

    expect(status).toBe(200)
    expect(headers).toHaveProperty('x-powered-by', 'msw')
    expect(body).toEqual({
      name: 'The Octocat',
      location: 'San Francisco',
      mocked: true,
    })
  })
})
