import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { test as base, expect, type Response, Page } from '@playwright/test'
import {
  Headers,
  headersToObject,
  flattenHeadersObject,
  type FlatHeadersObject,
} from 'headers-polyfill'
import { spyOnConsole, ConsoleMessages } from 'page-with'
import { HttpServer, HttpServerMiddleware } from '@open-draft/test-server/http'
import {
  CompilationOptions,
  CompilationResult,
  WebpackHttpServer,
} from 'webpack-http-server'
import { waitFor } from '../support/waitFor'
import {
  createWorkerConsoleServer,
  WorkerConsole,
} from '../support/workerConsole'

const { SERVICE_WORKER_BUILD_PATH } = require('../../config/constants.js')

export interface TestFixtures {
  createServer(...middleware: Array<HttpServerMiddleware>): Promise<HttpServer>
  loadExample(
    entry: string,
    options?: CompilationOptions & {
      /**
       * Do not await the "Mocking enabled" message in the console.
       */
      skipActivation?: boolean
      beforeNavigation?(compilation: CompilationResult): void
    },
  ): Promise<CompilationResult>
  fetch(
    url: string,
    init?: RequestInit,
    options?: FetchOptions,
  ): Promise<Response>
  query(uri: string, options: GraphQLQueryOptions): Promise<Response>
  makeUrl(path: string): string
  spyOnConsole(): ConsoleMessages
  waitFor(predicate: () => unknown): Promise<void>
  waitForMswActivation(): Promise<void>
}

interface WorkerFixtures {
  previewServer: WebpackHttpServer
  workerConsole: WorkerConsole
}

interface FetchOptions {
  page?: Page
  waitForResponse?(res: Response): Promise<boolean> | boolean
}

interface GraphQLQueryOptions {
  method?: 'GET' | 'POST'
  query: string
  variables?: Record<string, any>
  multipartOptions?: GraphQLMultipartDataOptions
}

