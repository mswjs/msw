import * as path from 'path'
import { captureConsole } from '../../../support/captureConsole'
import { runBrowserWith } from '../../../support/runBrowserWith'

declare namespace window {
  export const request: () => Promise<any>
  export const location: {
    href: string
  }
  export const msw: {
    createIframe: (id: string, src: string) => any
    worker: {
      start: () => any
    }
  }
}

test('intercepts a request made in an iframe (nested client)', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'iframe.mocks.ts'),
  )
  const { messages } = captureConsole(runtime.page)

  runtime.page.evaluate(() => {
    window.msw.createIframe('middle', window.location.href)
  })

  const middle = await runtime.page.waitForSelector('#middle')
  const middleFrame = await middle.contentFrame()
  await middleFrame.waitForSelector('h2')

  await middleFrame.evaluate(() => {
    window.msw.worker.start()
    window.msw.createIframe('iframe', '/test/fixtures/iframe.html')
  })

  const iframe = await middleFrame.waitForSelector('#iframe')
  const childFrame = await iframe.contentFrame()
  await childFrame.evaluate(() => window.request())

  const firstNameElement = await childFrame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
  console.log(messages)

  return runtime.cleanup()
})
