/**
 * @see https://github.com/mswjs/msw/issues/1981
 */
import { expect, test } from '../playwright.extend'

test('responds with json to the intercepted request', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./1981-unexpected-token.mocks.ts'))

  const response = await fetch('/api')

  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ foo: true })
})
