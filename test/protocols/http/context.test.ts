import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

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

const test = defineNetwork({ handlers })

test('composes various context utilities into a valid mocked response', async ({
  fetch,
}) => {
  const res = await fetch('https://test.mswjs.io/')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toEqual(201)
  expect(res.statusText()).toEqual('Yahoo!')
  expect(res.fromServiceWorker()).toBe(true)
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(headers).toHaveProperty('accept', 'foo/bar')
  expect(headers).toHaveProperty('custom-header', 'arbitrary-value')
  expect(body).toEqual({
    mocked: true,
  })
})
