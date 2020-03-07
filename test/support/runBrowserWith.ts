import * as puppeteer from 'puppeteer'
import { spawnServer } from './spawnServer'
import WebpackDevServer from 'webpack-dev-server'

export interface TestAPI {
  server: WebpackDevServer
  browser: puppeteer.Browser
  page: puppeteer.Page
  cleanup: () => Promise<unknown>
}

export const runBrowserWith = async (
  mockDefinitionPath: string,
): Promise<TestAPI> => {
  const { server, origin } = await spawnServer(mockDefinitionPath)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  await page.goto(origin, {
    waitUntil: 'networkidle0',
  })

  const cleanup = () => {
    return new Promise((resolve) => {
      browser.close().then(() => {
        server.close(resolve)
      })
    })
  }

  process.on('exit', cleanup)

  return {
    server,
    browser,
    page,
    cleanup,
  }
}
