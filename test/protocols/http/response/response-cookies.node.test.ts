// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('supports mocking a response cookie', async () => {
  server.use(
    http.get('*/resource', () => {
      return new HttpResponse(null, {
        headers: {
          'Set-Cookie': 'a=1',
        },
      })
    }),
  )

  const response = await fetch('http://localhost/resource')
  expect(response.headers.get('Set-Cookie')).toBe('a=1')
})

it('supports mocking multiple response cookies', async () => {
  server.use(
    http.get('*/resource', () => {
      return new HttpResponse(null, {
        headers: [
          ['Set-Cookie', 'a=1'],
          ['Set-Cookie', 'b=2'],
        ],
      })
    }),
  )

  const response = await fetch('http://localhost/resource')
  expect(response.headers.get('Set-Cookie')).toBe('a=1, b=2')
})

it('returns response cookies for a different domain', async () => {
  const cookie = 'sessionId=abc-123; Domain=example.com; Path=/'
  server.use(
    http.get('http://localhost/resource', () => {
      return new HttpResponse(null, {
        headers: { 'Set-Cookie': cookie },
      })
    }),
  )

  const response = await fetch('http://localhost/resource')

  expect.soft(response.status).toBe(200)
  expect.soft(response.headers.getSetCookie()).toEqual<Array<string>>([cookie])
})
