import { graphql } from './graphql'

test('exposes the link-first GraphQL api', () => {
  expect(graphql).toBeDefined()
  expect(Object.keys(graphql)).toEqual(['link'])

  const link = graphql.link('https://api.example.com/graphql')
  expect(Object.keys(link)).toEqual([
    'operation',
    'query',
    'mutation',
    'subscription',
  ])
})
