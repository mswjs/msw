/**
 * @vitest-environment node
 */
import { spawnSync } from 'node:child_process'
import { delay, HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { performance } from 'perf_hooks'
import { fromRoot } from '../../../support/alias'

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
    http.get('http://localhost/user', async () => {
      await delay(500)
      return HttpResponse.text('john')
    }),
  )

  const { res, responseTime } = await makeRequest('http://localhost/user')

  expect(responseTime).toBeGreaterThanOrEqual(500)
  expect(await res.text()).toBe('john')
})

test('uses realistic server response time when no duration is provided', async () => {
  server.use(
    http.get('http://localhost/user', async () => {
      await delay()
      return HttpResponse.text('john')
    }),
  )

  const { res, responseTime } = await makeRequest('http://localhost/user')

  // Realistic server response time in Node.js is set to 5ms.
  expect(responseTime).toBeGreaterThan(5)
  expect(await res.text()).toBe('john')
})

test('uses realistic server response time when "real" mode is provided', async () => {
  server.use(
    http.get('http://localhost/user', async () => {
      await delay('real')
      return HttpResponse.text('john')
    }),
  )

  const { res, responseTime } = await makeRequest('http://localhost/user')

  // Realistic server response time in Node.js is set to 5ms.
  expect(responseTime).toBeGreaterThan(5)
  expect(await res.text()).toBe('john')
})

test('does not keep the Node.js process alive when using "infinite" delay', () => {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `
        const { delay, HttpResponse, http } = require('./lib/core/index.js')
        const { setupServer } = require('./lib/node/index.js')

        const server = setupServer(
          http.get('http://localhost/user', async () => {
            await delay('infinite')
            return HttpResponse.text('john')
          }),
        )

        server.listen()
        fetch('http://localhost/user').catch(() => undefined)

        setTimeout(() => {
          server.close()
        }, 20)
      `,
    ],
    {
      cwd: fromRoot('.'),
      encoding: 'utf8',
      timeout: 1000,
    },
  )

  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
})
