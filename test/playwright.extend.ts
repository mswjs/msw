import * as crypto from 'crypto'
import { test as base, expect, Response } from '@playwright/test'
import {
  Headers,
  headersToObject,
  flattenHeadersObject,
} from 'headers-polyfill'

interface CustomFixtures {
  loadExample(entry: string): Promise<void>
  fetch(url: string, init?: RequestInit): Promise<Response>
  makeUrl(path: string): string
}

export const test = base.extend<CustomFixtures>({
  async loadExample({ page, request }, use) {
    await use(async (entry) => {
      const res = await request.post(
        `${process.env.WEBPACK_SERVER_URL}/compilation`,
        { data: { entry } },
      )
      const result = await res.json()

      await page.goto(result.previewUrl, { waitUntil: 'networkidle' })
    })
  },
  async fetch({ page }, use) {
    await use(async (url, init) => {
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
})

export { expect }
