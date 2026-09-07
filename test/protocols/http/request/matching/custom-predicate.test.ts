import { http } from 'msw'
import { test, expect } from '../../../../setup/vitest-helpers'

test('matches the request when the predicate function returns true', async ({
  network,
  fetch,
}) => {
  network.use(
    http.post(
      async ({ request }) => {
        const requestBody = await request.clone().text()
        return requestBody === 'hello world'
      },
      ({ request }) => {
        return new Response(request.clone().body, request)
      },
    ),
  )

  const response = await fetch('/irrelevant', {
    method: 'POST',
    body: 'hello world',
  })

  expect.soft(response.status()).toBe(200)
  await expect.soft(response.text()).resolves.toBe('hello world')
})

test('does not match the request when the predicate function returns false', async ({
  network,
  fetch,
}) => {
  network.use(
    http.post(
      async ({ request }) => {
        const requestBody = await request.clone().text()
        return requestBody === 'hello world'
      },
      ({ request }) => {
        return new Response(request.clone().body, request)
      },
    ),
  )

  const response = await fetch('/irrelevant', {
    method: 'POST',
    body: 'non-matching-request',
  })

  expect(response.status()).toBe(404)
})
