import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'

test('defers network requests until the worker is ready', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'wait-until-ready.mocks.ts'),
  )

  // Reload is necessary, because `runBrowserWith` has `{ waitUntil: 'networkidle0' }` predicate
  // when opening a test scenario mock. Reload doesn't affect the worker state, and without
  // the deferred network requests option it's still subjected to race condition.
  await runtime.page.reload()

  const [numbersResponse, lettersResponse] = await Promise.all([
    runtime.page.waitForResponse((res) => {
      return res.url().includes('/numbers')
    }),
    runtime.page.waitForResponse((res) => {
      return res.url().includes('/letters')
    }),
  ])

  const numbersStatus = numbersResponse.status()
  const numbersBody = await numbersResponse.json()
  expect(numbersStatus).toBe(200)
  expect(numbersBody).toEqual([1, 2, 3])

  const lettersStatus = lettersResponse.status()
  const lettersBody = await lettersResponse.json()
  expect(lettersStatus).toBe(200)
  expect(lettersBody).toEqual(['a', 'b', 'c'])

  await runtime.cleanup()
})

test('allows requests to fall through with the option disabled', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'wait-until-ready.false.mocks.ts'),
  )
  await runtime.page.reload()

  const [numbersResponse, lettersResponse] = await Promise.all([
    runtime.page.waitForResponse((res) => {
      return res.url().includes('/numbers')
    }),
    runtime.page.waitForResponse((res) => {
      return res.url().includes('/letters')
    }),
  ])

  const numbersStatus = numbersResponse.status()
  expect(numbersStatus).toBe(404)

  const lettersStatus = lettersResponse.status()
  expect(lettersStatus).toBe(404)

  await runtime.cleanup()
})