interface GraphQLMultipartDataOptions {
  map: Record<string, string[]>
  fileContents: string[]
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  previewServer: [
    async ({ workerConsole }, use) => {
      workerConsole.consoleSpy.clear()

      const server = new WebpackHttpServer({
        before(app) {
          // Prevent Express from responding with cached 304 responses.
          app.set('etag', false)

          app.get('/mockServiceWorker.js', (req, res) => {
            const readable = fs.createReadStream(SERVICE_WORKER_BUILD_PATH)
            readable.push(
              `
// EVERYTHING BELOW THIS LINE IS APPENDED TO THE WORKER SCRIPT
// ONLY DURING THE TEST RUN.
const originals = {}
Object.keys(console).forEach((methodName) => {
  originals[methodName] = console[methodName]
  console[methodName] = (...args) => {
    fetch('${workerConsole.server.http.url('/console/')}' + methodName, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    })

    originals[methodName](...args)
  }
})
`,
              'utf8',
            )

            res.set('Content-Type', 'application/javascript; charset=utf8')
            res.set('Content-Encoding', 'chunked')
            readable.pipe(res)
          })
        },
        webpackConfig: {
          module: {
            rules: [
              {
                test: /\.ts$/,
                use: [
                  {
                    loader: 'esbuild-loader',
                    options: {
                      loader: 'ts',
                      tsconfigRaw: require('../../tsconfig.json'),
                    },
                  },
                ],
              },
            ],
          },
          resolve: {
            alias: {
              msw: path.resolve(__dirname, '../..'),
            },
            extensions: ['.ts', '.js'],
          },
        },
      })

      await server.listen()
      await use(server)
      await server.close()
    },
    { scope: 'worker' },
  ],
  workerConsole: [
    async ({}, use) => {
      const { server, consoleSpy } = await createWorkerConsoleServer()
      consoleSpy.clear()

      await use({
        server,
        consoleSpy,
      })

      consoleSpy.clear()
      await server.close()
    },
    { scope: 'worker' },
  ],
  async createServer({}, use) {
    let server: HttpServer | undefined

    await use(async (...middleware) => {
      server = new HttpServer(...middleware)
      await server.listen()
      return server
    })

    await server?.close()
  },
  async loadExample({ page, previewServer, waitForMswActivation }, use) {
    await use(async (entry, options = {}) => {
      const compilation = await previewServer.compile([entry], options)
      options.beforeNavigation?.(compilation)

      // Forward browser runtime errors/warnings to the test runner.
      page.on('pageerror', console.error)

      await page.goto(compilation.previewUrl, { waitUntil: 'networkidle' })

      if (!options.skipActivation) {
        await waitForMswActivation()
      }

      return compilation
    })
  },
  async waitFor({}, use) {
    await use(waitFor)
  },
  async waitForMswActivation({ spyOnConsole }, use) {
    const consoleSpy = spyOnConsole()

    await use(() => {
      return waitFor(() => {
        const groupMessages = consoleSpy.get('startGroupCollapsed')

        if (groupMessages?.includes('[MSW] Mocking enabled.')) {
          consoleSpy.clear()
          return Promise.resolve()
        }

        return Promise.reject()
      })
    })

    consoleSpy.clear()
  },
  async fetch({ page, previewServer }, use) {
    await use(async (url, init, options = {}) => {
      const target = options.page || page

      const requestId = crypto.randomBytes(16).toString('hex')
      const resolvedUrl = new URL(url, previewServer.serverUrl).href

      const fetchOptions = init || {}
      const initialHeaders = fetchOptions.headers || {}
      const requestHeaders = new Headers(initialHeaders)

      const identityHeaderName = 'accept-language'
      requestHeaders.set(identityHeaderName, requestId)

      const resolvedInit = {
        ...fetchOptions,
        headers: flattenHeadersObject(headersToObject(requestHeaders)),
      }

      // Don't await the request here so that we can await the response
      // later on based on the request identity headers. This way we can
      // perform multiple requests in parallel.
      target.evaluate<unknown, [string, RequestInit]>(
        ([url, init]) => fetch(url, init as RequestInit),
        [resolvedUrl, resolvedInit],
      )

      return target.waitForResponse(async (res) => {
        if (typeof options.waitForResponse !== 'undefined') {
          return options.waitForResponse(res)
        }

        const {
          [identityHeaderName]: actualRequestId,
          ['x-msw-bypass']: isBypassRequest,
        } = res.request().headers()

        return isBypassRequest !== 'true' && actualRequestId === requestId
      })
    })
  },
  async query({ page }, use) {
    await use(async (uri, options) => {
      const requestId = crypto.createHash('md5').digest('hex')
      const method = options.method || 'POST'
      const requestUrl = new URL(uri, 'http://localhost:8080')
      const headers: FlatHeadersObject = {
        'x-request-id': requestId,
      }

      if (method === 'GET') {
        requestUrl.searchParams.set('query', options.query)

        if (options.variables) {
          requestUrl.searchParams.set(
            'variables',
            JSON.stringify(options.variables),
          )
        }
      }

      const responsePromise = page.evaluate<
        globalThis.Response,
        {
          url: string
          method: string
          headers: FlatHeadersObject
          options: GraphQLQueryOptions
        }
      >(
        ({ url, method, headers, options }) => {
          const init: RequestInit = {
            method,
            headers,
          }

          const operations = JSON.stringify({
            query: options.query,
            variables: options.variables,
          })

          function getMultipartGraphQLBody() {
            if (!options.multipartOptions) {
              throw new Error(
                'Failed to construct a multi-part data GraphQL request: no options provided',
              )
            }

            if (method !== 'POST') {
              throw new Error(
                'Cannot perform a multi-part data GraphQL request: must use "POST" method',
              )
            }

            const body = new FormData()
            body.set('operations', operations)
            body.set('map', JSON.stringify(options.multipartOptions.map))

            options.multipartOptions.fileContents.forEach(
              (fileContent, index) => {
                const file = new File([fileContent], `file${index}.txt`)
                body.append(index.toString(), file)
              },
            )

            return body
          }

          if (method === 'POST') {
            if (!options.multipartOptions) {
              headers['Content-Type'] = 'application/json'
            }

            init.body = options.multipartOptions
              ? getMultipartGraphQLBody()
              : operations
          }

          return fetch(url, init).catch(() => {
            /**
             * @note Silence request rejections so that request errors
             * could be asserted in tests.
             */
            return new Response(null, { status: 508 })
          })
        },
        {
          url: requestUrl.href,
          method,
          headers,
          options,
        },
      )

      return new Promise<Response>((resolve, reject) => {
        responsePromise.catch(reject)

        return page
          .waitForResponse(async (res) => {
            const {
              ['x-request-id']: actualRequestId,
              ['x-msw-bypass']: isBypassRequest,
            } = res.request().headers()

            return isBypassRequest !== 'true' && actualRequestId === requestId
          })
          .then(resolve)
          .catch(resolve)
      })
    })
  },
  async makeUrl({ previewServer }, use) {
    await use((path) => {
      return new URL(path, previewServer.serverUrl).href
    })
  },
  async spyOnConsole({ page }, use) {
    let messages: ConsoleMessages | undefined

    await use(() => {
      messages = spyOnConsole(page as any)
      return messages
    })

    messages?.clear()
  },
})

export { expect }
