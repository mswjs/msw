// @vitest-environment node
import { HttpResponse, http } from 'msw'
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

it('intercepts the request that fully matches the path', async () => {
  server.use(
    http.get('http://localhost/user/:id?', () =>
      HttpResponse.json({ mocked: true }),
    ),
  )

  const response = await fetch('http://localhost/user/123')
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ mocked: true })
})

it('intercepts the request that partially matches the path', async () => {
  server.use(
    http.get('http://localhost/user/:id?', () =>
      HttpResponse.json({ mocked: true }),
    ),
  )

  const response = await fetch('http://localhost/user')
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ mocked: true })
})
