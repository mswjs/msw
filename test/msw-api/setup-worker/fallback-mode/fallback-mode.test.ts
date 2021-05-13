import * as path from 'path'
import { SetupWorkerApi } from 'msw'
import { addFile, createTeardown } from 'fs-teardown'
import { Page, pageWith, Response, ScenarioApi } from 'page-with'

let runtime: ScenarioApi

declare namespace window {
  export const worker: SetupWorkerApi
}

// Create a temporary directory on the disk
// that would be opened as a static application,
// loading the compiled example assets.
const { prepare, getPath, cleanup } = createTeardown(
  'tmp/fallback-mode',
  addFile('index.html', '<script src="index.js"></script>'),
)

beforeAll(async () => {
  await prepare()

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
          path: getPath(''),
        },
      },
    },
  })

  await runtime.page.goto(`file://${getPath('index.html')}`, {
    waitUntil: 'networkidle',
  })
})

afterAll(async () => {
  await cleanup()
})

function createRequestHelper(page: Page) {
  return (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    return page.evaluate(
      ([input, init]: [RequestInfo, RequestInit]) => {
        return fetch(input, init)
          .then((res) => {
            const headers = {}
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
      [input, init],
    )
  }
}

test('prints a fallback start message in the console', async () => {
  const consoleGroups = runtime.consoleSpy.get('startGroupCollapsed')

  expect(consoleGroups).toContain('[MSW] Mocking enabled (fallback mode).')
})

test('responds with a mocked response to a handled request', async () => {
  const request = createRequestHelper(runtime.page)
  const response = await request('https://api.github.com/users/octocat')

  // Prints the request message group in the console.
  const requestMessage = runtime.consoleSpy
    .get('startGroupCollapsed')
    .find((message) => {
      return message.includes('GET https://api.github.com/users/octocat')
    })
  expect(requestMessage).toMatch(
    /\[MSW\] \d{2}:\d{2}:\d{2} GET https:\/\/api\.github\.com\/users\/octocat 200/,
  )

  // Responds with a mocked response.
  expect(response.status).toBe(200)
  expect(response.statusText).toEqual('OK')
  expect(response.headers['x-powered-by']).toEqual('msw')
  expect(response.body).toEqual({
    name: 'John Maverick',
    originalUsername: 'octocat',
  })
})

test('warns on the unhandled request by default', async () => {
  const request = createRequestHelper(runtime.page)
  await request('https://example.com')

  expect(runtime.consoleSpy.get('warning')).toContain(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET https://example.com/

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
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
  expect(response.headers).toHaveProperty('x-github-media-type')
})
