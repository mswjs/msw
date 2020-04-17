import * as puppeteer from 'puppeteer'
import { match } from 'node-match-path'
import { SpawnServerOptions, spawnServer } from './spawnServer'
import WebpackDevServer from 'webpack-dev-server'

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
    fetchOptions,
    responsePredicate = (res) => {
      // Use native matcher to preserve the standard matching behavior
      // (i.e. disregard trailing slashes).
      return match(url, res.url()).matches
    },
  }) => {
    page.evaluate((a, b) => fetch(a, b), url, fetchOptions)

    return page.waitForResponse((res) => {
      return responsePredicate(res, url)
    })
  }
}

export interface TestAPI {
  server: WebpackDevServer
  origin: string
  browser: puppeteer.Browser
  page: puppeteer.Page
  cleanup: () => Promise<unknown>

  /* Helpers */
  request: RequestHelper
}

export const runBrowserWith = async (
  mockDefinitionPath: string,
  serverOptions?: SpawnServerOptions,
): Promise<TestAPI> => {
  const { server, origin } = await spawnServer(
    mockDefinitionPath,
    serverOptions,
  )

  const browser = await puppeteer.launch({
    headless: !process.env.DEBUG,
    devtools: !!process.env.DEBUG,
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  await page.goto(origin, {
    waitUntil: 'networkidle0',
  })

  const cleanup = () => {
    return new Promise((resolve, reject) => {
      browser
        .close()
        .then(() => {
          server.close(resolve)
        })
        .catch(reject)
    })
  }

  process.on('exit', cleanup)

  return {
    server,
    origin,
    browser,
    page,
    cleanup,
    request: createRequestHelper(page),
  }
}
