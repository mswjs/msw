// @vitest-environment node
import { http, graphql } from 'msw'
import { setupServer } from 'msw/node'

const resolver = () => null
const github = graphql.link('https://api.github.com')

const server = setupServer(
  http.get('https://test.mswjs.io/book/:bookId', resolver),
  graphql.query('GetUser', resolver),
  graphql.mutation('UpdatePost', resolver),
  graphql.operation(resolver),
  github.query('GetRepo', resolver),
  github.operation(resolver),
)

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('lists all current request handlers', () => {
  const handlers = server.listHandlers()
  const handlerHeaders = handlers.map((handler) => handler.info.header)

  expect(handlerHeaders).toEqual([
    'GET https://test.mswjs.io/book/:bookId',
    'query GetUser (origin: *)',
    'mutation UpdatePost (origin: *)',
    'all (origin: *)',
    'query GetRepo (origin: https://api.github.com)',
    'all (origin: https://api.github.com)',
  ])
})

test('forbids from modifying the list of handlers', () => {
  const handlers = server.listHandlers()

  expect(() => {
    // @ts-expect-error Intentional runtime misusage.
    handlers[0] = 1
  }).toThrow(/Cannot assign to read only property '\d+' of object/)

  expect(() => {
    // @ts-expect-error Intentional runtime misusage.
    handlers.push(1)
  }).toThrow(/Cannot add property \d+, object is not extensible/)
})

test('includes runtime request handlers when listing handlers', () => {
  server.use(
    http.get('https://test.mswjs.io/book/:bookId', resolver),
    graphql.query('GetRandomNumber', resolver),
  )

  const handlers = server.listHandlers()
  const handlerHeaders = handlers.map((handler) => handler.info.header)

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
