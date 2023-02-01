import { Headers } from 'headers-polyfill'
import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = require.resolve('./headers-multiple.mocks.ts')

test.fixme(
  'receives all headers from the request header with multiple values',
  async ({ loadExample, fetch }) => {
    await loadExample(EXAMPLE_PATH)

    const headers = new Headers({ 'x-header': 'application/json' })
    headers.append('x-header', 'application/hal+json')

    const res = await fetch('https://test.mswjs.io', {
      method: 'POST',
      headers: headers.all(),
    })
    const status = res.status()
    const body = await res.json()

    expect(status).toEqual(200)
    expect(body).toEqual({
      /**
       * @fixme Multiple headers value becomes incompatible
       * with the latest testing setup changes.
       */
      'x-header': 'application/json, application/hal+json',
    })
  },
)

test('supports setting a header with multiple values on the mocked response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('https://test.mswjs.io')
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toEqual(200)
  expect(headers).toHaveProperty('accept', 'application/json, image/png')
  expect(body).toEqual({
    mocked: true,
  })
})
