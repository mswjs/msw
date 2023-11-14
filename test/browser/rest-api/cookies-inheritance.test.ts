import { test, expect } from '../playwright.extend'

test('inherits cookies set on a preceeding request', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./cookies-inheritance.mocks.ts'))

  const res = await fetch('/login', { method: 'POST' }).then(() => {
    return fetch('/user')
  })

  const status = res.status()
  const json = await res.json()

  expect(status).toBe(200)
  expect(json).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
})
