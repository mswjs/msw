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
  expect(handlers.length).toEqual(6)
})

test('respects runtime request handlers when listing handlers', () => {
  server.use(
    rest.get('https://test.mswjs.io/book/:bookId', resolver),
    graphql.query('GetRandomNumber', resolver),
  )

  const handlers = server.listHandlers()
  // Runtime handlers are prepended to the list of handlers
  // and they DON'T remove the handlers they may override.
  expect(handlers.length).toEqual(8)
})
