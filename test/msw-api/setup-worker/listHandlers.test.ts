import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi, rest, graphql } from 'msw'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
    graphql: typeof graphql
  }
}

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'printHandlers.mocks.ts'),
  })
}

test('lists all current request handlers', async () => {
  const runtime = await createRuntime()

  const handlerHeaders = await runtime.page.evaluate(() => {
    const handlers = window.msw.worker.listHandlers()
    return handlers.map((handler) => handler.info.header)
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

test('forbids from modifying the list of handlers', async () => {
  const runtime = await createRuntime()

  /**
   * @note For some reason, property assignment on frozen object
   * does not throw an error: handlers[0] = 1
   */
  await expect(
    runtime.page.evaluate(() => {
      const handlers = window.msw.worker.listHandlers()
      // @ts-expect-error Intentional runtime misusage.
      handlers.push(1)
    }),
  ).rejects.toThrow(/Cannot add property \d+, object is not extensible/)
})

test('includes runtime request handlers when listing handlers', async () => {
  const runtime = await createRuntime()

  const handlerHeaders = await runtime.page.evaluate(() => {
    const { worker, rest, graphql } = window.msw
    worker.use(
      rest.get('https://test.mswjs.io/book/:bookId', () => void 0),
      graphql.query('GetRandomNumber', () => void 0),
    )
    const handlers = worker.listHandlers()
    return handlers.map((handler) => handler.info.header)
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
