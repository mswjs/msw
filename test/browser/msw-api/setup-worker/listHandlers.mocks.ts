import { http } from 'msw'
import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'

const resolver = () => void 0

const api = graphql.link('*')
const github = graphql.link('https://api.github.com')

const worker = setupWorker(
  http.get('https://test.mswjs.io/book/:bookId', resolver),
  api.query('GetUser', resolver),
  api.mutation('UpdatePost', resolver),
  api.operation(resolver),
  github.query('GetRepo', resolver),
  github.operation(resolver),
)

worker.start()

Object.assign(window, {
  msw: {
    worker,
    http,
    graphql,
  },
})
