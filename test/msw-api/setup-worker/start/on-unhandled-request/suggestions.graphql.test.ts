import { SetupWorkerApi, graphql } from 'msw'
import { test, expect } from '../../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    graphql: typeof graphql
  }
}

test.describe('GraphQL API', () => {
  test('does not suggest any handlers when there are no similar ones', async ({
    loadExample,
    spyOnConsole,
    fetch,
    page,
  }) => {
    const consoleSpy = spyOnConsole()
    await loadExample(require.resolve('./suggestions.mocks.ts'))

    page.evaluate(() => {
      const { worker, graphql } = window.msw
      worker.use(
        graphql.mutation('SubmitCheckout', () => null),
        graphql.query('GetUserPaymentHistory', () => null),
      )
    })

    await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
            query PaymentHistory {
              creditCard {
                number
              }
            }
          `,
      }),
    })

    expect(consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`\
[MSW] Warning: captured a request without a matching request handler:

  • query PaymentHistory (POST /graphql)

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
      ]),
    )
  })

  test('suggests a similar request handler of the same operation type', async ({
    loadExample,
    spyOnConsole,
    fetch,
    page,
  }) => {
    const consoleSpy = spyOnConsole()
    await loadExample(require.resolve('./suggestions.mocks.ts'))

    page.evaluate(() => {
      const { worker, graphql } = window.msw
      worker.use(
        graphql.mutation('GetLatestActiveUser', () => null),
        graphql.query('GetUser', () => null),
      )
    })

    await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
            query GetUsers {
              user {
                firstName
              }
            }
          `,
      }),
    })

    expect(consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`\
[MSW] Warning: captured a request without a matching request handler:

  • query GetUsers (POST /graphql)

Did you mean to request "query GetUser (origin: *)" instead?

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
      ]),
    )
  })

  test('suggests a handler of a different operation type if its name is similar', async ({
    loadExample,
    spyOnConsole,
    fetch,
    page,
  }) => {
    const consoleSpy = spyOnConsole()
    await loadExample(require.resolve('./suggestions.mocks.ts'))

    page.evaluate(() => {
      const { worker, graphql } = window.msw
      worker.use(
        graphql.query('GetCheckoutSummary', () => null),
        graphql.mutation('SubmitCheckout', () => null),
      )
    })

    await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
            query SubmitCheckout {
              checkout {
                status
              }
            }
          `,
      }),
    })

    expect(consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`\
[MSW] Warning: captured a request without a matching request handler:

  • query SubmitCheckout (POST /graphql)

Did you mean to request "mutation SubmitCheckout (origin: *)" instead?

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
      ]),
    )
  })

  test('suggests multiple similar handlers regardless of their operation type', async ({
    loadExample,
    spyOnConsole,
    fetch,
    page,
  }) => {
    const consoleSpy = spyOnConsole()
    await loadExample(require.resolve('./suggestions.mocks.ts'))

    page.evaluate(() => {
      const { worker, graphql } = window.msw
      worker.use(
        graphql.mutation('ActivateUser', () => null),
        graphql.query('ActiveUser', () => null),
      )
    })

    await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
            query ActiveUsers {
              checkout {
                status
              }
            }
          `,
      }),
    })

    expect(consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`\
[MSW] Warning: captured a request without a matching request handler:

  • query ActiveUsers (POST /graphql)

Did you mean to request one of the following resources instead?

  • query ActiveUser (origin: *)
  • mutation ActivateUser (origin: *)

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
      ]),
    )
  })
})
