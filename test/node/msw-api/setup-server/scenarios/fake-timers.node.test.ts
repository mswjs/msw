import fetch from 'node-fetch'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

const server = setupServer(
  http.get('https://test.mswjs.io/pull', () => {
    return HttpResponse.json({ status: 'pulled' })
  }),
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('tolerates fake timers', async () => {
  vi.useFakeTimers()

  const res = await fetch('https://test.mswjs.io/pull')
  const body = await res.json()

  vi.useRealTimers()

  expect(body).toEqual({ status: 'pulled' })
})
