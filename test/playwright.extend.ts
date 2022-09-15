import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { test as base, expect, type Response } from '@playwright/test'
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
import { waitFor } from './support/waitFor'

const { SERVICE_WORKER_BUILD_PATH } = require('../config/constants.js')

interface TestFixtures {
  createServer(...middleware: Array<HttpServerMiddleware>): Promise<HttpServer>
  loadExample(
    entry: string,
    options?: CompilationOptions,
  ): Promise<CompilationResult>
  fetch(
    url: string,
    init?: RequestInit,
    predicate?: (res: Response) => boolean,
  ): Promise<Response>
  query(uri: string, options: GraphQLQueryOptions): Promise<Response>
  makeUrl(path: string): string
  spyOnConsole(): ConsoleMessages
  waitFor(predicate: () => unknown): Promise<void>
}

interface WorkerFixtures {
  previewServer: WebpackHttpServer
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
    async ({}, use) => {
      const server = new WebpackHttpServer({
        before(app) {
          app.get('/mockServiceWorker.js', (req, res) => {
            const readable = fs.createReadStream(SERVICE_WORKER_BUILD_PATH)
            res.set('Content-Type', 'application/javascript; charset=utf8')
            res.set('Content-Encoding', 'chunked')
            readable.pipe(res)
          })
        },
        webpackConfig: {
          module: {
            rules: [
              {
                test: /\.tsx?$/,
                use: [
                  {
                    loader: 'ts-loader',
                    options: {
                      configFile: path.resolve(
                        __dirname,
                        '..',
                        'tsconfig.json',
                      ),
                      transpileOnly: true,
                    },
                  },
                ],
              },
            ],
          },
          resolve: {
            alias: {
              msw: path.resolve(__dirname, '..'),
            },
            extensions: ['.ts', '.js'],
          },
        },
      })

      await server.listen()
      await use(server)
    },
    { scope: 'worker' },
  ],
  async createServer({}, use) {
    let server: HttpServer

    await use(async (...middleware) => {
      server = new HttpServer(...middleware)
      await server.listen()
      return server
    })

    await server.close()
  },
  async loadExample({ page, previewServer }, use) {
    await use(async (entry, options = {}) => {
      const compilation = await previewServer.compile([entry], options)
      await page.goto(compilation.previewUrl, { waitUntil: 'networkidle' })
      return compilation
    })
  },
  async waitFor({}, use) {
    await use(waitFor)
  },
  async fetch({ page, previewServer }, use) {
    await use(async (url, init, predicate) => {
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

      page.evaluate<unknown, [string, RequestInit]>(
        ([url, init]) => fetch(url, init as RequestInit),
        [resolvedUrl, resolvedInit],
      )

      return page.waitForResponse(async (res) => {
        if (predicate) {
          return predicate(res)
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
            return null
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
  async makeUrl({}, use) {
    await use((path) => {
      return new URL(path, process.env.WEBPACK_SERVER_URL).href
    })
  },
  async spyOnConsole({ page }, use) {
    await use(() => {
      return spyOnConsole(page as any)
    })
  },
})

export { expect }
