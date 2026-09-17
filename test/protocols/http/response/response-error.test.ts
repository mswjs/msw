import { http } from 'msw'
import { defineNetwork, expect } from '../../../setup/vitest-helpers'

const handlers = [
  http.get('*/resource', () => {
    return Response.error()
  }),
]

const test = defineNetwork({ handlers })

test('responds with a network error using "Response.error" shorthand', async ({
  page,
  task,
}) => {
  const networkError = await page.evaluate(() => {
    return fetch('/resource')
      .then(() => null)
      .catch((error) => ({
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      }))
  })

  // Responding with a "Response.error()" produced a "Failed to fetch" error,
  // breaking the request. This is analogous to a network error.
  expect(networkError?.name).toBe('TypeError')
  expect(networkError?.message).toBe(
    task.file.projectName === 'browser' ? 'Failed to fetch' : 'fetch failed',
  )

  if (task.file.projectName === 'browser') {
    expect(networkError?.cause).toBeUndefined()
  } else {
    expect(networkError?.cause).toBeInstanceOf(Response)
  }
})
