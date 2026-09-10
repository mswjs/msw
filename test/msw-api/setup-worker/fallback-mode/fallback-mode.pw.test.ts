import type { http, HttpResponse } from 'msw'
import type { setupWorker } from 'msw/browser'
import { createTeardown } from 'fs-teardown'
import type { Page } from '@playwright/test'
import type { HttpServer } from '@open-draft/test-server/lib/http.js'
import { fromTemp } from '../../../support/utils'
import { inlineModule, test, expect } from '../../../setup/playwright'

const fallbackExample = inlineModule(({ http, HttpResponse, setupWorker }) => {
  Object.assign(window, {
    msw: {
      setupWorker,
      http,
      HttpResponse,
    },
  })
})

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    http: typeof http
    HttpResponse: typeof HttpResponse
  }
}

const fsMock = createTeardown({
  rootDir: fromTemp('fallback-mode', process.pid.toString()),
})

let server: HttpServer

async function gotoStaticPage(page: Page, workerIndex: number): Promise<void> {
  await page.goto(
    `file://${fsMock.resolve(`worker-${workerIndex}/index.html`)}`,
    { waitUntil: 'networkidle' },
  )
  await expect
    .poll(() => {
      return page.evaluate(() => {
        return typeof window.msw?.setupWorker
      })
    })
    .toBe('function')
}

interface DirectFetchResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

function createFetchWithoutNetwork(page: Page) {
  return (
    input: RequestInfo,
    init?: RequestInit,
  ): Promise<DirectFetchResponse | null> => {
    return page.evaluate(
      ([input, init]) => {
        return fetch(input, init)
          .then((res) => {
            const headers: Record<string, string> = {}
            res.headers.forEach((value, key) => {
              headers[key] = value
            })

            return res.json().then((body) => ({
              status: res.status,
              statusText: res.statusText,
              headers,
              body,
            }))
          })
          .catch(() => null)
      },
      [input, init] as [RequestInfo, RequestInit],
    )
  }
}

test.beforeAll(async () => {
  await fsMock.prepare()
})

test.beforeEach(async ({ viteServer }, testInfo) => {
  const compilation = await viteServer.compile(fallbackExample)
  const bundleUrl = new URL('./main.js', compilation.previewUrl)
  await fsMock.create({
    // Scope static files per worker to prevent shared state.
    // The tests below are run in parallel.
    [`worker-${testInfo.workerIndex}`]: {
      'index.html': `<script src="${bundleUrl.href}"></script>`,
    },
  })
})

test.beforeEach(async ({ createServer }) => {
  server = await createServer((app) => {
    app.get('/user', (_, res) => {
      res.json({ name: 'Actual User' })
    })
  })
})

test.afterAll(async () => {
  await fsMock.cleanup()
})

test('prints a fallback start message in the console', async ({
  spyOnConsole,
  page,
}, testInfo) => {
  const consoleSpy = spyOnConsole()
  await gotoStaticPage(page, testInfo.workerIndex)

  await page.evaluate(async () => {
    const { setupWorker } = window.msw
    const worker = setupWorker()
    await worker.start()
  })

  const consoleGroups = consoleSpy.get('startGroupCollapsed')

  await expect
    .poll(() => consoleGroups)
    .toContain('[MSW] Mocking enabled (fallback mode).')
})

test('responds with a mocked response to a handled request', async ({
  spyOnConsole,
  page,
}, testInfo) => {
  const fetch = createFetchWithoutNetwork(page)
  const consoleSpy = spyOnConsole()
  await gotoStaticPage(page, testInfo.workerIndex)

  await page.evaluate(async () => {
    const { setupWorker, http, HttpResponse } = window.msw

    const worker = setupWorker(
      http.get('*/user', () => {
        return HttpResponse.json({ name: 'John Maverick' })
      }),
    )
    await worker.start()
  })

  const response = await fetch(server.https.url('/user'))

  if (!response) {
    throw new Error('Expected a mocked response')
  }

  // Prints the request message group in the console.
  await expect
    .poll(() => consoleSpy.get('startGroupCollapsed'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /\[MSW\] \d{2}:\d{2}:\d{2} GET https:\/\/127\.0\.0\.1:\d+\/user 200 OK/,
        ),
      ]),
    )

  // Responds with a mocked response.
  expect(response.status).toEqual(200)
  expect(response.statusText).toEqual('OK')
  expect(response.body).toEqual({
    name: 'John Maverick',
  })
})

test('warns on the unhandled request by default', async ({
  spyOnConsole,
  page,
}, testInfo) => {
  const fetch = createFetchWithoutNetwork(page)
  const consoleSpy = spyOnConsole()
  await gotoStaticPage(page, testInfo.workerIndex)

  await page.evaluate(async () => {
    const { setupWorker } = window.msw
    const worker = setupWorker()
    await worker.start()
  })

  await fetch(server.http.url('/unknown-resource'))

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET ${server.http.url('/unknown-resource')}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`),
    ]),
  )
})

test('invokes the custom callback on an unhandled "file://" request', async ({
  spyOnConsole,
  page,
}, testInfo) => {
  const consoleSpy = spyOnConsole()
  await gotoStaticPage(page, testInfo.workerIndex)

  await page.evaluate(async () => {
    const { setupWorker } = window.msw
    const worker = setupWorker()
    await worker.start({
      onUnhandledRequest(request) {
        console.log(`Oops, unhandled ${request.method} ${request.url}`)
      },
    })
  })

  // Only the fallback mode can observe "file://" requests:
  // the fetch call never reaches the network (or the worker),
  // failing as unsupported in the browser itself.
  await page.evaluate(() => {
    return fetch('file:///does/not/exist').catch(() => void 0)
  })

  await expect
    .poll(() => consoleSpy.get('log'))
    .toContain('Oops, unhandled GET file:///does/not/exist')
})

test('stops the fallback interceptor when called "worker.stop()"', async ({
  spyOnConsole,
  page,
}, testInfo) => {
  const fetch = createFetchWithoutNetwork(page)
  const consoleSpy = spyOnConsole()
  await gotoStaticPage(page, testInfo.workerIndex)

  await page.evaluate(async () => {
    const { setupWorker } = window.msw
    const worker = setupWorker()
    await worker.start()

    worker.stop()
  })

  expect(consoleSpy.get('log')).toContain('[MSW] Mocking disabled.')

  const response = await fetch(server.http.url('/user'))

  if (!response) {
    throw new Error('Expected an original response')
  }

  expect(response.status).toBe(200)
  expect(response.body).toEqual({ name: 'Actual User' })
})
