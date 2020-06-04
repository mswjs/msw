import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'

test('defers network requests until the worker is ready', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'wait-until-ready.mocks.ts'),
  )

  // Reload is necessary, because `runBrowserWith` has `{ waitUntil: 'networkidle0' }` predicate
  // when openning a test scenario mock. Reload doesn't affect the worker state, and without
  // the deferred network requests option it's still subjected to race condition.
  await runtime.page.reload()

  const res = await runtime.page.waitForResponse((res) => {
    return res.url().includes('/numbers')
  })

  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual([1, 2, 3])

  await runtime.cleanup()
})

test('allows requests to fall through with the option disabled', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'wait-until-ready.false.mocks.ts'),
  )
  await runtime.page.reload()

  const res = await runtime.page.waitForResponse((res) => {
    return res.url().includes('/numbers')
  })

  const status = res.status()

  expect(status).toBe(404)

  await runtime.cleanup()
})
