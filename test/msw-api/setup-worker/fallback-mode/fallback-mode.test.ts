import * as path from 'path'
import { SetupWorkerApi } from 'msw'
import { createTeardown } from 'fs-teardown'
import { invariant } from 'outvariant'
import { Page, pageWith, ScenarioApi } from 'page-with'
import { fromTemp } from '../../../support/utils'
import { waitFor } from '../../../support/waitFor'

let runtime: ScenarioApi

declare namespace window {
  export const worker: SetupWorkerApi
}

// Create a temporary directory on the disk
// that would server as the public directory.
const fsMock = createTeardown({
  rootDir: fromTemp('fallback-mode'),
  paths: {
    'index.html': '<script src="index.js"></script>',
  },
})

beforeAll(async () => {
  await fsMock.prepare()

  runtime = await pageWith({
    title: 'Fallback mode',
    example: path.resolve(__dirname, '../../../rest-api/basic.mocks.ts'),
    serverOptions: {
      // Force this particular server instance to compile
      // assets to the file-system so the test could open them.
      compileInMemory: false,
      webpackConfig: {
        output: {
          filename: 'index.js',
          path: fsMock.resolve(),
        },
      },
    },
  })

  await runtime.page.goto(`file://${fsMock.resolve('index.html')}`, {
    waitUntil: 'networkidle',
  })
})

afterAll(async () => {
  await fsMock.cleanup()
})

function createRequestHelper(page: Page) {
  return (input: RequestInfo, init?: RequestInit) => {
    return page.evaluate<
      | {
          status: number
          statusText: string
          headers: Record<string, string>
          body: unknown
        }
      | undefined,
      [RequestInfo, RequestInit | undefined]
    >(
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
          .catch(() => void 0)
      },
      [input, init],
    )
  }
}

test('prints a fallback start message in the console', async () => {
  await runtime.page.reload()
  const consoleGroups = runtime.consoleSpy.get('startGroupCollapsed')

  expect(consoleGroups).toContain('[MSW] Mocking enabled (fallback mode).')
})

test('responds with a mocked response to a handled request', async () => {
  const request = createRequestHelper(runtime.page)
  const response = await request('https://api.github.com/users/octocat')

  // Prints the request message group in the console.
  await waitFor(() => {
    expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /\[MSW\] \d{2}:\d{2}:\d{2} GET https:\/\/api\.github\.com\/users\/octocat 200 OK/,
        ),
      ]),
    )
  })

  invariant(response, 'Expected to receive a response')

  // Responds with a mocked response.
  expect(response.status).toBe(200)
  expect(response.statusText).toEqual('OK')
  expect(response.headers).toHaveProperty('x-powered-by', 'msw')
  expect(response.body).toEqual({
    name: 'John Maverick',
    originalUsername: 'octocat',
  })
})

test('warns on the unhandled request by default', async () => {
  const request = createRequestHelper(runtime.page)
  await request('https://example.com')

  expect(runtime.consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET https://example.com/

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
    ]),
  )
})

test('stops the fallback interceptor when called "worker.stop()"', async () => {
  const request = createRequestHelper(runtime.page)
  await runtime.page.evaluate(() => {
    window.worker.stop()
  })

  // The stop message must be printed to the console.
  expect(runtime.consoleSpy.get('log')).toContain('[MSW] Mocking disabled.')

  // No requests should be intercepted.
  const response = await request('https://api.github.com/users/octocat')
  invariant(response, 'Expected to receive a response')

  expect(response.headers).toHaveProperty('x-github-media-type')
})
