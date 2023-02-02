import { SetupWorkerApi, rest, graphql } from 'msw'
import { test, expect } from '../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
    graphql: typeof graphql
  }
}

const PRINT_HANDLERS_EXAMPLE = require.resolve('./printHandlers.mocks.ts')

test('lists rest request handlers', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  await loadExample(PRINT_HANDLERS_EXAMPLE)
  const consoleSpy = spyOnConsole()

  await page.evaluate(() => {
    window.msw.worker.printHandlers()
  })

  const startGroupCollapsed = consoleSpy.get('startGroupCollapsed')

  expect(startGroupCollapsed).toHaveLength(6)
  expect(startGroupCollapsed).toContain(
    '[rest] GET https://test.mswjs.io/book/:bookId',
  )
  expect(startGroupCollapsed).toContain('[graphql] query GetUser (origin: *)')
  expect(startGroupCollapsed).toContain(
    '[graphql] mutation UpdatePost (origin: *)',
  )
  expect(startGroupCollapsed).toContain('[graphql] all (origin: *)')
  expect(startGroupCollapsed).toContain(
    '[graphql] query GetRepo (origin: https://api.github.com)',
  )
  expect(startGroupCollapsed).toContain(
    '[graphql] all (origin: https://api.github.com)',
  )
})

test('includes runtime request handlers', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  await loadExample(PRINT_HANDLERS_EXAMPLE)
  const consoleSpy = spyOnConsole()

  await page.evaluate(() => {
    const { worker, rest, graphql } = window.msw
    worker.use(
      rest.post('/profile', () => null),
      graphql.query('SubmitTransaction', () => null),
    )

    worker.printHandlers()
  })

  const startGroupCollapsed = consoleSpy.get('startGroupCollapsed')

  expect(startGroupCollapsed).toHaveLength(8)

  expect(startGroupCollapsed).toContain('[rest] POST /profile')
  expect(startGroupCollapsed).toContain(
    '[graphql] query SubmitTransaction (origin: *)',
  )
})
