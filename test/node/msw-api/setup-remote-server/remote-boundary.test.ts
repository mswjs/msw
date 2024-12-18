// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { spawnTestApp } from './utils'

const remote = setupRemoteServer()

beforeAll(async () => {
  await remote.listen()
})

afterEach(() => {
  remote.resetHandlers()
})

afterAll(async () => {
  await remote.close()
})

it.concurrent(
  'uses initial handlers if the boundary has no overrides',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    const response = await fetch(new URL('/resource', testApp.url))
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')

    const json = await response.json()
    expect(json).toEqual([1, 2, 3])
  }),
)

it.concurrent(
  'uses runtime request handlers declared in the boundary',
  remote.boundary(async () => {
    remote.use(
      http.get('https://example.com/resource', () => {
        return HttpResponse.json({ mocked: true })
      }),
    )

    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    const response = await fetch(new URL('/resource', testApp.url))
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')

    const json = await response.json()
    expect(json).toEqual({ mocked: true })
  }),
)
