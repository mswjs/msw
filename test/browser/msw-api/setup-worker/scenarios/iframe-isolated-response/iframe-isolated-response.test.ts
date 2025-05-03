import * as url from 'node:url'
import * as express from 'express'
import type { Frame, Page } from '@playwright/test'
import { test, expect } from '../../../../playwright.extend'

function staticMiddleware(router: express.Router) {
  router.use(express.static(url.fileURLToPath(new URL('./', import.meta.url))))
}

export function getFrameById(id: string, page: Page): Frame {
  const frame = page
    .mainFrame()
    .childFrames()
    .find((frame) => frame.name() === id)

  if (!frame) {
    throw new Error(`Unable to find frame with id "${id}" on the page`)
  }

  return frame
}

test('responds with different responses for the same request based on request referrer (frame url)', async ({
  loadExample,
  page,
}) => {
  await loadExample(
    new URL('./iframe-isolated-response.mocks.ts', import.meta.url),
    {
      markup: url.fileURLToPath(new URL('app.html', import.meta.url)),
      beforeNavigation(compilation) {
        compilation.use(staticMiddleware)
      },
    },
  )

  const frameOne = getFrameById('frame-one', page)!
  const frameTwo = getFrameById('frame-two', page)!

  await Promise.all([
    frameOne.evaluate(() => window.request()),
    frameTwo.evaluate(() => window.request()),
  ])

  /**
   * @note Each frame is able to receive a unique response
   * because it uses the `isolatedResolver` utility.
   * It's IMPORTANT it runs in the frame's context. We cannot
   * ship that logic in MSW because MSW always runs in the
   * main thread (the top-level client, which is the parent).
   */
  await expect(frameOne.getByText('one')).toBeVisible()
  await expect(frameTwo.getByText('two')).toBeVisible()
})
