/**
 * @vitest-environment node
 */
import axios, { AxiosError } from 'axios'
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it("axios times out when the handler's delay is greater than axios timeout", async () => {
  server.use(
    http.get('https://example.com/slow', async () => {
      await delay(500)
      return HttpResponse.json({ ok: true })
    }),
  )

  const error = await axios('https://example.com/slow', { timeout: 50 })
    .then(() => {
      throw new Error('Request should have timed out')
    })
    .catch((err) => err as AxiosError)

  expect(error).toBeInstanceOf(Error)
  expect((error as AxiosError).code).toBe('ECONNABORTED')
  expect((error as AxiosError).message).toMatch(/timeout/i)
})

it("axios does not time out when the handler's delay is less than axios timeout", async () => {
  server.use(
    http.get('https://example.com/fast', async () => {
      await delay(50)
      return HttpResponse.json({ ok: true })
    }),
  )

  const res = await axios('https://example.com/fast', { timeout: 200 })

  expect(res.data).toEqual({ ok: true })
})
