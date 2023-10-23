import { Page } from '@playwright/test'
import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = require.resolve('./cookies-request.mocks.ts')

async function bakeCookies(page: Page) {
  await page.evaluate(() => {
    document.cookie = 'auth-token=abc-123;'
    document.cookie = 'custom-cookie=yes;'
  })
}

test('returns all document cookies in "req.cookies" for "include" credentials', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)
  await bakeCookies(page)

  const res = await fetch('/user', {
    credentials: 'include',
  })
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    cookies: {
      'auth-token': 'abc-123',
      'custom-cookie': 'yes',
    },
  })
})

test('returns all document cookies in "req.cookies" for "same-origin" credentials and request to the same origin', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)
  await bakeCookies(page)

  const res = await fetch('/user', {
    credentials: 'same-origin',
  })
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    cookies: {
      'auth-token': 'abc-123',
      'custom-cookie': 'yes',
    },
  })
})

test('returns no cookies in "req.cookies" for "same-origin" credentials and request to a different origin', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)
  await bakeCookies(page)

  const res = await fetch('https://test.mswjs.io/user', {
    credentials: 'same-origin',
  })
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    cookies: {},
  })
})

test('returns no cookies in "req.cookies" for "omit" credentials', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)
  await bakeCookies(page)

  const res = await fetch('/user', {
    credentials: 'omit',
  })
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    cookies: {},
  })
})
