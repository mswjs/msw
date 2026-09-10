import * as fs from 'node:fs'
import nodeHttp from 'node:http'
import { chromium } from '@playwright/test'
import { createTeardown } from 'fs-teardown'
import { build, createServer, createServerModuleRunner, preview } from 'vite'
import { fromRoot, mswExports } from '../../test/support/alias'
import { fromTemp } from '../../test/support/utils'
import type { network } from 'virtual:msw'
import { msw } from './plugin'

const fsMock = createTeardown({
  rootDir: fromTemp('vite/plugin'),
})

beforeAll(async () => {
  await fsMock.prepare()
})

beforeEach(async () => {
  await fsMock.reset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

afterAll(async () => {
  await fsMock.cleanup()
})

it('strips the network and mock-only handler modules from a production client bundle', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  await fsMock.create({
    'index.html':
      '<output></output><script type="module" src="/entry.ts"></script>',
    'handlers.ts': `
import { http, HttpResponse } from 'msw/http'
console.log('MOCK_ONLY_HANDLER_MODULE')
export const handlers = [http.get('/resource', () => HttpResponse.text('MOCK_ONLY_RESPONSE'))]
`,
    'shared.ts': `
import { http, HttpResponse } from 'msw/http'
export const appValue = 'Application ready'
export function createHandler() {
  return http.get('/override', () => HttpResponse.text('MOCK_ONLY_OVERRIDE'))
}
`,
    'side-effect.ts': "document.body.dataset.sideEffect = 'preserved'",
    'entry.ts': `
import { network as mocking } from 'virtual:msw'
import { handlers } from './handlers'
import { appValue, createHandler } from './shared'
import './side-effect'

const initialHandlers = handlers
mocking.configure({ handlers: initialHandlers })
await mocking.enable()
mocking.use(createHandler())
mocking.events.on('request:start', () => console.log('MOCK_ONLY_EVENT'))
const { disable } = mocking
await disable()

function start(network: { enable(): string }) {
  return network.enable()
}

document.querySelector('output')!.textContent = appValue + start({
  enable() {
    return ' with local network'
  },
})
`,
  })

  await build({
    configFile: false,
    root: fsMock.resolve('.'),
    logLevel: 'silent',
    plugins: [msw()],
    resolve: {
      alias: {
        'msw/experimental': fromRoot('lib/core/experimental/index.js'),
        ...mswExports,
      },
    },
    build: {
      minify: false,
      rollupOptions: { output: { entryFileNames: 'app.js' } },
    },
  })

  const output = fs.readFileSync(fsMock.resolve('dist/app.js'), 'utf8')

  expect(output).not.toContain('MOCK_ONLY')
  expect(output).not.toContain('virtual:msw')
  expect(output).not.toContain('defineNetwork')
  expect(output).not.toContain('mockServiceWorker')
  expect(output).not.toContain('HttpResponse')
  expect(fs.existsSync(fsMock.resolve('public'))).toBe(false)
  expect(fs.existsSync(fsMock.resolve('dist/mockServiceWorker.js'))).toBe(false)

  const server = await preview({
    configFile: false,
    root: fsMock.resolve('.'),
    logLevel: 'silent',
    preview: { host: '127.0.0.1', port: 0 },
  })
  await using serverResource = {
    [Symbol.asyncDispose]: server.close.bind(server),
  }
  const browser = await chromium.launch()
  await using browserResource = {
    [Symbol.asyncDispose]: browser.close.bind(browser),
  }
  const page = await browser.newPage()
  await page.goto(server.resolvedUrls.local[0])

  await expect
    .poll(() => page.locator('output').textContent())
    .toBe('Application ready with local network')
  await expect(
    page.locator('body').getAttribute('data-side-effect'),
  ).resolves.toBe('preserved')
}, 20_000)

it('strips the network and handler imports from a production server bundle', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  const { msw: builtMsw } = await import('../../lib/vite/index.js')
  await fsMock.create({
    'package.json': '{"type":"module"}',
    'handlers.js': `
import { http, HttpResponse } from 'msw/http'
console.log('MOCK_ONLY_HANDLER_MODULE')
export const handlers = [http.get('/resource', () => HttpResponse.text('MOCK_ONLY_RESPONSE'))]
`,
    'entry.js': `
import * as mocking from 'virtual:msw'
import { handlers } from './handlers.js'

mocking.network.configure({ handlers })
await mocking.network.enable()
mocking.network.use(...handlers)
await mocking.network.disable()

console.log('Application ready')
`,
  })

  await build({
    configFile: false,
    root: fsMock.resolve('.'),
    logLevel: 'silent',
    plugins: [builtMsw()],
    build: { ssr: 'entry.js', outDir: 'server', minify: false },
  })
  const output = fs.readFileSync(fsMock.resolve('server/entry.js'), 'utf8')

  expect(output).not.toContain('MOCK_ONLY')
  expect(output).not.toMatch(/(?:from|import)\s*["'](?:msw|virtual:msw)/)
  expect(output).not.toContain('defineNetwork')
  expect(output).not.toContain('network')
  expect(output).not.toContain('handlers')
  expect(fs.existsSync(fsMock.resolve('public'))).toBe(false)
  expect(fs.existsSync(fsMock.resolve('server/mockServiceWorker.js'))).toBe(
    false,
  )

  const { stdout } = await fsMock.exec('node ./server/entry.js')

  expect(stdout.trim()).toBe('Application ready')
})

it('does not serve the worker when the dev server runs in production', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  const server = await createServer({
    configFile: false,
    root: fsMock.resolve('.'),
    appType: 'custom',
    logLevel: 'silent',
    plugins: [msw()],
    server: { host: '127.0.0.1', port: 0 },
  })
  await using serverResource = {
    [Symbol.asyncDispose]: server.close.bind(server),
  }
  await server.listen()

  const response = await fetch(
    new URL('/mockServiceWorker.js', server.resolvedUrls?.local[0]),
  )

  expect(response.status).toBe(404)
})

it('restores cached server mocking after hot updates and replaces it on full reloads', async () => {
  await fsMock.create({
    'entry.js': `
import { network } from 'virtual:msw'
import { http, HttpResponse } from 'msw/http'

network.configure({
  handlers: [http.get('http://msw.test/resource', () => HttpResponse.text('mocked'))],
})
await network.enable()

export let completedUpdates = 0
export let disabledBeforeUpdate = false

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    disabledBeforeUpdate = network.readyState === 0
  })
  import.meta.hot.on('vite:afterUpdate', () => {
    completedUpdates += 1
  })
}

export { network }
`,
  })

  const originalClientRequest = nodeHttp.ClientRequest
  const server = await createServer({
    configFile: false,
    root: fsMock.resolve('.'),
    logLevel: 'silent',
    plugins: [msw()],
    resolve: {
      alias: {
        'msw/experimental': fromRoot('lib/core/experimental/index.js'),
        ...mswExports,
      },
    },
    server: { middlewareMode: true, watch: null },
  })
  await using serverResource = {
    [Symbol.asyncDispose]: server.close.bind(server),
  }
  const error = vi.fn()
  const runner = createServerModuleRunner(server.environments.ssr, {
    hmr: { logger: { debug: vi.fn(), error } },
  })
  await using runnerResource = {
    [Symbol.asyncDispose]: runner.close.bind(runner),
  }
  const integration = await runner.import<{
    network: typeof network
    completedUpdates: number
    disabledBeforeUpdate: boolean
  }>('/entry.js')
  await using interception = {
    [Symbol.asyncDispose]: async () => {
      const current = await runner.import<{ network: typeof network }>(
        '/entry.js',
      )

      if (current.network.readyState === 1) {
        await current.network.disable()
      }
    },
  }

  expect(nodeHttp.ClientRequest).not.toBe(originalClientRequest)

  server.environments.ssr.hot.send({ type: 'update', updates: [] })

  await expect.poll(() => integration.completedUpdates).toBe(1)
  expect(integration.disabledBeforeUpdate).toBe(true)
  await expect.poll(() => integration.network.readyState).toBe(1)
  expect(nodeHttp.ClientRequest).not.toBe(originalClientRequest)

  const updatedResponse = await fetch('http://msw.test/resource')

  await expect(updatedResponse.text()).resolves.toBe('mocked')
  await integration.network.disable()
  server.environments.ssr.hot.send({ type: 'update', updates: [] })

  await expect.poll(() => integration.completedUpdates).toBe(2)
  expect(integration.network.readyState).toBe(0)
  expect(nodeHttp.ClientRequest).toBe(originalClientRequest)

  await integration.network.enable()
  server.environments.ssr.hot.send({ type: 'full-reload' })

  await expect
    .poll(async () => {
      const current = await runner.import<{ network: typeof network }>(
        '/entry.js',
      )

      return (
        current.network !== integration.network &&
        current.network.readyState === 1
      )
    })
    .toBe(true)
  expect(integration.network.readyState).toBe(0)
  expect(error).not.toHaveBeenCalled()

  const response = await fetch('http://msw.test/resource')

  await expect(response.text()).resolves.toBe('mocked')
})

it('creates one disabled network on the server and lets the user enable it', async () => {
  await fsMock.create({
    'entry.js': `
import { network } from 'virtual:msw'
import { http, HttpResponse } from 'msw/http'

network.configure({
  handlers: [http.get('http://msw.test/resource', () => HttpResponse.text('mocked'))],
})

export { network }
`,
  })

  const originalFetch = globalThis.fetch
  const server = await createServer({
    configFile: false,
    root: fsMock.resolve('.'),
    logLevel: 'silent',
    plugins: [msw()],
    resolve: {
      alias: {
        'msw/experimental': fromRoot('lib/core/experimental/index.js'),
        ...mswExports,
      },
    },
    server: { middlewareMode: true },
  })
  await using _ = {
    [Symbol.asyncDispose]: server.close.bind(server),
  }
  const integration: { network: typeof network } =
    await server.ssrLoadModule('/entry.js')
  const repeatedImport: { network: typeof network } =
    await server.ssrLoadModule('virtual:msw')

  expect(integration.network).toBe(repeatedImport.network)
  expect(integration.network.readyState).toBe(0)
  expect(globalThis.fetch).toBe(originalFetch)

  await integration.network.enable()
  await using interception = {
    [Symbol.asyncDispose]: async () => {
      await integration.network.disable()
    },
  }
  const response = await fetch('http://msw.test/resource')

  await expect(response.text()).resolves.toBe('mocked')
})

it('preserves browser interception through hot updates with a custom worker URL', async () => {
  await fsMock.create({
    'index.html':
      '<button>Enable</button><output></output><script type="module" src="/entry.js"></script>',
    'entry.js': `
import { network } from 'virtual:msw'
import { http, HttpResponse } from 'msw/http'

network.configure({
  handlers: [http.get('/resource', () => HttpResponse.text('mocked'))],
})

document.querySelector('output').textContent = String(network.readyState)
let completedUpdates = 0

if (import.meta.hot) {
  import.meta.hot.on('vite:afterUpdate', () => {
    document.body.dataset.completedUpdates = String(++completedUpdates)
  })
}

document.querySelector('button').onclick = async () => {
  await network.enable()
  const response = await fetch('/resource')
  document.querySelector('output').textContent = await response.text()
}
`,
  })

  const server = await createServer({
    configFile: false,
    root: fsMock.resolve('.'),
    logLevel: 'silent',
    plugins: [msw({ serviceWorker: { url: '/mocks/worker.js' } })],
    resolve: {
      alias: {
        'msw/experimental': fromRoot('lib/core/experimental/index.js'),
        ...mswExports,
      },
    },
    server: { host: '127.0.0.1', port: 0, watch: null },
  })
  await using _ = {
    [Symbol.asyncDispose]: server.close.bind(server),
  }
  await server.listen()

  const serverIntegration: { network: typeof network } =
    await server.ssrLoadModule('virtual:msw')

  const browser = await chromium.launch()
  await using browserResource = {
    [Symbol.asyncDispose]: browser.close.bind(browser),
  }
  const page = await browser.newPage()
  const connected = page.waitForEvent('console', {
    predicate: (message) => message.text().includes('[vite] connected.'),
  })
  await page.goto(new URL('/mocks/', server.resolvedUrls!.local[0]).href)
  await connected

  await expect.poll(() => page.locator('output').textContent()).toBe('0')
  server.environments.client.hot.send({ type: 'update', updates: [] })

  await expect
    .poll(() => page.locator('body').getAttribute('data-completed-updates'))
    .toBe('1')
  await expect(
    page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()

      return registrations.length
    }),
  ).resolves.toBe(0)

  await page.getByRole('button', { name: 'Enable' }).click()

  await expect.poll(() => page.locator('output').textContent()).toBe('mocked')
  server.environments.client.hot.send({ type: 'update', updates: [] })

  await expect
    .poll(() => page.locator('body').getAttribute('data-completed-updates'))
    .toBe('2')
  await expect(
    page.evaluate(async () => {
      const response = await fetch('/resource')

      return response.text()
    }),
  ).resolves.toBe('mocked')
  await expect(
    page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()

      return registrations[0].active?.scriptURL
    }),
  ).resolves.toBe(
    new URL('/mocks/worker.js', server.resolvedUrls!.local[0]).href,
  )
  expect(fs.existsSync(fsMock.resolve('public'))).toBe(false)
  expect(serverIntegration.network.readyState).toBe(0)
}, 20_000)

