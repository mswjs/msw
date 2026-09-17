import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { parseCookie } from 'cookie'
import { defineNetwork, expect } from '../../setup/vitest-helpers'
import { gql } from '../../support/graphql'

const api = graphql.link('*')

const handlers = [
  api.query('GetUser', () => {
    return HttpResponse.json(
      {
        data: {
          firstName: 'John',
        },
      },
      {
        headers: {
          'Set-Cookie': 'test-cookie=value',
        },
      },
    )
  }),
]

const test = defineNetwork({ handlers })

test('sets cookie on the mocked GraphQL response', async ({ query, page }) => {
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
  const allCookies = parseCookie(cookieString)
  expect(allCookies).toHaveProperty('test-cookie', 'value')
})
