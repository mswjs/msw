import * as path from 'path'
import { Frame } from 'playwright'
import { pageWith } from 'page-with'

declare namespace window {
  export const request: () => Promise<any>
}

function findFrame(frame: Frame) {
  return frame.name() === ''
}

test('intercepts a request from an iframe (nested client)', async () => {
  const { page } = await pageWith({
    example: path.resolve(__dirname, 'iframe.mocks.ts'),
    markup: path.resolve(__dirname, 'iframe.page.html'),
    contentBase: path.resolve(__dirname),
  })

  const frame = page.mainFrame().childFrames().find(findFrame)
  await frame.evaluate(() => window.request())

  const firstNameElement = await frame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})

test('intercepts a request from a deeply nested iframe', async () => {
  const { page } = await pageWith({
    example: path.resolve(__dirname, 'iframe.mocks.ts'),
    markup: path.resolve(__dirname, 'iframe-deep.page.html'),
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
})
