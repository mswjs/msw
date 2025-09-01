import cookieUtils from '@bundled-es-modules/cookie'
import { test, expect } from '../playwright.extend'
import { gql } from '../../support/graphql'

test('sets cookie on the mocked GraphQL response', async ({
  loadExample,
  query,
  page,
}) => {
  await loadExample(new URL('./cookies.mocks.ts', import.meta.url))

  const res = await query('/graphql', {
    query: gql`
      query GetUser {
        firstName
      }
    `,
  })

  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(headers).not.toHaveProperty('set-cookie')
  expect(body).toEqual({
    data: {
      firstName: 'John',
    },
  })

  // Should be able to access the response cookies.
  const cookieString = await page.evaluate(() => {
    return document.cookie
  })
  const allCookies = cookieUtils.parse(cookieString)
  expect(allCookies).toHaveProperty('test-cookie', 'value')
})
