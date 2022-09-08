import * as crypto from 'crypto'
import { test as base, expect, Response } from '@playwright/test'
import {
  Headers,
  headersToObject,
  flattenHeadersObject,
} from 'headers-polyfill'
import { spyOnConsole, ConsoleMessages } from 'page-with'
import type { CompilationOptions } from 'webpack-http-server'

interface CustomFixtures {
  loadExample(entry: string, options?: CompilationOptions): Promise<void>
  fetch(
    url: string,
    init?: RequestInit,
    predicate?: (res: Response) => boolean,
  ): Promise<Response>
  makeUrl(path: string): string
  spyOnConsole(): ConsoleMessages
}

export const test = base.extend<CustomFixtures>({
  async loadExample({ page, request }, use) {
    await use(async (entry, options = {}) => {
      const res = await request.post(
        `${process.env.WEBPACK_SERVER_URL}/compilation`,
        {
          data: {
            ...options,
            entry,
          },
        },
      )
      const result = await res.json()

      await page.goto(result.previewUrl, { waitUntil: 'networkidle' })
    })
  },
  async fetch({ page }, use) {
    await use(async (url, init, predicate) => {
      const requestId = crypto.createHash('md5').digest('hex')
      const resolvedUrl = url.startsWith('/')
        ? new URL(url, process.env.WEBPACK_SERVER_URL).href
        : url

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

      return page.waitForResponse((res) => {
        if (predicate) {
          return predicate(res)
        }

        const requestHeaders = res.request().headers()
        return requestHeaders[identityHeaderName] === requestId
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
