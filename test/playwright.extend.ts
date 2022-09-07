import { test as base, expect, Response } from '@playwright/test'

interface CustomFixtures {
  loadExample(entry: string): Promise<void>
  fetch(url: string): Promise<Response>
}

export const test = base.extend<CustomFixtures>({
  async loadExample({ page, request }, use) {
    await use(async (entry) => {
      const res = await request.post(
        `${process.env.WEBPACK_SERVER_URL}/compilation`,
        { data: { entry } },
      )
      const result = await res.json()

      await page.goto(result.previewUrl, { waitUntil: 'networkidle' })
    })
  },
  async fetch({ page }, use) {
    await use(async (url) => {
      page.evaluate((url) => fetch(url), url)
      return page.waitForResponse(url)
    })
  },
})

export { expect }
