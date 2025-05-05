import { HttpServer } from '@open-draft/test-server/lib/http.js'
import { test, expect } from '../../../playwright.extend'

const server = new HttpServer((app) => {
  app.get('/user', (req, res) => {
    res.json({ uses: 'original' })
  })

  app.post('/user', (req, res) => {
    res.status(500).json({ mocked: false })
  })
})

test.beforeEach(async () => {
  await server.listen()
})

test.afterEach(async () => {
  await server.close()
})

test('sends a mocked response to a matching method and url', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(new URL('./method.mocks.ts', import.meta.url))

  const res = await fetch(server.http.url('/user'), {
    method: 'POST',
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    mocked: true,
  })
})

test('sends original response to a non-matching request', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(new URL('./method.mocks.ts', import.meta.url))

  const res = await fetch(server.http.url('/user'))
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(body).toEqual({ uses: 'original' })
})
