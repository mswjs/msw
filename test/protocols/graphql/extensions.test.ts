import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { defineNetwork, expect } from '../../setup/vitest-helpers'
import { gql } from '../../support/graphql'

const api = graphql.link('*')

interface LoginQuery {
  user: {
    id: number
    name: string
    password: string
  }
}

const handlers = [
  api.query<LoginQuery>('Login', () => {
    return HttpResponse.json({
      data: {
        user: {
          id: 1,
          name: 'Joe Bloggs',
          password: 'HelloWorld!',
        },
      },
      extensions: {
        message: 'This is a mocked extension',
        tracking: {
          version: '0.1.2',
          page: '/test/',
        },
      },
    })
  }),
]

const test = defineNetwork({ handlers })

test('mocks a GraphQL response with both data and extensions', async ({
  query,
}) => {
  const res = await query('/graphql', {
    query: gql`
      query Login {
        user {
          id
          name
          password
        }
      }
    `,
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual({
    data: {
      user: {
        id: 1,
        name: 'Joe Bloggs',
        password: 'HelloWorld!',
      },
    },
    extensions: {
      message: 'This is a mocked extension',
      tracking: {
        version: '0.1.2',
        page: '/test/',
      },
    },
  })
})
