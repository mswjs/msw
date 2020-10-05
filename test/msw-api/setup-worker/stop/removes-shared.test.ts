import * as path from 'path'
import { Page } from 'puppeteer'
import { runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'
import { response } from 'msw/lib/types'

const stopWorkerOn = async (page: Page) => {
  await page.evaluate(() => {
    // @ts-ignore
    return window.__mswStop()
  })

  return new Promise((resolve) => {
    setTimeout(resolve, 1000)
  })
}

test('shares the client registration for all other clients when "shared" option is set to "true"', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'removes-shared.mocks.ts'),
  )
  const { messages } = captureConsole(runtime.page)
  const iframeUrl = `${runtime.origin}/test/support/template/iframe.html`

  await runtime.reload()

  const activationMessage = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW] Shared Mocking enabled.')
  })
  expect(activationMessage).toBeTruthy()

  await runtime.page.evaluate((url) => {
    const iframe = document.createElement('iframe')
    iframe.src = url
    document.body.appendChild(iframe)

    return iframe
  }, iframeUrl)

  await runtime.page.waitForSelector('iframe')
  const element = await runtime.page.$(`iframe[src="${iframeUrl}"]`)
  const frame = await element.contentFrame()

  const before = await frame.evaluate(() => {
    return fetch('https://api.github.com').then((response) => response.json())
  })

  expect(before).toEqual({
    mocked: true,
  })

  await stopWorkerOn(runtime.page)

  const after = await frame.evaluate(() => {
    return fetch('https://api.github.com').then((response) => response.json())
  })

  expect(after).not.toEqual({
    mocked: true,
  })

  return runtime.cleanup()
})
