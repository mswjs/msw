import * as path from 'path'
import * as cookieUtils from 'cookie'
import { Page, pageWith } from 'page-with'

function createRuntime() {
  return pageWith({ example: path.resolve(__dirname, 'cookies.mocks.ts') })
}

async function getDocumentCookies(
  page: Page,
): Promise<Array<Record<string, string>>> {
  const documentCookie = await page.evaluate(() => {
    return document.cookie
  })

  const allCookies = documentCookie.split('; ').map((cookieString) => {
    // The cookie parser only supports one cookie string at a time.
    return cookieUtils.parse(cookieString)
  })

  return allCookies
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

  // Must forward the mocked response cookie to the document.
  const allCookies = await getDocumentCookies(runtime.page)
  expect(allCookies).toEqual([
    {
      /**
       * @note There's no way to read cookie attributes
       * in JavaScript. "document.cookie" strips them.
       */
      myCookie: 'value',
    },
  ])
})

test('allows setting multiple response cookies', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/order')
  const headers = await res.allHeaders()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).not.toHaveProperty('set-cookie')

  const allCookies = await getDocumentCookies(runtime.page)

  expect(allCookies).toEqual([
    {
      firstCookie: 'yes',
    },
    {
      secondCookie: 'no',
    },
  ])
})
