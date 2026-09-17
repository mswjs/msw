import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { defineNetwork, expect } from '../../setup/vitest-helpers'
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

const test = defineNetwork({ handlers })

test('mocks a GraphQL error response', async ({ query }) => {
  const res = await query('/graphql', {
    query: gql`
      query Login {
        user {
          id
        }
      }
    `,
  })
  const body = await res.json()

  expect(res.status()).toBe(200)
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
