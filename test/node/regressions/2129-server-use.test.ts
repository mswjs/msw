/**
 * @vitest-environment node
 * @see https://github.com/mswjs/msw/issues/2129
 */
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(async () => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
})

it('does not override existing handlers when adding override for a different method', async () => {
  server.use(
    http.get('http://localhost/v1/issues', () => {
      return HttpResponse.text('get-body')
    }),
  )
  server.use(
    http.post('http://localhost/v1/issues', () => {
      return HttpResponse.text('post-body')
    }),
  )

  const geetResponse = await fetch('http://localhost/v1/issues')
  expect(await geetResponse.text()).toBe('get-body')

  const postResponse = await fetch('http://localhost/v1/issues', {
    method: 'POST',
  })
  expect(await postResponse.text()).toBe('post-body')
})
