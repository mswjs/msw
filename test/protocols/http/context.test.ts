import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('https://test.mswjs.io/', () => {
    return HttpResponse.json(
      { mocked: true },
      {
        status: 201,
        statusText: 'Yahoo!',
        headers: {
          Accept: 'foo/bar',
          'Custom-Header': 'arbitrary-value',
        },
      },
    )
  }),
]

const test = defineTestNetwork({ handlers })

test('composes various context utilities into a valid mocked response', async ({
  fetch,
}) => {
  const response = await fetch('https://test.mswjs.io/')
  const headers = await response.allHeaders()
  const body = await response.json()

  expect(response.status()).toEqual(201)
  expect(response.statusText()).toEqual('Yahoo!')
  expect(response.fromServiceWorker()).toBe(true)
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(headers).toHaveProperty('accept', 'foo/bar')
  expect(headers).toHaveProperty('custom-header', 'arbitrary-value')
  expect(body).toEqual({
    mocked: true,
  })
})
