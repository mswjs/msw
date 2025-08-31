import type { AxiosResponse } from 'axios'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export let upload: () => Promise<
    AxiosResponse<{ message: string; content: string }>
  >
  export let progressEvents: Array<ProgressEvent>
}

test('responds with a mocked response to an upload request', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./axios-upload.runtime.js', import.meta.url))

  const uploadResult = await page.evaluate(() => {
    return window.upload().then((response) => response.data)
  })

  expect(uploadResult).toEqual({
    message: 'Successfully uploaded "doc.txt"!',
    content: 'Helloworld',
  })

  const progressEvents = await page.evaluate(() => {
    return window.progressEvents
  })

  expect(progressEvents.length).toBeGreaterThan(0)
  expect(progressEvents[0]).toMatchObject({
    bytes: expect.any(Number),
    loaded: expect.any(Number),
  })
})
