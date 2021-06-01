import * as path from 'path'
import * as cookieUtils from 'cookie'
import { pageWith } from 'page-with'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'

function createRuntime() {
  return pageWith({ example: path.resolve(__dirname, 'cookies.mocks.ts') })
}

test('sets cookie on the mocked response', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: `
      query me {
        id
      }
    `,
  })

  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).not.toHaveProperty('set-cookie')
  expect(body).toEqual({
    data: {
      id: '00000000-0000-0000-0000-000000000000',
    },
  })

  // Should be able to access the response cookies.
  const cookieString = await runtime.page.evaluate(() => {
    return document.cookie
  })
  const allCookies = cookieUtils.parse(cookieString)
  expect(allCookies).toHaveProperty('test-cookie', 'value')
})