it('creates a server network in development builds', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  await fsMock.create({
    'package.json': '{"type":"module"}',
    'verify.js': `
import assert from 'node:assert/strict'

const originalFetch = globalThis.fetch
const { network } = await import('./server/entry.js')
assert.equal(network.readyState, 0)
assert.equal(globalThis.fetch, originalFetch)

await network.enable()
const response = await fetch('http://msw.test/resource')
console.log(await response.text())
await network.disable()
assert.equal(globalThis.fetch, originalFetch)
`,
    'entry.js': `
import { network } from 'virtual:msw'
import { http, HttpResponse } from 'msw/http'

network.configure({
  handlers: [http.get('http://msw.test/resource', () => HttpResponse.text('mocked'))],
})

export { network }
`,
  })

  fs.mkdirSync(fsMock.resolve('node_modules'))
  fs.symlinkSync(fromRoot('.'), fsMock.resolve('node_modules/msw'), 'dir')
  using dependencyLink = {
    [Symbol.dispose]: () => {
      fs.unlinkSync(fsMock.resolve('node_modules/msw'))
    },
  }

  await build({
    configFile: false,
    root: fsMock.resolve('.'),
    logLevel: 'silent',
    plugins: [msw()],
    ssr: { external: ['msw/experimental', 'msw/node', 'msw/http'] },
    build: { ssr: 'entry.js', outDir: 'server' },
  })
  const { stdout } = await fsMock.exec('node ./verify.js')

  expect(stdout.trim()).toBe('mocked')
})

