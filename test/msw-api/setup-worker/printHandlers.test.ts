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

test('lists rest request handlers', async () => {
  const { page, consoleSpy } = await createRuntime()

  await page.evaluate(() => {
    window.msw.worker.printHandlers()
  })

  const startGroupCollapsed = consoleSpy.get('startGroupCollapsed')
  const log = consoleSpy.get('log')

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

  const matchSuggestions = log.filter((message) => message.startsWith('Match:'))
  expect(matchSuggestions).toHaveLength(1)
  expect(matchSuggestions).toEqual([
    'Match: https://mswjs.io/repl?path=https://test.mswjs.io/book/:bookId',
  ])
})

test('includes runtime request handlers', async () => {
  const { page, consoleSpy } = await createRuntime()

  await page.evaluate(() => {
    const { worker, rest, graphql } = window.msw
    worker.use(
      rest.post('/profile', () => null),
      graphql.query('SubmitTransaction', () => null),
    )

    worker.printHandlers()
  })

  const startGroupCollapsed = consoleSpy.get('startGroupCollapsed')
  const log = consoleSpy.get('log')

  expect(startGroupCollapsed).toHaveLength(8)

  expect(startGroupCollapsed).toContain('[rest] POST /profile')
  expect(startGroupCollapsed).toContain(
    '[graphql] query SubmitTransaction (origin: *)',
  )

  const matchSuggestions = log.filter((message) => message.startsWith('Match:'))
  expect(matchSuggestions).toHaveLength(2)
  expect(matchSuggestions).toContain(
    'Match: https://mswjs.io/repl?path=/profile',
  )
})
