// @vitest-environment node
import axios, { AxiosError } from 'axios'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('https://example.com/resource', () => {
    return HttpResponse.json({ errorMessage: 'Custom error' }, { status: 400 })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('responds with an error response to axios request', async () => {
  const error = await axios('https://example.com/resource')
    .then(() => {
      throw new Error('Must reject the request Promise')
    })
    .catch((error) => error as AxiosError)

  expect(error.response?.status).toBe(400)
  expect(error.response?.data).toEqual({ errorMessage: 'Custom error' })
})
