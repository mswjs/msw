import { graphql } from 'msw'
import { SetupWorkerApi } from 'msw/browser'
import { gql } from '../../support/graphql'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    graphql: typeof graphql
  }
}

const PREDICATE_EXAMPLE = new URL(
  './custom-predicate.mocks.ts',
  import.meta.url,
)

test('matches requests when the predicate function returns true', async ({
  loadExample,
  query,
  page,
}) => {
  await loadExample(PREDICATE_EXAMPLE)

  await page.evaluate(() => {
    const { worker, graphql } = window.msw

    worker.use(
      graphql.query(
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
  })

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
  loadExample,
  query,
  page,
}) => {
  await loadExample(PREDICATE_EXAMPLE)

  await page.evaluate(() => {
    const { worker, graphql } = window.msw

    worker.use(
      graphql.query(
        ({ variables }) => {
          return variables.id === 'abc-123'
        },
        ({ variables }) => {
          return Response.json({
            data: { user: { id: variables.id } },
          })
        },
      ),
      graphql.operation(() => {
        return Response.json({ data: { fallback: true } })
      }),
    )
  })

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
