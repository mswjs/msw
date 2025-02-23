import { test, expect } from '../../playwright.extend'

test('persists store records between page reloads', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./store.mocks.ts'))

  // Create a new post.
  const createdRecord = await fetch('/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: 'abc-123',
      title: 'Hello world',
    }),
  }).then((response) => response.json())

  expect(createdRecord).toEqual({
    id: 'abc-123',
    title: 'Hello world',
  })

  await page.reload()

  // Must persist the created post between page reloads.
  const allPosts = await fetch('/posts').then((response) => response.json())
  expect(allPosts).toEqual([
    {
      id: 'abc-123',
      title: 'Hello world',
    },
  ])
})
