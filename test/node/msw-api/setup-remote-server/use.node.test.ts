// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { TestNodeApp } from './utils'

const remote = setupRemoteServer()
const testApp = new TestNodeApp(require.resolve('./use.app.js'))

beforeAll(async () => {
  await remote.listen({
    port: 56789,
  })
  await testApp.start()
})

afterEach(() => {
  remote.resetHandlers()
})

afterAll(async () => {
  await remote.close()
  await testApp.close()
})

it('returns a mocked response defined in the app by default', async () => {
  const response = await fetch(new URL('/resource', testApp.url))
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')

  const json = await response.json()
  expect(json).toEqual([1, 2, 3])
})

it('returns a mocked response from the matching runtime request handler', async () => {
  remote.use(
    http.get('https://example.com/resource', () => {
      return HttpResponse.json({ mocked: true })
    }),
  )

  const response = await fetch(new URL('/resource', testApp.url))
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')

  const json = await response.json()
  expect(json).toEqual({ mocked: true })
})
