import { graphql } from 'msw/graphql'
import { gql } from '../../support/graphql'
import { test, expect } from '../../setup/vitest-helpers'

test('matches requests when the predicate function returns true', async ({
  network,
  query,
}) => {
  const api = graphql.link('*')
  network.use(
    api.query(
      ({ variables }) => {
        return variables.id === 'abc-123'
      },
      ({ variables }) => {
        return Response.json({
          data: { user: { id: variables.id } },
        })
      },
    ),
  )

  const response = await query('/irrelevant', {
    query: gql`
      query GetUser($id: String!) {
        user(id: $id) {
          id
        }
      }
    `,
    variables: {
      id: 'abc-123',
    },
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    data: {
      user: {
        id: 'abc-123',
      },
    },
  })
})

test('does not match requests when the predicate function returns false', async ({
  network,
  query,
}) => {
  const api = graphql.link('*')
  network.use(
    api.query(
      ({ variables }) => {
        return variables.id === 'abc-123'
      },
      ({ variables }) => {
        return Response.json({
          data: { user: { id: variables.id } },
        })
      },
    ),
    api.operation(() => {
      return Response.json({ data: { fallback: true } })
    }),
  )

  const response = await query('/irrelevant', {
    query: gql`
      query GetUser($id: String!) {
        user(id: $id) {
          id
        }
      }
    `,
    variables: {
      id: 'non-matching-query',
    },
  })

  await expect(response.json()).resolves.toEqual({
    data: {
      fallback: true,
    },
  })
})
