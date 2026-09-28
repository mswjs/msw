// @vitest-environment node
import { createTestHttpServer } from '@epic-web/test-server/http'
import { HttpMethods, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen({
    onUnhandledFrame: 'bypass',
  })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

async function forEachMethod(callback: (method: HttpMethods) => unknown) {
  for (const method of Object.values(HttpMethods)) {
    await callback(method)
  }
}

test('matches all requests given no custom path', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      // Responding with "204 No Content" because the "OPTIONS"
      // request returns 204 without an obvious way to override that.
      router.all('*', () => {
        return new Response(null, { status: 204 })
      })
    },
  })
  server.use(
    http.all('*', () => {
      return HttpResponse.text('welcome to the jungle')
    }),
  )

  const responses = await Promise.all(
    Object.values(HttpMethods).reduce<
      Array<Promise<{ method: HttpMethods; response: Response }>>
    >((all, method) => {
      return all.concat(
        [
          httpServer.http.url('/').href,
          httpServer.http.url('/foo').href,
          'https://example.com',
        ].map((url) => {
          return fetch(url, { method }).then((response) => {
            return { method, response }
          })
        }),
      )
    }, []),
  )

  for (const { method, response } of responses) {
    expect(response.status).toBe(200)

    // Responses to HEAD requests never have a body.
    await expect(response.text()).resolves.toEqual(
      method === HttpMethods.HEAD ? '' : 'welcome to the jungle',
    )
  }
})

test('respects custom path when matching requests', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      // Responding with "204 No Content" because the "OPTIONS"
      // request returns 204 without an obvious way to override that.
      router.all('*', () => {
        return new Response(null, { status: 204 })
      })
    },
  })
  server.use(
    http.all(httpServer.http.url('/api/*').href, () => {
      return HttpResponse.text('hello world')
    }),
  )

  // Responses to HEAD requests never have a body.
  const expectedBodyForMethod = (method: HttpMethods) => {
    return method === HttpMethods.HEAD ? '' : 'hello world'
  }

  // Root requests.
  await forEachMethod(async (method) => {
    const response = await fetch(httpServer.http.url('/api/'), { method })
    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toEqual(
      expectedBodyForMethod(method),
    )
  })

  // Nested requests.
  await forEachMethod(async (method) => {
    const response = await fetch(httpServer.http.url('/api/foo'), {
      method,
    })
    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toEqual(
      expectedBodyForMethod(method),
    )
  })

  // Mismatched requests.
  await forEachMethod(async (method) => {
    const response = await fetch(httpServer.http.url('/foo'), { method })
    expect(response.status).toEqual(204)
  })
})
