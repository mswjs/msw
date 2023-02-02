/**
 * @jest-environment node
 */
import { bold } from 'chalk'
import { rest, graphql } from 'msw'
import { setupServer } from 'msw/node'

const resolver = () => null

const github = graphql.link('https://api.github.com')

const server = setupServer(
  rest.get('https://test.mswjs.io/book/:bookId', resolver),
  graphql.query('GetUser', resolver),
  graphql.mutation('UpdatePost', resolver),
  graphql.operation(resolver),
  github.query('GetRepo', resolver),
  github.operation(resolver),
)

beforeAll(() => {
  jest.spyOn(global.console, 'log').mockImplementation()
  server.listen()
})

afterEach(() => {
  jest.resetAllMocks()
  server.resetHandlers()
})

afterAll(() => {
  jest.restoreAllMocks()
  server.close()
})

test('lists all current request handlers', () => {
  server.printHandlers()

  // Test failed here, commenting so it shows up in the PR
  expect(console.log).toBeCalledTimes(6)

  expect(console.log).toBeCalledWith(`\
${bold('[rest] GET https://test.mswjs.io/book/:bookId')}
  Declaration: ${__filename}:13:8
`)

  expect(console.log).toBeCalledWith(`\
${bold('[graphql] query GetUser (origin: *)')}
  Declaration: ${__filename}:14:11
`)

  expect(console.log).toBeCalledWith(`\
${bold('[graphql] mutation UpdatePost (origin: *)')}
  Declaration: ${__filename}:15:11
`)

  expect(console.log).toBeCalledWith(`\
${bold('[graphql] all (origin: *)')}
  Declaration: ${__filename}:16:11
`)

  expect(console.log).toBeCalledWith(`\
${bold('[graphql] query GetRepo (origin: https://api.github.com)')}
  Declaration: ${__filename}:17:10
`)

  expect(console.log).toBeCalledWith(`\
${bold('[graphql] all (origin: https://api.github.com)')}
  Declaration: ${__filename}:18:10
`)
})

test('respects runtime request handlers when listing handlers', () => {
  server.use(
    rest.get('https://test.mswjs.io/book/:bookId', resolver),
    graphql.query('GetRandomNumber', resolver),
  )

  server.printHandlers()

  // Runtime handlers are prepended to the list of handlers
  // and they DON'T remove the handlers they may override.
  expect(console.log).toBeCalledTimes(8)

  expect(console.log).toBeCalledWith(`\
${bold('[rest] GET https://test.mswjs.io/book/:bookId')}
  Declaration: ${__filename}:75:10
`)

  expect(console.log).toBeCalledWith(`\
${bold('[graphql] query GetRandomNumber (origin: *)')}
  Declaration: ${__filename}:76:13
`)
})
