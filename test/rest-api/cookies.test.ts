import * as path from 'path'
import * as cookieUtils from 'cookie'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({ example: path.resolve(__dirname, 'cookies.mocks.ts') })
}

test('allows setting cookies on the mocked response', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/user')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).not.toHaveProperty('set-cookie')
  expect(body).toEqual({
    mocked: true,
  })

  // Should be able to access the response cookies.
  const cookieString = await runtime.page.evaluate(() => {
    return document.cookie
  })
  const allCookies = cookieUtils.parse(cookieString)
  expect(allCookies).toEqual({ myCookie: 'value' })
})

test('allows setting multiple response cookies', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/order')
  const headers = await res.allHeaders()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).not.toHaveProperty('set-cookie')

  const cookieString = await runtime.page.evaluate(() => {
    return document.cookie
  })
  const allCookies = cookieUtils.parse(cookieString)
  expect(allCookies).toEqual({
    firstCookie: 'yes',
    secondCookie: 'no',
  })
})
