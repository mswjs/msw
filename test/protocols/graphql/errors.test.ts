import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'
import { gql } from '../../support/graphql'

const api = graphql.link('*')

const handlers = [
  api.query('Login', () => {
    return HttpResponse.json({
      errors: [
        {
          message: 'This is a mocked error',
          locations: [
            {
              line: 1,
              column: 2,
            },
          ],
        },
      ],
    })
  }),
]

const test = defineTestNetwork({ handlers })

test('mocks a GraphQL error response', async ({ query }) => {
  const response = await query('/graphql', {
    query: gql`
      query Login {
        user {
          id
        }
      }
    `,
  })
  const body = await response.json()

  expect(response.status()).toBe(200)
  expect(body).toEqual({
    errors: [
      {
        message: 'This is a mocked error',
        locations: [
          {
            line: 1,
            column: 2,
          },
        ],
      },
    ],
  })
})
