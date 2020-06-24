import fetch from 'node-fetch'
import { setupServer } from 'msw/node'
import { rest } from 'msw'

const server = setupServer(
  rest.get('https://test.mswjs.io/pull', (req, res, ctx) => {
    return res(ctx.json({ status: 'pulled' }))
  }),
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('tolerates fake timers', async () => {
  jest.useFakeTimers()

  const res = await fetch('https://test.mswjs.io/pull')
  const body = await res.json()

  jest.useRealTimers()

  expect(body).toEqual({ status: 'pulled' })
})
