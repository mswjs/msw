import { setupWorker, rest, graphql } from 'msw'

const resolver = () => null

const github = graphql.link('https://api.github.com')

const worker = setupWorker(
  rest.get('https://test.mswjs.io/book/:bookId', resolver),
  graphql.query('GetUser', resolver),
  graphql.mutation('UpdatePost', resolver),
  graphql.operation(resolver),
  github.query('GetRepo', resolver),
  github.operation(resolver),
)

// @ts-ignore
window.msw = {
  worker,
  rest,
  graphql,
}
