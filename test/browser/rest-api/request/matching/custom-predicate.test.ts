import { http } from 'msw'
import { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    http: typeof http
  }
}

const PREDICATE_EXAMPLE = new URL(
  './custom-predicate.mocks.ts',
  import.meta.url,
)

test('matches the request when the predicate function returns true', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(PREDICATE_EXAMPLE)

  await page.evaluate(() => {
    const { worker, http } = window.msw

    worker.use(
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
  })

  const response = await fetch('/irrelevant', {
    method: 'POST',
    body: 'hello world',
  })

  expect.soft(response.status()).toBe(200)
  await expect.soft(response.text()).resolves.toBe('hello world')
})

test('does not match the request when the predicate function returns false', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(PREDICATE_EXAMPLE)

  await page.evaluate(() => {
    const { worker, http } = window.msw

    worker.use(
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
  })

  const response = await fetch('/irrelevant', {
    method: 'POST',
    body: 'non-matching-request',
  })

  expect(response.status()).toBe(404)
})
