import * as cookieUtils from 'cookie'
import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = require.resolve('./cookies.mocks.ts')

test('allows setting cookies on the mocked response', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/user')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).not.toHaveProperty('set-cookie')
  expect(body).toEqual({
    mocked: true,
  })

  // Should be able to access the response cookies.
  const cookieString = await page.evaluate(() => {
    return document.cookie
  })
  const allCookies = cookieUtils.parse(cookieString)
  expect(allCookies).toEqual({ myCookie: 'value' })
})

test('allows setting multiple response cookies', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/order')
  const headers = await res.allHeaders()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).not.toHaveProperty('set-cookie')

  const cookieString = await page.evaluate(() => {
    return document.cookie
  })
  const allCookies = cookieUtils.parse(cookieString)
  expect(allCookies).toEqual({
    firstCookie: 'yes',
    secondCookie: 'no',
  })
})
