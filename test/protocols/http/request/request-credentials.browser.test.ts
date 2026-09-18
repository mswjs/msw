import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../setup/vitest-helpers'

function bakeCookies(cookies: Array<string>): void {
  document.cookie.split(';').forEach((cookie) => {
    const [name] = cookie.trim().split('=')
    document.cookie = `${name}=; Max-Age=0; Path=/`
  })

  cookies.forEach((cookie) => {
    document.cookie = cookie
  })
}

const handlers = [
  http.get('*/cookies', ({ cookies }) => {
    return HttpResponse.json(cookies)
  }),
]

const test = defineTestNetwork({ handlers })

test.afterEach(() => {
  document.cookie.split(';').forEach((cookie) => {
    const [name] = cookie.trim().split('=')
    document.cookie = `${name}=; Max-Age=0; Path=/`
  })
})

test('returns empty object for request with "credentials: omit"', async ({
  fetch,
  page,
}) => {
  bakeCookies(['documentCookie=value'])
  const response = await fetch('/cookies', { credentials: 'omit' })

  expect.soft(response.status()).toBe(200)
  await expect.soft(response.json()).resolves.toEqual({})
})

test('returns empty object for cross-origin request with "credentials: same-origin"', async ({
  fetch,
  page,
}) => {
  bakeCookies(['documentCookie=value'])
  const response = await fetch('https://example.com/cookies', {
    credentials: 'same-origin',
  })

  expect.soft(response.status()).toBe(200)
  await expect.soft(response.json()).resolves.toEqual({})
})

test('returns cookies for same-origin request with "credentials: same-origin"', async ({
  fetch,
  page,
}) => {
  bakeCookies(['documentCookie=value'])
  const response = await fetch('/cookies', {
    credentials: 'same-origin',
  })

  expect.soft(response.status()).toBe(200)
  await expect.soft(response.json()).resolves.toEqual({
    documentCookie: 'value',
  })
})

test('returns cookies for same-origin request with "credentials: include"', async ({
  fetch,
  page,
}) => {
  bakeCookies(['firstCookie=value', 'secondCookie=anotherValue'])
  const response = await fetch('/cookies', {
    credentials: 'include',
  })

  expect.soft(response.status()).toBe(200)
  await expect.soft(response.json()).resolves.toEqual({
    firstCookie: 'value',
    secondCookie: 'anotherValue',
  })
})

test('returns cookies for cross-origin request with "credentials: include"', async ({
  fetch,
  page,
}) => {
  bakeCookies(['documentCookie=value'])
  const response = await fetch('https://example.com/cookies', {
    credentials: 'include',
  })

  expect.soft(response.status()).toBe(200)
  await expect.soft(response.json()).resolves.toEqual({
    documentCookie: 'value',
  })
})
