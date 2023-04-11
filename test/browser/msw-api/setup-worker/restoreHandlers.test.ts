import { rest, HttpResponse } from 'msw'
import { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
    HttpResponse: typeof HttpResponse
  }
}

test('returns a mocked response from the used one-time request handler when restored', async ({
  loadExample,
  page,
  fetch,
}) => {
  await loadExample(require.resolve('./use.mocks.ts'))

  await page.evaluate(() => {
    const { worker, rest, HttpResponse } = window.msw

    worker.use(
      rest.get<{ bookId: string }>(
        '/book/:bookId',
        () => {
          return HttpResponse.json({ title: 'One-time override' })
        },
        { once: true },
      ),
    )
  })

  // One-time request handler hasn't been used yet,
  // so expect its response upon first request hit.
  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override' })

  // One-time request handler has been used, so expect
  // the original response.
  const secondBookResponse = await fetch('/book/abc-123')
  const secondBookStatus = secondBookResponse.status()
  const secondBookBody = await secondBookResponse.json()
  expect(secondBookStatus).toBe(200)
  expect(secondBookBody).toEqual({ title: 'Original title' })

  // Restore the one-time request handlers, marking them as unused.
  await page.evaluate(() => {
    const { worker } = window.msw
    worker.restoreHandlers()
  })

  // Once restored, one-time request handler affect network again.
  const thirdBookResponse = await fetch('/book/abc-123')
  const thirdBookStatus = thirdBookResponse.status()
  const thirdBookBody = await thirdBookResponse.json()
  expect(thirdBookStatus).toBe(200)
  expect(thirdBookBody).toEqual({ title: 'One-time override' })
})
