import { SetupWorkerApi, rest } from 'msw'
import { test, expect } from '../../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
  }
}

test.describe('REST API', () => {
  test('does not suggest any handlers when there are no similar ones', async ({
    loadExample,
    spyOnConsole,
    fetch,
    page,
  }) => {
    const consoleSpy = spyOnConsole()
    await loadExample(require.resolve('./suggestions.mocks.ts'))

    page.evaluate(() => {
      const { worker, rest } = window.msw
      worker.use(
        rest.get('/user', () => null),
        rest.post('/user-contact-details', () => null),
      )
    })

    await fetch('/user-details')

    expect(consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /user-details

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
      ]),
    )
  })

  test('suggests a similar request handler of the same method', async ({
    loadExample,
    spyOnConsole,
    fetch,
    page,
  }) => {
    const consoleSpy = spyOnConsole()
    await loadExample(require.resolve('./suggestions.mocks.ts'))

    page.evaluate(() => {
      const { worker, rest } = window.msw
      worker.use(rest.get('/user', () => null))
    })

    await fetch('/users')

    expect(consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /users

Did you mean to request "GET /user" instead?

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
      ]),
    )
  })

  test('suggest a handler of a different method if its URL is similar', async ({
    loadExample,
    spyOnConsole,
    fetch,
    page,
  }) => {
    const consoleSpy = spyOnConsole()
    await loadExample(require.resolve('./suggestions.mocks.ts'))

    page.evaluate(() => {
      const { worker, rest } = window.msw
      worker.use(
        rest.get('/user', () => null),
        rest.post('/user-contact-details', () => null),
      )
    })

    await fetch('/users', {
      method: 'POST',
    })

    expect(consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`\
[MSW] Warning: captured a request without a matching request handler:

  • POST /users

Did you mean to request "GET /user" instead?

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
      ]),
    )
  })

  test('suggests multiple similar handlers regardless of their method', async ({
    loadExample,
    spyOnConsole,
    fetch,
    page,
  }) => {
    const consoleSpy = spyOnConsole()
    await loadExample(require.resolve('./suggestions.mocks.ts'))

    page.evaluate(() => {
      const { worker, rest } = window.msw
      worker.use(
        rest.post('/payment', () => null),
        rest.get('/payments', () => null),
      )
    })

    await fetch('/pamyents')

    expect(consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /pamyents

Did you mean to request one of the following resources instead?

  • GET /payments
  • POST /payment

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
      ]),
    )
  })
})