it('creates a browser network in development builds without enabling it automatically', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  await fsMock.create({
    'index.html':
      '<button>Enable</button><output></output><script type="module" src="/entry.js"></script>',
    'entry.js': `
import { network } from 'virtual:msw'
import { http, HttpResponse } from 'msw/http'

network.configure({
  handlers: [http.get('/resource', () => HttpResponse.text('mocked'))],
})

document.querySelector('output').textContent = String(network.readyState)
document.querySelector('button').onclick = async () => {
  await network.enable()
  network.use(http.get('/resource', () => HttpResponse.text('override')))
  const response = await fetch('/resource')
  document.querySelector('output').textContent = await response.text()
}
`,
  })

  await build({
    configFile: false,
    root: fsMock.resolve('.'),
    logLevel: 'silent',
    plugins: [msw()],
    resolve: {
      alias: {
        'msw/experimental': fromRoot('lib/core/experimental/index.js'),
        ...mswExports,
      },
    },
  })
  const server = await preview({
    configFile: false,
    root: fsMock.resolve('.'),
    logLevel: 'silent',
    preview: { host: '127.0.0.1', port: 0 },
  })
  await using _ = {
    [Symbol.asyncDispose]: server.close.bind(server),
  }
  const browser = await chromium.launch()
  await using browserResource = {
    [Symbol.asyncDispose]: browser.close.bind(browser),
  }
  const page = await browser.newPage()
  await page.goto(server.resolvedUrls.local[0])

  await expect.poll(() => page.locator('output').textContent()).toBe('0')
  await expect(
    page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()

      return registrations.length
    }),
  ).resolves.toBe(0)

  await page.getByRole('button', { name: 'Enable' }).click()

  await expect.poll(() => page.locator('output').textContent()).toBe('override')
}, 20_000)

