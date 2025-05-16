import url from 'node:url'
import crypto from 'node:crypto'
import { test as base, expect, type Response, Page } from '@playwright/test'
import {
  Headers,
  headersToObject,
  flattenHeadersObject,
  type FlatHeadersObject,
} from 'headers-polyfill'
import { spyOnConsole, ConsoleMessages } from 'page-with'
import {
  HttpServer,
  HttpServerMiddleware,
} from '@open-draft/test-server/lib/http.js'
import {
  Compilation,
  CompilationOptions,
  WebpackHttpServer,
} from 'webpack-http-server'
import { waitFor } from '../support/waitFor'
import { WorkerConsole } from './setup/workerConsole'
import { getWebpackServer } from './setup/webpackHttpServer'

export interface TestFixtures {
  /**
   * Create a test server instance.
   */
  createServer(...middleware: Array<HttpServerMiddleware>): Promise<HttpServer>
  webpackServer: WebpackHttpServer
  loadExample(
    entry: string | Array<string> | URL,
    options?: CompilationOptions & {
      /**
       * Do not await the "Mocking enabled" message in the console.
       */
      skipActivation?: boolean
      beforeNavigation?(compilation: Compilation): void
    },
  ): Promise<{
    compilation: Compilation
    workerConsole: WorkerConsole
  }>
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
  map: Record<string, Array<string>>
  fileContents: Array<string>
}

export const test = base.extend<TestFixtures>({
  async createServer({}, use) {
    let server: HttpServer | undefined

    await use(async (...middleware) => {
      server = new HttpServer(...middleware)
      await server.listen()
      return server
    })

    await server?.close()
  },
  async webpackServer({}, use) {
    use(await getWebpackServer())
  },
  async loadExample({ page, webpackServer, waitForMswActivation }, use) {
    const pageExceptions: Array<Error> = []
    page.on('pageerror', (error) => pageExceptions.push(error))

    const workerConsole = new WorkerConsole()
    let compilation: Compilation | undefined

    await use(async (entry, options = {}) => {
      const resolvedEntry =
        entry instanceof URL ? url.fileURLToPath(entry) : entry

      compilation = await webpackServer.compile(
        Array.prototype.concat([], resolvedEntry),
        options,
      )

      // Allow arbitrary setup code before navigating to the compilation preview.
      // This is useful to set up console watchers and other side-effects.
      options.beforeNavigation?.(compilation)

      // Forward browser runtime errors/warnings to the test runner.
      page.on('pageerror', console.error)

      const oncePageReady = [
        page.waitForLoadState('domcontentloaded', { timeout: 15_000 }),
        page.waitForEvent('load', { timeout: 30_000 }),
        page.waitForLoadState('networkidle', { timeout: 5_000 }),
      ]
      page.goto(compilation.previewUrl)
      await Promise.all(oncePageReady)

      // All examlpes await the MSW activation message by default.
      // Support opting-out from this behavior for tests where activation
      // is not expected (e.g. when testing activation errors).
      if (!options.skipActivation) {
        await waitForMswActivation()
      }

      await workerConsole.init(page)

      return {
        compilation,
        workerConsole,
      }
    })

    workerConsole.removeAllListeners()
    await compilation?.dispose()
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
  async fetch({ page }, use) {
    await use(async (url, init, options = {}) => {
      const target = options.page || page

      const requestId = crypto.randomBytes(16).toString('hex')

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
        [url, resolvedInit],
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
  async makeUrl({ webpackServer }, use) {
    await use((pathname) => {
      return new URL(pathname, webpackServer.serverUrl).href
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
