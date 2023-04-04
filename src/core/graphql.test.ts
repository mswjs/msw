import { graphql } from './graphql'

test('exports supported GraphQL operation types', () => {
  expect(graphql).toBeDefined()
  expect(Object.keys(graphql)).toEqual([
    'operation',
    'query',
    'mutation',
    'link',
  ])
})
