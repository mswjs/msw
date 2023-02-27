import { test, expect } from '../../../playwright.extend'

test('handles FormData as a request body', async ({
  loadExample,
  page,
  makeUrl,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'), {
    markup: require.resolve('./body-form-data.page.html'),
  })

  page.click('button')

  const res = await page.waitForResponse(makeUrl('/deprecated'))
  const status = res.status()
  const json = await res.json()

  expect(status).toBe(200)
  expect(json).toEqual({
    username: 'john.maverick',
    password: 'secret123',
  })
})
