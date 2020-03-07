import * as puppeteer from 'puppeteer'
import { spawnServer } from './spawnServer'
import WebpackDevServer from 'webpack-dev-server'

export interface BootstrapApi {
  server: WebpackDevServer
  browser: puppeteer.Browser
  page: puppeteer.Page
  cleanup: () => Promise<unknown>
}

export const bootstrap = async (
  testComponentPath: string,
): Promise<BootstrapApi> => {
  const { server, origin } = await spawnServer(testComponentPath)
  console.log('Server established at %s', origin)

  // Open the temporary server page in Puppeteer
  const browser = await puppeteer.launch({
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
