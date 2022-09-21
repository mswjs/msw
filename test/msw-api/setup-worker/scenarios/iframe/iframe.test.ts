import * as path from 'path'
import { Frame } from 'playwright'
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
  router.use(express.static(__dirname))
}

test('intercepts a request from an iframe (nested client)', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./iframe.mocks.ts'), {
    markup: path.resolve(__dirname, 'page-in-iframe.html'),
    beforeNavigation(compilation) {
      compilation.use(staticMiddleware)
    },
  })

  const frame = page.mainFrame().childFrames().find(findFrame)
  await frame.evaluate(() => window.request())

  const firstNameElement = await frame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})

test('intercepts a request from a deeply nested iframe', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./iframe.mocks.ts'), {
    markup: path.resolve(__dirname, 'page-in-nested-iframe.html'),
    beforeNavigation(compilation) {
      compilation.use(staticMiddleware)
    },
  })

  const deepFrame = page
    .mainFrame()
    .childFrames()
    .find(findFrame)
    .childFrames()
    .find(findFrame)

  await deepFrame.evaluate(() => window.request())
  const firstNameElement = await deepFrame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})

test('intercepts a request from a deeply nested iframe given MSW is registered in a parent nested iframe', async ({
  loadExample,
  previewServer,
  page,
}) => {
  await loadExample(require.resolve('./iframe.mocks.ts'), {
    markup: path.resolve(__dirname, 'page-in-iframe.html'),
    beforeNavigation(compilation) {
      compilation.use(staticMiddleware)
    },
  })

  // Intentionally empty compilation just to serve
  // a custom page with an embedded iframe.
  await previewServer.compile([], {
    markup: `<iframe src="${page.url()}"></iframe>`,
  })

  const deepFrame = page.mainFrame().childFrames().find(findFrame)
  await deepFrame.evaluate(() => window.request())
  const firstNameElement = await deepFrame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})

test('intercepts a request from an iframe given MSW is registered in a sibling iframe', async ({
  loadExample,
  previewServer,
  page,
  context,
}) => {
  // A frame that registers MSW, but does no requests.
  await loadExample(require.resolve('./iframe.mocks.ts'))

  // A request-issuing frame. Here lives the `window.fetch` call.
  const requestPage = await context.newPage()
  const requestCompilation = await previewServer.compile([], {
    markup: path.resolve(__dirname, 'page-in-iframe.html'),
  })
  requestCompilation.use(staticMiddleware)
  await requestPage.goto(requestCompilation.previewUrl)

  // A parent frame that hosts two frames above.
  const parentPage = await context.newPage()
  const parentCompilation = await previewServer.compile([], {
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
    .find(findFrame)
    .childFrames()
    .find(findFrame)

  await frame.evaluate(() => window.request())
  const firstNameElement = await frame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})
