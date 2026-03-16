import * as express from 'express'
import type { Frame, Page } from '@playwright/test'
import { test, expect } from '../../../../playwright.extend'

const staticMiddleware = (router: express.Router) => {
  router.use(express.static(new URL('./', import.meta.url).pathname))
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
      markup: new URL('app.html', import.meta.url).pathname,
      beforeNavigation(compilation) {
        compilation.use(staticMiddleware)
      },
    },
  )

  // Add iframes dynamically after `window.msw` is set on the parent
  // to prevent the iframe scripts from racing with the mocks setup.
  await page.evaluate(() => {
    for (const [id, src] of [
      ['frame-one', './one.html'],
      ['frame-two', './two.html'],
    ]) {
      const iframe = document.createElement('iframe')
      iframe.id = id
      iframe.name = id
      iframe.src = src
      document.body.appendChild(iframe)
    }
  })

  // Wait for child frames to be attached and navigated.
  await page.waitForFunction(() => {
    return document.querySelectorAll('iframe').length === 2
  })
  const frameOne = getFrameById('frame-one', page)
  const frameTwo = getFrameById('frame-two', page)

  // Wait for the iframe scripts to load and define `window.request`.
  await Promise.all([
    frameOne.waitForFunction(() => typeof window.request === 'function'),
    frameTwo.waitForFunction(() => typeof window.request === 'function'),
  ])

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
