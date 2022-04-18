import * as path from 'path'
import { Frame } from 'playwright'
import { pageWith } from 'page-with'

declare namespace window {
  export const request: () => Promise<any>
}

function findFrame(frame: Frame) {
  return frame.name() === ''
}

// This has proven to be a rather flaky test.
// Retry it a couple of times before failing the entire CI.
jest.retryTimes(3)

beforeAll(() => {
  jest.spyOn(global.console, 'warn')
})

afterAll(() => {
  jest.restoreAllMocks()
})

test('intercepts a request from an iframe (nested client)', async () => {
  const { page } = await pageWith({
    example: path.resolve(__dirname, 'iframe.mocks.ts'),
    markup: path.resolve(__dirname, 'page-in-iframe.html'),
    contentBase: path.resolve(__dirname),
  })

  const frame = page.mainFrame().childFrames().find(findFrame)
  await frame.evaluate(() => window.request())

  const firstNameElement = await frame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
  expect(console.warn).not.toHaveBeenCalled()
})

test('intercepts a request from a deeply nested iframe', async () => {
  const { page } = await pageWith({
    example: path.resolve(__dirname, 'iframe.mocks.ts'),
    markup: path.resolve(__dirname, 'page-in-nested-iframe.html'),
    contentBase: path.resolve(__dirname),
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
  expect(console.warn).not.toHaveBeenCalled()
})

test('intercepts a request from a deeply nested iframe given MSW is registered in a parent nested iframe', async () => {
  const nestedFrame = await pageWith({
    title: 'MSW frame',
    example: path.resolve(__dirname, 'iframe.mocks.ts'),
    markup: path.resolve(__dirname, 'page-in-iframe.html'),
    contentBase: path.resolve(__dirname),
  })

  await pageWith({
    title: 'Top frame (no MSW)',
    example: null,
    markup: `<iframe src="${nestedFrame.page.url()}"></iframe>`,
  })

  const deepFrame = nestedFrame.page.mainFrame().childFrames().find(findFrame)
  await deepFrame.evaluate(() => window.request())
  const firstNameElement = await deepFrame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
  expect(console.warn).not.toHaveBeenCalled()
})

test('intercepts a request from an iframe given MSW is registered in a sibling iframe', async () => {
  // A request-issuing frame. Here lives the `window.fetch` call.
  const requestFrame = await pageWith({
    title: 'Request frame',
    example: null,
    markup: path.resolve(__dirname, 'page-in-iframe.html'),
    contentBase: path.resolve(__dirname),
  })

  // A frame that registers MSW, but does no requests.
  const mswFrame = await pageWith({
    title: 'MSW frame',
    example: path.resolve(__dirname, 'iframe.mocks.ts'),
    contentBase: path.resolve(__dirname),
  })

  // A parent frame that hosts two frames above.
  const parentPage = await pageWith({
    title: 'Parent page',
    example: null,
    markup: `
<iframe src="${requestFrame.page.url()}"></iframe>
<iframe src="${mswFrame.page.url()}"></iframe>
    `,
  })

  await parentPage.page.bringToFront()

  const frame = parentPage.page
    .mainFrame()
    .childFrames()
    .find(findFrame)
    .childFrames()
    .find(findFrame)

  await frame.evaluate(() => window.request())
  const firstNameElement = await frame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
  expect(console.warn).not.toHaveBeenCalled()
})
