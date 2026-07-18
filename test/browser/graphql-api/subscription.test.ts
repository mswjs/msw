import type { createClient } from 'graphql-ws'
import type { graphql } from 'msw/graphql'
import type { SetupWorker } from 'msw/browser'
import { gql } from '../../support/graphql'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorker
    graphql: typeof graphql
    createClient: typeof createClient
  }
}

const SUBSCRIPTION_EXAMPLE = new URL('./subscription.mocks.ts', import.meta.url)

const GRAPHQL_URL = 'ws://localhost:4000/graphql'

test('mocks a GraphQL subscription', async ({ loadExample, page }) => {
  await loadExample(SUBSCRIPTION_EXAMPLE)

  const messages = await page.evaluate(
    async ({ url, query }) => {
      const { worker, graphql, createClient } = window.msw

      worker.use(
        graphql.link(url).subscription('OnCommentAdded', ({ subscription }) => {
          subscription.publish({
            data: { commentAdded: { text: 'Hello world' } },
          })
          queueMicrotask(() => {
            subscription.complete()
          })
        }),
      )

      const client = createClient({ url })
      const messages: Array<unknown> = []

      for await (const result of client.iterate({ query })) {
        messages.push(result)
      }

      await client.dispose()
      return messages
    },
    {
      url: GRAPHQL_URL,
      query: gql`
        subscription OnCommentAdded {
          commentAdded {
            text
          }
        }
      `,
    },
  )

  expect(messages).toEqual([
    { data: { commentAdded: { text: 'Hello world' } } },
  ])
})

test('publishes multiple payloads to a GraphQL subscription', async ({
  loadExample,
  page,
}) => {
  await loadExample(SUBSCRIPTION_EXAMPLE)

  const messages = await page.evaluate(
    async ({ url, query }) => {
      const { worker, graphql, createClient } = window.msw

      worker.use(
        graphql
          .link(url)
          .subscription('OnPostAdded', async ({ subscription }) => {
            // `from()` publishes every value of the iterable but does not
            // complete the subscription, so complete it once it's exhausted.
            await subscription.from([
              { postAdded: { title: 'First' } },
              { postAdded: { title: 'Second' } },
            ])
            subscription.complete()
          }),
      )

      const client = createClient({ url })
      const messages: Array<unknown> = []

      for await (const result of client.iterate({ query })) {
        messages.push(result)
      }

      await client.dispose()
      return messages
    },
    {
      url: GRAPHQL_URL,
      query: gql`
        subscription OnPostAdded {
          postAdded {
            title
          }
        }
      `,
    },
  )

  expect(messages).toEqual([
    { data: { postAdded: { title: 'First' } } },
    { data: { postAdded: { title: 'Second' } } },
  ])
})

test('terminates a GraphQL subscription with errors', async ({
  loadExample,
  page,
}) => {
  await loadExample(SUBSCRIPTION_EXAMPLE)

  const errors = await page.evaluate(
    async ({ url, query }) => {
      const { worker, graphql, createClient } = window.msw

      worker.use(
        graphql
          .link(url)
          .subscription('OnCommentRemoved', ({ subscription }) => {
            queueMicrotask(() => {
              subscription.error([{ message: 'Something went wrong' }])
            })
          }),
      )

      const client = createClient({ url })

      try {
        for await (const _ of client.iterate({ query })) {
          // Intentionally empty: this subscription only errors.
        }
        return []
      } catch (error) {
        // A subscription terminated with errors rejects the iterator with
        // the list of GraphQL errors. Map them to plain objects so they
        // survive the serialization to the test runner.
        return Array.prototype
          .concat(error)
          .map((graphQLError) => ({ message: graphQLError.message }))
      } finally {
        await client.dispose()
      }
    },
    {
      url: GRAPHQL_URL,
      query: gql`
        subscription OnCommentRemoved {
          commentRemoved {
            id
          }
        }
      `,
    },
  )

  expect(errors).toEqual([{ message: 'Something went wrong' }])
})

test('prints a warning on a subscription without a matching handler', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(SUBSCRIPTION_EXAMPLE)

  await page.evaluate(
    async ({ url, query }) => {
      const { worker, graphql, createClient } = window.msw

      // A subscription handler for an unrelated operation. It makes MSW
      // claim this connection without matching the operation below.
      worker.use(graphql.link(url).subscription('OnCommentAdded', () => {}))

      const client = createClient({ url })

      // This subscription never resolves, so don't await it.
      client
        .iterate({ query })
        .next()
        .catch(() => {})
    },
    {
      url: GRAPHQL_URL,
      query: gql`
        subscription OnUnknownEvent {
          unknownEvent {
            id
          }
        }
      `,
    },
  )

  await expect
    .poll(() => consoleSpy.get('warning')?.join('\n'))
    .toMatch(/Intercepted a GraphQL subscription "OnUnknownEvent"/)
})
