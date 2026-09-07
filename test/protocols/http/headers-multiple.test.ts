import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.post('https://test.mswjs.io', ({ request }) => {
    return HttpResponse.json({
      'x-header': request.headers.get('x-header'),
    })
  }),
  http.get('https://test.mswjs.io', () => {
    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers: {
          // List header values separated by comma
          // to set multie-value header on the mocked response.
          Accept: 'application/json, image/png',
        },
      },
    )
  }),
]

const test = defineNetwork({ handlers })

test('receives all headers from the request header with multiple values', async ({
  fetch,
}) => {
  const headers = new Headers({ 'x-header': 'application/json' })
  headers.append('x-header', 'application/hal+json')

  const res = await fetch('https://test.mswjs.io', {
    method: 'POST',
    headers: Object.fromEntries(headers.entries()),
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual({
    /**
     * @fixme Multiple headers value becomes incompatible
     * with the latest testing setup changes.
     */
    'x-header': 'application/json, application/hal+json',
  })
})

test('supports setting a header with multiple values on the mocked response', async ({
  fetch,
}) => {
  const res = await fetch('https://test.mswjs.io')
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('accept', 'application/json, image/png')
  expect(body).toEqual({
    mocked: true,
  })
})
