import fetch from 'node-fetch'
import { setupServer } from 'msw/node'
import { HttpResponse, rest } from 'msw'

const server = setupServer(
  rest.get('https://test.mswjs.io/pull', () => {
    return HttpResponse.json({ status: 'pulled' })
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
