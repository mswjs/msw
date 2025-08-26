// @vitest-environment node
import { http } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { spawnTestApp } from './utils'

const remote = setupRemoteServer()
const onUnhandledRequestCallback = vi.fn()

beforeAll(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await remote.listen({
    onUnhandledRequest: onUnhandledRequestCallback,
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
  'calls the custom callback on the request not handled here and there',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(
      new URL('./use.app.js', import.meta.url),
      {
        onUnhandledRequest: 'bypass',
      },
    )

    await fetch(new URL('/proxy', testApp.url), {
      headers: {
        location: 'http://localhost/unhandled',
      },
    })

    await vi.waitFor(() => {
      expect(onUnhandledRequestCallback).toHaveBeenCalledOnce()
    })
    expect(console.warn).not.toHaveBeenCalled()
  }),
)

it(
  'does not call the custom callback on the request handled here',
  remote.boundary(async () => {
    remote.use(
      http.get('http://localhost/handled', () => {
        return new Response('handled')
      }),
    )

    await using testApp = await spawnTestApp(
      new URL('./use.app.js', import.meta.url),
      {
        onUnhandledRequest: 'bypass',
      },
    )

    await fetch(new URL('/proxy', testApp.url), {
      headers: {
        location: 'http://localhost/handled',
      },
    })

    const unhandledCallbackPromise = vi.waitFor(() => {
      expect(onUnhandledRequestCallback).toHaveBeenCalledOnce()
    })

    await expect(unhandledCallbackPromise).rejects.toThrow()
    expect(console.warn).not.toHaveBeenCalled()
  }),
)

it(
  'does not call the custom callback on the request handled there',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(
      new URL('./use.app.js', import.meta.url),
      {
        onUnhandledRequest: 'bypass',
      },
    )

    await fetch(new URL('/resource', testApp.url))

    const unhandledCallbackPromise = vi.waitFor(() => {
      expect(onUnhandledRequestCallback).toHaveBeenCalledOnce()
    })

    await expect(unhandledCallbackPromise).rejects.toThrow()
    expect(console.warn).not.toHaveBeenCalled()
  }),
)
