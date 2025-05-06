import { SetupWorkerApi } from 'msw/browser'
import { createTeardown } from 'fs-teardown'
import { Page } from '@playwright/test'
import { HttpServer } from '@open-draft/test-server/lib/http.js'
import { fromTemp } from '../../../../support/utils'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const worker: SetupWorkerApi
}

const fsMock = createTeardown({
  rootDir: fromTemp('fallback-mode'),
})

let server: HttpServer

async function gotoStaticPage(page: Page, workerIndex: number): Promise<void> {
  await page.goto(
    `file://${fsMock.resolve(`worker-${workerIndex}/index.html`)}`,
    { waitUntil: 'networkidle' },
  )
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
  ): Promise<DirectFetchResponse> => {
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
          .catch(() => null as any)
      },
      [input, init] as [RequestInfo, RequestInit],
    )
  }
}

test.beforeAll(async () => {
  await fsMock.prepare()
})

test.beforeEach(async ({ webpackServer }, testInfo) => {
  const compilation = await webpackServer.compile([
    new URL('./fallback-mode.mocks.ts', import.meta.url).pathname,
  ])
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
  waitFor,
}, testInfo) => {
  const consoleSpy = spyOnConsole()
  await gotoStaticPage(page, testInfo.workerIndex)
  const consoleGroups = consoleSpy.get('startGroupCollapsed')

  await waitFor(() => {
    expect(consoleGroups).toContain('[MSW] Mocking enabled (fallback mode).')
  })
})

test('responds with a mocked response to a handled request', async ({
  spyOnConsole,
  waitFor,
  page,
}, testInfo) => {
  const fetch = createFetchWithoutNetwork(page)
  const consoleSpy = spyOnConsole()
  await gotoStaticPage(page, testInfo.workerIndex)

  const response = await fetch(server.https.url('/user'))

  // Prints the request message group in the console.
  await waitFor(() => {
    expect(consoleSpy.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /\[MSW\] \d{2}:\d{2}:\d{2} GET https:\/\/127\.0\.0\.1:\d+\/user 200 OK/,
        ),
      ]),
    )
  })

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

  await fetch(server.http.url('/unknown-resource'))

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET ${server.http.url('/unknown-resource')}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
    ]),
  )
})

test('stops the fallback interceptor when called "worker.stop()"', async ({
  spyOnConsole,
  page,
}, testInfo) => {
  const fetch = createFetchWithoutNetwork(page)
  const consoleSpy = spyOnConsole()
  await gotoStaticPage(page, testInfo.workerIndex)

  await page.evaluate(() => {
    window.worker.stop()
  })

  // Must print the stop message to the console.
  expect(consoleSpy.get('log')).toContain('[MSW] Mocking disabled.')

  // Must not intercept requests anymore.
  const response = await fetch(server.http.url('/user'))

  expect(response.status).toBe(200)
  expect(response.body).toEqual({ name: 'Actual User' })
})
