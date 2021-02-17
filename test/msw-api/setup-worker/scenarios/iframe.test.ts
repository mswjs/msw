import * as path from 'path'
import { pageWith } from 'page-with'

declare namespace window {
  export const request: () => Promise<any>
}

test('intercepts a request made in an iframe (nested client)', async () => {
  const { page } = await pageWith({
    example: path.resolve(__dirname, 'iframe.mocks.ts'),
  })

  const frame = page
    .mainFrame()
    .childFrames()
    .find((frame) => frame.name() === '')

  await frame.evaluate(() => window.request())
  const firstNameElement = await frame.waitForSelector('#first-name')
  const firstName = await firstNameElement.evaluate((node) => node.textContent)

  expect(firstName).toBe('John')
})
