/**
 * @vitest-environment jsdom
 */
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/initial', () => {
    return HttpResponse.text('initial')
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

describe.concurrent('concurrent tests', () => {
  it(
    'resolves request against the initial handlers',
    server.boundary(async () => {
      const response = await fetch('/initial')
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('initial')
    }),
  )

  it(
    'resolves request against the in-test handler override',
    server.boundary(async () => {
      server.use(
        http.get('/initial', () => {
          return HttpResponse.text('override')
        }),
      )

      const response = await fetch('/initial')
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('override')
    }),
  )

  it(
    'resolves requests against the initial handlers again',
    server.boundary(async () => {
      const response = await fetch('/initial')
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('initial')
    }),
  )
})
