// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://localhost/books', () => {
    return HttpResponse.json({ title: 'Original title' })
  }),
)

beforeAll(() => {
  vi.spyOn(global.console, 'warn').mockImplementation(() => {})
  server.listen()
})

afterEach(() => {
  vi.clearAllMocks()
  server.resetHandlers()
})

afterAll(() => {
  vi.restoreAllMocks()
  server.close()
})

test('removes all runtime request handlers when resetting without explicit next handlers', async () => {
  server.use(
    http.post('http://localhost/resource', () => {
      return HttpResponse.json({ accepted: true })
    }),
  )

  {
    // Request handlers added on runtime affect the network communication.
    const response = await fetch('http://localhost/resource', {
      method: 'POST',
    })
    expect.soft(response.status).toBe(200)
    await expect.soft(response.json()).resolves.toEqual({ accepted: true })
  }

  // Once reset, all the runtime request handlers are removed.
  server.resetHandlers()

  {
    const hadError = await fetch('http://localhost/resource', {
      method: 'POST',
    }).then(
      () => expect.fail('Request must not succeed'),
      () => true,
    )
    expect(hadError).toBe(true)
  }

  {
    // Initial request handlers (given to `setupServer`) are not affected.
    const response = await fetch('http://localhost/books')
    expect.soft(response.status).toBe(200)
    await expect
      .soft(response.json())
      .resolves.toEqual({ title: 'Original title' })
  }
})

test('replaces all handlers with the explicit next runtime handlers upon reset', async () => {
  server.use(
    http.post('http://localhost/resource', () => {
      return HttpResponse.json({ accepted: true })
    }),
  )

  // Once reset with explicit next request handlers,
  // replaces all present request handlers with those.
  server.resetHandlers(
    http.get('http://localhost/numbers', () => {
      return HttpResponse.json([1, 2, 3])
    }),
  )

  {
    const hadError = await fetch('http://localhost/resource', {
      method: 'POST',
    }).then(
      () => expect.fail('Request must not succeed'),
      () => true,
    )
    expect(hadError).toBe(true)
  }

  {
    const hadError = await fetch('http://localhost/books', {
      method: 'POST',
    }).then(
      () => expect.fail('Request must not succeed'),
      () => true,
    )
    expect(hadError).toBe(true)
  }

  {
    const response = await fetch('http://localhost/numbers')
    expect.soft(response.status).toBe(200)
    await expect.soft(response.json()).resolves.toEqual([1, 2, 3])
  }
})
