import { createTestHttpServer } from '@epic-web/test-server/http'
import { test, expect } from '../../../../playwright.extend'
import type { SetupWorkerApi } from '../../../../../../src/browser'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

test('executes a default "warn" strategy in a custom callback', async ({
  loadExample,
  spyOnConsole,
  page,
  fetch,
}) => {
  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original response', {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      })
    },
  })

  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./callback-print.mocks.ts', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    await window.msw.worker.start({
      onUnhandledRequest(request, print) {
        console.log(`Oops, unhandled ${request.method} ${request.url}`)
        print.warning()
      },
    })
  })

  const url = server.http.url('/resource').href
  const response = await fetch(url)

  expect.soft(response.status(), 'Performs the request as-is').toBe(200)
  await expect.soft(response.text()).resolves.toBe('original response')
  expect
    .soft(consoleSpy.get('log'), 'Executes the custom callback')
    .toContain(`Oops, unhandled GET ${url}`)
  expect
    .soft(consoleSpy.get('error'), 'Does not print any errors')
    .toBeUndefined()

  // Prints the unhandled request warning upon `print.warning()`.
  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET ${url}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`),
    ]),
  )

  await page.waitForTimeout(1000)
})

test('executes a default "error" strategy in a custom callback', async ({
  loadExample,
  spyOnConsole,
  page,
  fetch,
}) => {
  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original response', {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      })
    },
  })

  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./callback-print.mocks.ts', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    await window.msw.worker.start({
      onUnhandledRequest(request, print) {
        console.log(`Oops, unhandled ${request.method} ${request.url}`)
        print.error()
      },
    })
  })

  const url = server.http.url('/resource')
  const response = await fetch(url)

  /**
   * @note The custom unhandled request logic just prints the default error message,
   * but the request is still performed. As of now, there's no way to both provide
   * a custom callback and abort the request.
   */
  expect.soft(response.status(), 'Performs the request as-is').toBe(200)
  await expect.soft(response.text()).resolves.toBe('original response')
  expect
    .soft(consoleSpy.get('log'), 'Executes the custom callback')
    .toContain(`Oops, unhandled GET ${url}`)
  expect
    .soft(consoleSpy.get('warning'), 'Does not print the default warning')
    .toBeUndefined()

  expect(
    consoleSpy.get('error'),
    `Prints the error from "print.error()"`,
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Error: intercepted a request without a matching request handler:

  • GET ${url}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`),
    ]),
  )
  expect(
    consoleSpy.get('error'),
    'Does not print the failed bypass error',
  ).not.toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        `[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.`,
      ),
    ]),
  )

  await page.waitForTimeout(1000)
})
