/// <reference types="msw/vite/client" />
/**
 * @see https://github.com/mswjs/msw/issues/2799
 */
import { http, HttpResponse } from 'msw/http'
import { network } from 'virtual:msw'

beforeAll(async () => {
  await network.enable()
})

afterEach(() => {
  network.resetHandlers()
})

afterAll(async () => {
  await network.disable()
})

test('applies a handler override from the virtual module network', async () => {
  network.use(
    http.get('http://localhost/user', () => {
      return HttpResponse.json({ id: 42, username: 'john' })
    }),
  )

  const response = await fetch('http://localhost/user')

  expect.soft(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({ id: 42, username: 'john' })
})
