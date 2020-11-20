import * as path from 'path'
import { SetupWorkerApi, rest, graphql } from 'msw'
import { runBrowserWith } from '../../support/runBrowserWith'
import { captureConsole } from '../../support/captureConsole'

declare namespace window {
  // Annotate global references to the worker and rest request handlers.
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
    graphql: typeof graphql
  }
}

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'printHandlers.mocks.ts'))
}

test('lists rest request handlers', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  await runtime.page.evaluate(() => {
    window.msw.worker.printHandlers()
  })

  const { startGroupCollapsed, log } = messages

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

  const resolvers = log.filter((message) => message.startsWith('Resolver:'))
  expect(resolvers).toHaveLength(6)

  return runtime.cleanup()
})

test('respects runtime request handlers', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  await runtime.page.evaluate(() => {
    const { worker, rest, graphql } = window.msw
    worker.use(
      rest.post('/profile', () => null),
      graphql.query('SubmitTransaction', () => null),
    )

    worker.printHandlers()
  })

  const { startGroupCollapsed, log } = messages

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

  const resolvers = log.filter((message) => message.startsWith('Resolver:'))
  expect(resolvers).toHaveLength(8)

  return runtime.cleanup()
})
