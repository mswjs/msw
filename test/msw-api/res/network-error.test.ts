import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/user', () => {
    return HttpResponse.error()
  }),
]

const test = defineNetwork({ handlers })

test('throws a network error', async ({ page, task }) => {
  // Do not use `runtime.request()`, because it always awaits a response.
  // In this case we await a network error, performing a request manually.
  const requestPromise = page.evaluate(() => {
    return fetch('/user')
  })

  await expect(requestPromise).rejects.toThrow(
    // The `fetch` call itself rejects with the "Failed to fetch" error,
    // the same error that happens on a regular network error.
    task.file.projectName === 'browser' ? 'Failed to fetch' : 'fetch failed',
  )
})
