import { http, HttpResponse } from 'msw'
import { expect, test } from '../../../setup/vitest-helpers'

test('supports setting a header with multiple values on the mocked response', async ({
  network,
  fetch,
}) => {
  network.use(
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
  )

  const response = await fetch('https://test.mswjs.io')
  const status = response.status()
  const headers = await response.allHeaders()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('accept', 'application/json, image/png')
  await expect(response.json()).resolves.toEqual({
    mocked: true,
  })
})
