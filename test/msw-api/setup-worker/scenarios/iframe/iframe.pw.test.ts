import type { Frame } from '@playwright/test'
import * as express from 'express'
import { inlineSource, test, expect } from '../../../../setup/playwright'

const iframeSource = inlineSource(`
import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('*/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

worker.start()
`)

declare global {
  interface Window {
    request(): Promise<void>
  }
}

function findFrame(frame: Frame) {
  return frame.name() === ''
}

const staticMiddleware = (router: express.Router) => {
  router.use(express.static(new URL('./', import.meta.url).pathname))
}

test('intercepts a request from an iframe (nested client)', async ({
  loadExample,
  page,
}) => {
  await loadExample(iframeSource, {
    markup: new URL('page-in-iframe.html', import.meta.url).pathname,
    beforeNavigation(compilation) {
      compilation.use(staticMiddleware)
    },
  })

  const frame = page.mainFrame().childFrames().find(findFrame)!
  await frame.evaluate(() => window.request())

  const firstNameElement = await frame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})

test('intercepts a request from a deeply nested iframe', async ({
  loadExample,
  page,
}) => {
  await loadExample(iframeSource, {
    markup: new URL('page-in-nested-iframe.html', import.meta.url).pathname,
    beforeNavigation(compilation) {
      compilation.use(staticMiddleware)
    },
  })

  // Wait for the nested iframe chain to fully load
  // (main frame + 2 nested iframes).
  await expect.poll(() => page.frames().length).toBeGreaterThanOrEqual(3)

  const deepFrame = page
    .mainFrame()
    .childFrames()
    .find(findFrame)!
    .childFrames()
    .find(findFrame)!

  await deepFrame.evaluate(() => window.request())
  const firstNameElement = await deepFrame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})

test('intercepts a request from a deeply nested iframe given MSW is registered in a parent nested iframe', async ({
  viteServer,
  loadExample,
  page,
}) => {
  await loadExample(iframeSource, {
    markup: new URL('page-in-iframe.html', import.meta.url).pathname,
    beforeNavigation(compilation) {
      compilation.use(staticMiddleware)
    },
  })

  // Intentionally empty compilation just to serve
  // a custom page with an embedded iframe.
  await viteServer.compile([], {
    markup: `<iframe src="${page.url()}"></iframe>`,
  })

  const deepFrame = page.mainFrame().childFrames().find(findFrame)!
  await deepFrame.evaluate(() => window.request())
  const firstNameElement = await deepFrame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})

test('intercepts a request from an iframe given MSW is registered in a sibling iframe', async ({
  viteServer,
  loadExample,
  page,
  context,
}) => {
  // A frame that registers MSW, but does no requests.
  await loadExample(iframeSource)

  // A request-issuing frame. Here lives the `window.fetch` call.
  const requestPage = await context.newPage()
  const requestCompilation = await viteServer.compile([], {
    markup: new URL('page-in-iframe.html', import.meta.url).pathname,
  })
  requestCompilation.use(staticMiddleware)
  await requestPage.goto(requestCompilation.previewUrl)

  // A parent frame that hosts two frames above.
  const parentPage = await context.newPage()
  const parentCompilation = await viteServer.compile([], {
    markup: `
<iframe src="${requestPage.url()}"></iframe>
<iframe src="${page.url()}"></iframe>
      `,
  })
  await parentPage.goto(parentCompilation.previewUrl)
  await parentPage.bringToFront()

  const frame = parentPage
    .mainFrame()
    .childFrames()
    .find(findFrame)!
    .childFrames()
    .find(findFrame)!

  await frame.evaluate(() => window.request())
  const firstNameElement = await frame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})
