import * as puppeteer from 'puppeteer'
import { headersToObject } from 'headers-utils'
import WebpackDevServer from 'webpack-dev-server'
import { SpawnServerOptions, spawnServer } from './spawnServer'
import { uuidv4 } from '../../src/utils/internal/uuidv4'

/**
 * Requests a given URL within the test scenario's browser session.
 */
type RequestHelper = (options: {
  url: string
  fetchOptions?: RequestInit & Record<string, any>
  responsePredicate?: (res: puppeteer.Response, url: string) => boolean
}) => Promise<puppeteer.Response>

export const createRequestHelper = (page: puppeteer.Page): RequestHelper => {
  return async ({
    url,
    fetchOptions: customFetchOptions,
    responsePredicate,
  }) => {
    const requestId = uuidv4()
    const fetchOptions = customFetchOptions || {}
    const initialHeaders = fetchOptions.headers || {}
    const requestHeaders =
      initialHeaders instanceof Headers
        ? initialHeaders
        : new Headers(initialHeaders)

    // Store the request UUID in the `Accept-Language` header.
    // Keep in mind that this identity header must satisfy:
    // - Must not be stripped on the "no-cors" requests.
    // - Must not be `X-NAME`, as such headers fail requests to actual API.
    const identityHeaderName = 'accept-language'
    requestHeaders.set(identityHeaderName, requestId)

    const requestInit = Object.assign({}, fetchOptions, {
      // Convert headers to object because the `Headers` instance
      // cannot be serialized during `page.evaluate()`.
      headers: headersToObject(requestHeaders),
    })

    page.evaluate(
      (input: string, init: RequestInit) => {
        return fetch(input, init)
      },
      url,
      requestInit,
    )

    function defaultResponsePredicate(res: puppeteer.Response) {
      const requestHeaders = res.request().headers()
      return requestHeaders[identityHeaderName] === requestId
    }

    return page.waitForResponse((res) => {
      return responsePredicate
        ? responsePredicate(res, url)
        : defaultResponsePredicate(res)
    })
  }
}

export interface TestAPI {
  server: WebpackDevServer
  origin: string
  browser: puppeteer.Browser
  page: puppeteer.Page
  makeUrl(chunk: string): string
  reload(): Promise<void>
  cleanup(): Promise<unknown>

  /* Helpers */
  request: RequestHelper
}

type RunBrowserOptions = SpawnServerOptions & {
  preventInitialLoad?: boolean
}

export const runBrowserWith = async (
  mockDefinitionPath: string,
  options?: RunBrowserOptions,
): Promise<TestAPI> => {
  const { server, origin } = await spawnServer(mockDefinitionPath, options)
  const browser = await puppeteer.launch({
    headless: !process.env.DEBUG,
    devtools: !!process.env.DEBUG,
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()

  const api: TestAPI = {
    server,
    origin,
    browser,
    page,
    makeUrl(chunk) {
      return new URL(chunk, origin).toString()
    },
    cleanup() {
      // Do not close browser/server when running tests in debug mode.
      // This leaves the browser open, so its state could be observed.
      if (!!process.env.DEBUG) {
        return null
      }

      return new Promise<void>((resolve, reject) => {
        browser
          .close()
          .then(() => {
            server.close(resolve)
          })
          .catch(reject)
      })
    },
    async reload() {
      await page.goto(origin, {
        waitUntil: 'networkidle0',
      })
    },
    request: createRequestHelper(page),
  }

  if (!options?.preventInitialLoad) {
    await api.reload()
  }

  process.on('exit', api.cleanup)

  return api
}
