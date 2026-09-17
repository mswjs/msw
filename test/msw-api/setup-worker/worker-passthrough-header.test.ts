import { http, passthrough } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/resource', function originalResolver() {
    return passthrough()
  }),
]

const test = defineNetwork({ handlers })

test('removes the internal passthrough request header', async ({
  fetch,
  testServer,
}) => {
  const response = await fetch(testServer.http.url('/passthrough-resource'), {
    headers: { 'x-custom-header': 'yes' },
  })
  const headers = await response.allHeaders()

  expect(headers).toMatchObject({
    // The default header value.
    accept: '*/*',
    'x-custom-header': 'yes',
  })
  await expect(response.text()).resolves.toBe('hello world')
})

test('preserves existing "accept" header values when removing the internal passthrough request header', async ({
  fetch,
  testServer,
}) => {
  const response = await fetch(testServer.http.url('/passthrough-resource'), {
    headers: {
      accept: 'text/plain, application/json',
      'x-custom-header': 'yes',
    },
  })
  const headers = await response.allHeaders()

  expect(headers).toMatchObject({
    accept: 'text/plain, application/json',
    'x-custom-header': 'yes',
  })
  await expect(response.text()).resolves.toBe('hello world')
})
