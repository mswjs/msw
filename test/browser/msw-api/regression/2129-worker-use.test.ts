/**
 * @see https://github.com/mswjs/msw/issues/2129
 */
import { test, expect } from '../../playwright.extend'

test('handles a stream response without throwing a timeout error', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./2129-worker-use.mocks.ts'))

  const getResponse = await fetch('/v1/issues')
  expect(await getResponse.text()).toBe('get-body')

  const postResponse = await fetch('/v1/issues', { method: 'POST' })
  expect(await postResponse.text()).toBe('post-body')
})
