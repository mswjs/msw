import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import { test, expect } from 'vitest'

test('throws an error given an Array of request handlers to "setupWorker"', () => {
  expect(() => {
    // @ts-expect-error Intentionally invalid input.
    setupWorker([
      http.get('/book/:bookId', function originalResolver() {
        return HttpResponse.json({ title: 'Original title' })
      }),
    ])
  }).toThrow(
    '[MSW] Failed to apply given request handlers: invalid input. Did you forget to spread the request handlers Array?',
  )
})
