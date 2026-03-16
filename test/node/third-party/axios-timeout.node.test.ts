// @vitest-environment node
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
    http.get('http://localhost/slow', async () => {
      await delay(500)
      return HttpResponse.json({ ok: true })
    }),
  )

  const error = await axios('http://localhost/slow', { timeout: 50 })
    .then(() => {
      expect.fail('Request must not succeed')
    })
    .catch((error) => error as AxiosError)

  expect(error).toBeInstanceOf(AxiosError)
  expect(error).toMatchObject<Partial<AxiosError>>({
    code: 'ECONNABORTED',
    message: expect.stringMatching(/timeout/i),
  })
})

it("axios does not time out when the handler's delay is less than axios timeout", async () => {
  server.use(
    http.get('http://localhost/fast', async () => {
      await delay(50)
      return HttpResponse.json({ ok: true })
    }),
  )

  const response = await axios('http://localhost/fast', { timeout: 200 })

  expect(response.data).toEqual({ ok: true })
})
