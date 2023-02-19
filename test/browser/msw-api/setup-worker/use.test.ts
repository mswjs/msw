import { SetupWorkerApi, rest } from 'msw'
import { test, expect } from '../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
  }
}

test('returns a mocked response from a runtime request handler upon match', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./use.mocks.ts'))

  await page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.post('/login', function postLoginResolver(req, res, ctx) {
        return res(ctx.json({ accepted: true }))
      }),
    )
  })

  const loginResponse = await fetch('/login', {
    method: 'POST',
  })
  const loginStatus = loginResponse.status()
  const loginBody = await loginResponse.json()
  expect(loginStatus).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Other request handlers are preserved, if there are no overlaps.
  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a persistent request handler override', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./use.mocks.ts'))

  await page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.get('/book/:bookId', function permanentOverride(req, res, ctx) {
        return res(ctx.json({ title: 'Permanent override' }))
      }),
    )
  })

  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'Permanent override' })

  const anotherBookResponse = await fetch('/book/abc-123')
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Permanent override' })
})

test('returns a mocked response from a one-time request handler override only upon first request match', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./use.mocks.ts'))

  await page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.get('/book/:bookId', function oneTimeOverride(req, res, ctx) {
        return res.once(ctx.json({ title: 'One-time override' }))
      }),
    )
  })

  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override' })

  const anotherBookResponse = await fetch('/book/abc-123')
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a one-time request handler override only upon first request match with parallel requests', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./use.mocks.ts'))

  await page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.get('/book/:bookId', function oneTimeOverride(req, res, ctx) {
        const { bookId } = req.params
        return res.once(ctx.json({ title: 'One-time override', bookId }))
      }),
    )
  })

  const bookPromise = fetch('/book/abc-123')

  const anotherBookPromise = fetch('/book/abc-123')

  const bookResponse = await bookPromise
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override', bookId: 'abc-123' })

  const anotherBookResponse = await anotherBookPromise
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Original title' })
})
