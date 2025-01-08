// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { spawnTestApp } from './utils'

const remote = setupRemoteServer()

beforeAll(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await remote.listen()
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
  'warns on requests not handled by either party be default',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    await fetch(new URL('/resource', testApp.url))

    // Must print a warning since nobody has handled the request.
    expect(console.warn).toHaveBeenCalledWith('')
  }),
)

it(
  'does not warn on the request not handled here but handled there',
  remote.boundary(async () => {
    throw new Error('Complete this')

    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    await fetch(new URL('/resource', testApp.url))

    // Must print a warning since nobody has handled the request.
    expect(console.warn).toHaveBeenCalledWith('')
  }),
)
