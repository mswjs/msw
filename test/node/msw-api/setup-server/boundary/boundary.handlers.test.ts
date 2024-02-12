/**
 * @vitest-environment node
 */
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('https://example.com', () => {
    return HttpResponse.json({ name: 'John' })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it.concurrent(
  'treats higher scope handlers as initial handlers',
  server.boundary(async () => {
    expect(
      await await fetch('https://example.com').then((response) =>
        response.json(),
      ),
    ).toEqual({ name: 'John' })

    server.use(
      http.get('https://example.com', () => {
        return HttpResponse.json({ override: true })
      }),
    )
    expect(
      await await fetch('https://example.com').then((response) =>
        response.json(),
      ),
    ).toEqual({ override: true })
  }),
)

it.concurrent(
  'resets the runtime handlers to the initial handlers',
  server.boundary(async () => {
    server.use(
      http.get('https://example.com', () => {
        return HttpResponse.json({ override: true })
      }),
    )
    expect(
      await await fetch('https://example.com').then((response) =>
        response.json(),
      ),
    ).toEqual({ override: true })

    server.resetHandlers()

    expect(
      await await fetch('https://example.com').then((response) =>
        response.json(),
      ),
    ).toEqual({ name: 'John' })
  }),
)

it.concurrent(
  'treats the higher boundary handlers as initial handlers for nested boundary',
  server.boundary(async () => {
    server.use(
      http.get('https://example.com', () => {
        return HttpResponse.json({ override: true })
      }),
    )

    await server.boundary(async () => {
      expect(
        await await fetch('https://example.com').then((response) =>
          response.json(),
        ),
      ).toEqual({ override: true })

      server.resetHandlers()

      // Reset does nothing at this point because no runtime
      // request handlers were added within this boundary.
      expect(
        await await fetch('https://example.com').then((response) =>
          response.json(),
        ),
      ).toEqual({ override: true })

      server.use(
        http.get('https://example.com', () => {
          return HttpResponse.json({ nested: true })
        }),
      )

      expect(
        await await fetch('https://example.com').then((response) =>
          response.json(),
        ),
      ).toEqual({ nested: true })
    })
  }),
)
