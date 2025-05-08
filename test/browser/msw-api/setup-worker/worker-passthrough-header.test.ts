import { HttpServer } from '@open-draft/test-server/lib/http'
import { test, expect } from '../../playwright.extend'

const httpServer = new HttpServer((app) => {
  app.get('/resource', (req, res) => {
    res.set(req.headers)
    res.send('hello world')
  })
})

test.beforeAll(async () => {
  await httpServer.listen()
})

test.afterAll(async () => {
  await httpServer.close()
})

test('removes the internal passthrough request header', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./worker-passthrough-header.mocks.ts'))

  const response = await fetch(httpServer.http.url('/resource'), {
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
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./worker-passthrough-header.mocks.ts'))

  const response = await fetch(httpServer.http.url('/resource'), {
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
