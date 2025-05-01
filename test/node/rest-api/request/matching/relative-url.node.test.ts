// @vitest-environment jsdom
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/api/movies', () => {
    return HttpResponse.json([
      { title: 'The Lord of the Rings' },
      { title: 'The Matrix' },
    ])
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('responds to a relative URL in jsdom', async () => {
  const response = await fetch('/api/movies')

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual([
    { title: 'The Lord of the Rings' },
    { title: 'The Matrix' },
  ])
})
