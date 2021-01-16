import * as path from 'path'
import * as cookieUtils from 'cookie'
import { runBrowserWith } from '../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'cookies.mocks.ts'))
}

test('allows setting cookies on the mocked response', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: runtime.makeUrl('/user'),
  })

  const headers = res.headers()
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
  expect(allCookies).toHaveProperty('my-cookie', 'value')

  return runtime.cleanup()
})
