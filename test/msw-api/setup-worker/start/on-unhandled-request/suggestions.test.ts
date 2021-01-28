import * as path from 'path'
import {
  captureConsole,
  filterLibraryLogs,
} from '../../../../support/captureConsole'
import { runBrowserWith } from '../../../../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'suggestions.mocks.ts'))
}

describe('REST API', () => {
  test('does not suggest any handlers when there are no similar ones', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    await runtime.request({
      url: runtime.makeUrl('/user-details'),
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /user-details

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

    return runtime.cleanup()
  })

  test('suggests a similar request handler of the same method', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    await runtime.request({
      url: runtime.makeUrl('/users'),
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /users

Did you mean to request "GET /user" instead?

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

    return runtime.cleanup()
  })

  test('suggest a handler of a different method if its URL is similar', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    await runtime.request({
      url: runtime.makeUrl('/users'),
      fetchOptions: {
        method: 'POST',
      },
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • POST /users

Did you mean to request "GET /user" instead?

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

    return runtime.cleanup()
  })

  test('suggests a handler with the same method if multiple handlers are similar', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    await runtime.request({
      // Intentional typo in the request URL.
      url: runtime.makeUrl('/pamyents'),
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /pamyents

Did you mean to request "GET /payments" instead?

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

    return runtime.cleanup()
  })
})

describe('GraphQL API', () => {
  test('does not suggest any handlers when there are no similar ones', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    await runtime.request({
      url: runtime.makeUrl('/graphql'),
      fetchOptions: {
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
      },
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • query PaymentHistory (POST /graphql)

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

    return runtime.cleanup()
  })

  test('suggests a similar request handler of the same operation type', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    await runtime.request({
      url: runtime.makeUrl('/graphql'),
      fetchOptions: {
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
      },
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • query GetUsers (POST /graphql)

Did you mean to request "query GetUser (origin: *)" instead?

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

    return runtime.cleanup()
  })

  test('suggests a handler of a different operation type if its name is similar', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    await runtime.request({
      url: runtime.makeUrl('/graphql'),
      fetchOptions: {
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
      },
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • query SubmitCheckout (POST /graphql)

Did you mean to request "mutation SubmitCheckout (origin: *)" instead?

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

    return runtime.cleanup()
  })

  test('suggests a handler with of same operation type if multiple handlers are similar', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    await runtime.request({
      url: runtime.makeUrl('/graphql'),
      fetchOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query RegisterUsers {
              checkout {
                status
              }
            }
          `,
        }),
      },
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • query RegisterUsers (POST /graphql)

Did you mean to request "query RegisterUser (origin: *)" instead?

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

    return runtime.cleanup()
  })
})
