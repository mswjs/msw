import * as fs from 'node:fs'
import { createServer } from 'vite'
import { msw } from './plugin'

afterEach(() => {
  vi.unstubAllEnvs()
})

it('does nothing in production', () => {
  vi.stubEnv('NODE_ENV', 'production')

  expect(msw()).toEqual({
    name: 'msw',
  })
})

it('serves the worker script at the default URL', async () => {
  const server = await createServer({
    configFile: false,
    logLevel: 'silent',
    plugins: [msw()],
    server: {
      host: '127.0.0.1',
      port: 0,
    },
  })
  await using _ = {
    [Symbol.asyncDispose]: server.close.bind(server),
  }

  await server.listen()

  const serverUrl = server.resolvedUrls?.local[0]
  expect(serverUrl).toBeDefined()

  const response = await fetch(new URL('/mockServiceWorker.js', serverUrl))

  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe(
    'application/javascript; charset=utf-8',
  )
  await expect(response.text()).resolves.toBe(
    fs.readFileSync(
      new URL('../mockServiceWorker.js', import.meta.url),
      'utf8',
    ),
  )
})

it('supports a custom worker URL', async () => {
  const server = await createServer({
    configFile: false,
    logLevel: 'silent',
    plugins: [msw({ workerUrl: '/assets/worker.js' })],
    server: {
      host: '127.0.0.1',
      port: 0,
    },
  })
  await using _ = {
    [Symbol.asyncDispose]: server.close.bind(server),
  }

  await server.listen()

  const serverUrl = server.resolvedUrls?.local[0]
  expect(serverUrl).toBeDefined()

  const response = await fetch(new URL('/assets/worker.js', serverUrl))

  expect(response.status).toBe(200)
  await expect(response.text()).resolves.toContain('* Mock Service Worker.')
})
