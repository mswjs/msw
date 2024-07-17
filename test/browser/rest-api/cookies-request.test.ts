import { Page } from '@playwright/test'
import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = require.resolve('./cookies-request.mocks.ts')

async function bakeCookies(page: Page) {
  await page.evaluate(() => {
    document.cookie = 'auth-token=abc-123;'
    document.cookie = 'custom-cookie=yes;'
  })
}

test('exposes all document cookies if request "credentials" is "include"', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)
  await bakeCookies(page)

  const response = await fetch('/user', {
    credentials: 'include',
  })

  await expect(response.json()).resolves.toEqual({
    cookies: {
      'auth-token': 'abc-123',
      'custom-cookie': 'yes',
    },
  })
})

test('exposes document cookies if request "credentials" is "same-origin" for same-origin request', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)
  await bakeCookies(page)

  const response = await fetch('/user', {
    credentials: 'same-origin',
  })

  await expect(response.json()).resolves.toEqual({
    cookies: {
      'auth-token': 'abc-123',
      'custom-cookie': 'yes',
    },
  })
})

test('exposes no cookies if request "credentials" is "same-origin" for a cross-origin request', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)
  await bakeCookies(page)

  const response = await fetch('https://test.mswjs.io/user', {
    credentials: 'same-origin',
  })

  await expect(response.json()).resolves.toEqual({
    cookies: {},
  })
})

test('exposes no cookies if request "credentials" is "omit"', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)
  await bakeCookies(page)

  const response = await fetch('/user', {
    credentials: 'omit',
  })

  await expect(response.json()).resolves.toEqual({
    cookies: {},
  })
})