it('serves the worker script without writing files during development', async () => {
  const server = await createServer({
    configFile: false,
    root: fsMock.resolve('.'),
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
  expect(fs.existsSync(fsMock.resolve('public'))).toBe(false)
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

it('serves the worker script at a custom URL', async () => {
  const server = await createServer({
    configFile: false,
    root: fsMock.resolve('.'),
    publicDir: 'static',
    logLevel: 'silent',
    plugins: [msw({ serviceWorker: { url: '/assets/worker.js' } })],
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
  expect(fs.existsSync(fsMock.resolve('static'))).toBe(false)
  await expect(response.text()).resolves.toContain('* Mock Service Worker.')
})

it('does not write the worker script during production builds', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  await fsMock.create({
    'index.html': '<html><body>Example app</body></html>',
  })

  await build({
    configFile: false,
    root: fsMock.resolve('.'),
    logLevel: 'silent',
    plugins: [msw()],
  })

  expect(fs.existsSync(fsMock.resolve('public/mockServiceWorker.js'))).toBe(
    false,
  )
  expect(fs.existsSync(fsMock.resolve('dist/mockServiceWorker.js'))).toBe(false)
})

it('writes a custom worker URL to the configured public directory', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  await fsMock.create({
    'index.html': '<html><body>Example app</body></html>',
    'static/example.txt': 'Public asset',
  })

  await build({
    configFile: false,
    root: fsMock.resolve('.'),
    publicDir: 'static',
    logLevel: 'silent',
    plugins: [msw({ serviceWorker: { url: '/mocks/worker.js' } })],
    build: {
      outDir: 'build/client',
      assetsDir: 'bundled',
      copyPublicDir: false,
    },
  })

  expect(
    fs.readFileSync(fsMock.resolve('static/mocks/worker.js'), 'utf8'),
  ).toBe(
    fs.readFileSync(
      new URL('../mockServiceWorker.js', import.meta.url),
      'utf8',
    ),
  )
  expect(fs.existsSync(fsMock.resolve('build/client/mocks/worker.js'))).toBe(
    false,
  )
})

it('skips writing the worker when the public directory is disabled', async () => {
  await fsMock.create({
    'index.html': '<html><body>Example app</body></html>',
  })

  await build({
    configFile: false,
    root: fsMock.resolve('.'),
    publicDir: false,
    logLevel: 'silent',
    plugins: [msw()],
  })

  expect(fs.existsSync(fsMock.resolve('public'))).toBe(false)
  expect(fs.existsSync(fsMock.resolve('dist/mockServiceWorker.js'))).toBe(false)
})
