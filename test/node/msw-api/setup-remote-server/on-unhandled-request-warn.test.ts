// @vitest-environment node
import { http } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { spawnTestApp } from './utils'

const remote = setupRemoteServer()

beforeAll(async () => {
  /**
   * @note Console warnings from the app's context are forwarded
   * as `console.error`. Ignore those for this test.
   */
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await remote.listen({
    onUnhandledRequest: 'warn',
  })
})

afterEach(() => {
  vi.clearAllMocks()
  remote.resetHandlers()
})

afterAll(async () => {
  vi.restoreAllMocks()
  await remote.close()
})

it(
  'warns on the request not handled here and there',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(
      new URL('./use.app.js', import.meta.url),
    )

    await fetch(new URL('/proxy', testApp.url), {
      headers: {
        location: 'http://localhost/unhandled',
      },
    })

    await vi.waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET http://localhost/unhandled

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`)
    })
  }),
)

it(
  'does not warn on the request handled here',
  remote.boundary(async () => {
    remote.use(
      http.get('http://localhost/handled', () => {
        return new Response('handled')
      }),
    )

    await using testApp = await spawnTestApp(
      new URL('./use.app.js', import.meta.url),
    )

    await fetch(new URL('/proxy', testApp.url), {
      headers: {
        location: 'http://localhost/handled',
      },
    })

    const unhandledWarningPromise = vi.waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(`\
[MSW] Warning: intercepted a request without a matching request handler:

• GET http://localhost/handled

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`)
    })

    await expect(unhandledWarningPromise).rejects.toThrow()
    expect(console.warn).not.toHaveBeenCalled()
  }),
)

it(
  'does not warn on the request handled there',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(
      new URL('./use.app.js', import.meta.url),
    )

    await fetch(new URL('/resource', testApp.url))

    const unhandledWarningPromise = vi.waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(`\
[MSW] Warning: intercepted a request without a matching request handler:

• GET https://example.com/resource

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`)
    })

    await expect(unhandledWarningPromise).rejects.toThrow()
    expect(console.warn).not.toHaveBeenCalled()
  }),
)
