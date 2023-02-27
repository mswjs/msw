/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('https://test.mswjs.io/book/:bookId', () => {
    return HttpResponse.json({ title: 'Original title' })
  }),
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('returns a mocked response from the used one-time request handler when restored', async () => {
  server.use(
    rest.get(
      'https://test.mswjs.io/book/:bookId',
      () => {
        return HttpResponse.json({ title: 'Overridden title' })
      },
      { once: true },
    ),
  )

  const firstResponse = await fetch('https://test.mswjs.io/book/abc-123')
  const firstBody = await firstResponse.json()
  expect(firstResponse.status).toBe(200)
  expect(firstBody).toEqual({ title: 'Overridden title' })

  const secondResponse = await fetch('https://test.mswjs.io/book/abc-123')
  const secondBody = await secondResponse.json()
  expect(secondResponse.status).toBe(200)
  expect(secondBody).toEqual({ title: 'Original title' })

  server.restoreHandlers()

  const thirdResponse = await fetch('https://test.mswjs.io/book/abc-123')
  const thirdBody = await thirdResponse.json()
  expect(firstResponse.status).toBe(200)
  expect(thirdBody).toEqual({ title: 'Overridden title' })
})
