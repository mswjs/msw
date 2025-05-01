import * as url from 'node:url'
import * as path from 'node:path'
import { Frame } from '@playwright/test'
import * as express from 'express'
import { test, expect } from '../../../../playwright.extend'

declare global {
  interface Window {
    request(): Promise<void>
  }
}

function findFrame(frame: Frame) {
  return frame.name() === ''
}

const staticMiddleware = (router: express.Router) => {
  router.use(express.static(path.dirname(import.meta.url)))
}

test('intercepts a request from an iframe (nested client)', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./iframe.mocks.ts', import.meta.url), {
    markup: url.fileURLToPath(
      new URL('./page-in-iframe.html', import.meta.url),
    ),
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
  await loadExample(new URL('./iframe.mocks.ts', import.meta.url), {
    markup: url.fileURLToPath(
      new URL('./page-in-nested-iframe.html', import.meta.url),
    ),
    beforeNavigation(compilation) {
      compilation.use(staticMiddleware)
    },
  })

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
  webpackServer,
  loadExample,
  page,
}) => {
  await loadExample(new URL('./iframe.mocks.ts', import.meta.url), {
    markup: url.fileURLToPath(
      new URL('./page-in-iframe.html', import.meta.url),
    ),
    beforeNavigation(compilation) {
      compilation.use(staticMiddleware)
    },
  })

  // Intentionally empty compilation just to serve
  // a custom page with an embedded iframe.
  await webpackServer.compile([], {
    markup: `<iframe src="${page.url()}"></iframe>`,
  })

  const deepFrame = page.mainFrame().childFrames().find(findFrame)!
  await deepFrame.evaluate(() => window.request())
  const firstNameElement = await deepFrame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})

test('intercepts a request from an iframe given MSW is registered in a sibling iframe', async ({
  webpackServer,
  loadExample,
  page,
  context,
}) => {
  // A frame that registers MSW, but does no requests.
  await loadExample(new URL('./iframe.mocks.ts', import.meta.url))

  // A request-issuing frame. Here lives the `window.fetch` call.
  const requestPage = await context.newPage()
  const requestCompilation = await webpackServer.compile([], {
    markup: url.fileURLToPath(
      new URL('./page-in-iframe.html', import.meta.url),
    ),
  })
  requestCompilation.use(staticMiddleware)
  await requestPage.goto(requestCompilation.previewUrl)

  // A parent frame that hosts two frames above.
  const parentPage = await context.newPage()
  const parentCompilation = await webpackServer.compile([], {
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
