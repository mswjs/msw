import { http, graphql } from 'msw'
import { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    http: typeof http
    graphql: typeof graphql
  }
}

const EXAMPLE_PATH = new URL('./listHandlers.mocks.ts', import.meta.url)

test('lists all current request handlers', async ({ loadExample, page }) => {
  await loadExample(EXAMPLE_PATH)

  const handlerHeaders = await page.evaluate(() => {
    const handlers = window.msw.worker.listHandlers()
    return handlers.map((handler) => 'info' in handler && handler.info.header)
  })

  expect(handlerHeaders).toEqual([
    'GET https://test.mswjs.io/book/:bookId',
    'query GetUser (origin: *)',
    'mutation UpdatePost (origin: *)',
    'all (origin: *)',
    'query GetRepo (origin: https://api.github.com)',
    'all (origin: https://api.github.com)',
  ])
})

test('forbids from modifying the list of handlers', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)

  /**
   * @note For some reason, property assignment on frozen object
   * does not throw an error: handlers[0] = 1
   */
  await expect(
    page.evaluate(() => {
      const handlers = window.msw.worker.listHandlers()
      // @ts-expect-error Intentional runtime misusage.
      handlers.push(1)
    }),
  ).rejects.toThrow(/Cannot add property \d+, object is not extensible/)
})

test('includes runtime request handlers when listing handlers', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)

  const handlerHeaders = await page.evaluate(() => {
    const { worker, http, graphql } = window.msw
    worker.use(
      http.get('https://test.mswjs.io/book/:bookId', () => void 0),
      graphql.query('GetRandomNumber', () => void 0),
    )
    const handlers = worker.listHandlers()
    return handlers.map((handler) => 'info' in handler && handler.info.header)
  })

  expect(handlerHeaders).toEqual([
    'GET https://test.mswjs.io/book/:bookId',
    'query GetRandomNumber (origin: *)',
    'GET https://test.mswjs.io/book/:bookId',
    'query GetUser (origin: *)',
    'mutation UpdatePost (origin: *)',
    'all (origin: *)',
    'query GetRepo (origin: https://api.github.com)',
    'all (origin: https://api.github.com)',
  ])
})
