import { http } from 'msw'
import { graphql } from 'msw/graphql'
import type { Network } from '../../setup/network'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const resolver = () => void 0
const api = graphql.link('*')
const github = graphql.link('https://api.github.com')
const handlers = [
  http.get('https://test.mswjs.io/book/:bookId', resolver),
  api.query('GetUser', resolver),
  api.mutation('UpdatePost', resolver),
  api.operation(resolver),
  github.query('GetRepo', resolver),
  github.operation(resolver),
]

const test = defineNetwork({ handlers })

function getHandlerHeader(
  handler: ReturnType<Network['listHandlers']>[number],
) {
  if ('info' in handler) {
    return handler.info.header
  }

  throw new Error('Expected a request handler')
}

test('lists all current request handlers', ({ network }) => {
  const handlerHeaders = network.listHandlers().map(getHandlerHeader)

  expect(handlerHeaders).toEqual([
    'GET https://test.mswjs.io/book/:bookId',
    'query GetUser (origin: *)',
    'mutation UpdatePost (origin: *)',
    'all (origin: *)',
    'query GetRepo (origin: https://api.github.com)',
    'all (origin: https://api.github.com)',
  ])
})

test('forbids modifying the list of handlers', ({ network }) => {
  const currentHandlers = network.listHandlers()

  expect(() => {
    // @ts-expect-error Intentional runtime misusage.
    currentHandlers.push(1)
  }).toThrow(/Cannot add property \d+, object is not extensible/)
})

test('includes runtime request handlers when listing handlers', ({
  network,
}) => {
  network.use(
    http.get('https://test.mswjs.io/book/:bookId', () => void 0),
    api.query('GetRandomNumber', () => void 0),
  )
  const handlerHeaders = network.listHandlers().map(getHandlerHeader)

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
