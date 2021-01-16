import * as path from 'path'
import { SetupWorkerApi, rest } from 'msw'
import { runBrowserWith } from '../../support/runBrowserWith'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
  }
}

test('returns a mocked response from a runtime request handler upon match', async () => {
  const runtime = await runBrowserWith(path.resolve(__dirname, 'use.mocks.ts'))

  await runtime.page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.post('/login', function postLoginResolver(req, res, ctx) {
        return res(ctx.json({ accepted: true }))
      }),
    )
  })

  const loginResponse = await runtime.request({
    url: `${runtime.origin}/login`,
    fetchOptions: {
      method: 'POST',
    },
  })
  const loginStatus = loginResponse.status()
  const loginBody = await loginResponse.json()
  expect(loginStatus).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Other request handlers are preserved, if there are no overlaps.
  const bookResponse = await runtime.request({
    url: `${runtime.origin}/book/abc-123`,
  })
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'Original title' })

  await runtime.cleanup()
})

test('returns a mocked response from a persistent request handler override', async () => {
  const runtime = await runBrowserWith(path.resolve(__dirname, 'use.mocks.ts'))

  await runtime.page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.get('/book/:bookId', function permanentOverride(req, res, ctx) {
        return res(ctx.json({ title: 'Permanent override' }))
      }),
    )
  })

  const bookResponse = await runtime.request({
    url: `${runtime.origin}/book/abc-123`,
  })
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'Permanent override' })

  const anotherBookResponse = await runtime.request({
    url: `${runtime.origin}/book/abc-123`,
  })
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Permanent override' })

  await runtime.cleanup()
})

test('returns a mocked response from a one-time request handler override only upon first request match', async () => {
  const runtime = await runBrowserWith(path.resolve(__dirname, 'use.mocks.ts'))

  await runtime.page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.get('/book/:bookId', function oneTimeOverride(req, res, ctx) {
        return res.once(ctx.json({ title: 'One-time override' }))
      }),
    )
  })

  const bookResponse = await runtime.request({
    url: `${runtime.origin}/book/abc-123`,
  })
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override' })

  const anotherBookResponse = await runtime.request({
    url: `${runtime.origin}/book/abc-123`,
  })
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Original title' })

  await runtime.cleanup()
})
