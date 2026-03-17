import { test, expect } from '../../playwright.extend'

test('supports mocking a single response cookie', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(new URL('./response-cookies.mocks.ts', import.meta.url))
  const response = await fetch('/single-cookie')
  const documentCookies = await page.evaluate(() => document.cookie)

  expect(response.status()).toBe(200)
  // Must not expose the forbidden "Set-Cookie" header.
  expect(await response.allHeaders()).not.toHaveProperty('set-cookie')
  // Must set the mocked cookie onto the document.
  expect(documentCookies).toBe('myCookie=value')
})

test('supports mocking multiple response cookies', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(new URL('./response-cookies.mocks.ts', import.meta.url))
  const response = await fetch('/multiple-cookies')
  const documentCookies = await page.evaluate(() => document.cookie)

  expect(response.status()).toBe(200)
  expect(await response.allHeaders()).not.toHaveProperty('set-cookie')
  /**
   * @note The `Max-Age` attribute is not propagated onto the document.
   * If that's unexpected, raise an issue.
   */
  expect(documentCookies).toBe(
    'firstCookie=yes; secondCookie=no; thirdCookie=1,2,3',
  )
})

test('supports mocking cookies via a standalone Headers instance', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(new URL('./response-cookies.mocks.ts', import.meta.url))
  const response = await fetch('/cookies-via-headers')
  const documentCookies = await page.evaluate(() => document.cookie)

  expect(response.status()).toBe(200)
  expect(await response.allHeaders()).not.toHaveProperty('set-cookie')
  expect(documentCookies).toBe('myCookie=value')
})
