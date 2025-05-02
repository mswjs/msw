// @vitest-environment node
import { http } from 'msw'
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

it('responds with a mocked error response using "Response.error" shorthand', async () => {
  server.use(
    http.get('https://api.example.com/resource', () => {
      return Response.error()
    }),
  )

  const responseError = await fetch('https://api.example.com/resource')
    .then(() => null)
    .catch((error) => error)

  expect(responseError.name).toBe('TypeError')
  expect(responseError.message).toBe('Failed to fetch')

  // Guard against false positives due to exceptions arising from the library.
  expect(responseError.cause).toBeInstanceOf(Response)
  expect(responseError.cause.type).toBe('error')
  expect(responseError.cause.status).toBe(0)
})
