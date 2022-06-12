/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { performance } from 'perf_hooks'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

async function makeRequest(url: string) {
  const requestStart = performance.now()
  const res = await fetch(url)
  const requestEnd = performance.now()
  const responseTime = requestEnd - requestStart

  return { res, responseTime }
}

test('uses explicit server response time', async () => {
  server.use(
    rest.get('http://localhost/user', (req, res, ctx) => {
      return res(ctx.delay(500), ctx.text('john'))
    }),
  )

  const { res, responseTime } = await makeRequest('http://localhost/user')

  expect(responseTime).toBeGreaterThanOrEqual(500)
  expect(await res.text()).toBe('john')
})

test('uses realistic server response time when no duration is provided', async () => {
  server.use(
    rest.get('http://localhost/user', (req, res, ctx) => {
      return res(ctx.delay(), ctx.text('john'))
    }),
  )

  const { res, responseTime } = await makeRequest('http://localhost/user')

  // Realistic server response time in Node.js is set to 5ms.
  expect(responseTime).toBeGreaterThan(5)
  expect(await res.text()).toBe('john')
})

test('uses realistic server response time when "real" mode is provided', async () => {
  server.use(
    rest.get('http://localhost/user', (req, res, ctx) => {
      return res(ctx.delay('real'), ctx.text('john'))
    }),
  )

  const { res, responseTime } = await makeRequest('http://localhost/user')

  // Realistic server response time in Node.js is set to 5ms.
  expect(responseTime).toBeGreaterThan(5)
  expect(await res.text()).toBe('john')
})
