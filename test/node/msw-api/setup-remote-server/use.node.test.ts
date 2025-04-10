// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { spawnTestApp } from './utils'

const remote = setupRemoteServer()

beforeAll(async () => {
  await remote.listen()
})

afterAll(async () => {
  await remote.close()
})

it(
  'returns a mocked response defined in the app by default',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    const response = await fetch(new URL('/resource', testApp.url))
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')

    const json = await response.json()
    expect(json).toEqual([1, 2, 3])
  }),
)

it(
  'returns a mocked response from the matching runtime request handler',
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
