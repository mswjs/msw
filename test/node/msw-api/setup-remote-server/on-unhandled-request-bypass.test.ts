// @vitest-environment node
import { http } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { spawnTestApp } from './utils'

const remote = setupRemoteServer()

beforeAll(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await remote.listen({
    onUnhandledRequest: 'bypass',
  })
})

afterEach(() => {
  remote.resetHandlers()
})

afterAll(async () => {
  vi.restoreAllMocks()
  await remote.close()
})

it(
  'does not error on the request not handled here and there',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(require.resolve('./use.app.js'), {
      onUnhandledRequest: 'bypass',
    })

    await fetch(new URL('/proxy', testApp.url), {
      headers: {
        location: 'http://localhost/unhandled',
      },
    })

    const unhandledErrorPromise = vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(`\
[MSW] Error: intercepted a request without a matching request handler:

  • GET http://localhost/unhandled

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
    })

    await expect(unhandledErrorPromise).rejects.toThrow()
    expect(console.error).not.toHaveBeenCalled()
  }),
)

it(
  'does not error on the request handled here',
  remote.boundary(async () => {
    remote.use(
      http.get('http://localhost/handled', () => {
        return new Response('handled')
      }),
    )

    await using testApp = await spawnTestApp(require.resolve('./use.app.js'), {
      onUnhandledRequest: 'bypass',
    })

    await fetch(new URL('/proxy', testApp.url), {
      headers: {
        location: 'http://localhost/handled',
      },
    })

    const unhandledErrorPromise = vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(`\
[MSW] Error: intercepted a request without a matching request handler:

• GET http://localhost/handled

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
    })

    await expect(unhandledErrorPromise).rejects.toThrow()
    expect(console.error).not.toHaveBeenCalled()
  }),
)

it(
  'does not error on the request handled there',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(require.resolve('./use.app.js'), {
      onUnhandledRequest: 'bypass',
    })

    await fetch(new URL('/resource', testApp.url))

    const unhandledErrorPromise = vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(`\
[MSW] Error: intercepted a request without a matching request handler:

• GET https://example.com/resource

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
    })

    await expect(unhandledErrorPromise).rejects.toThrow()
    expect(console.error).not.toHaveBeenCalled()
  }),
)
