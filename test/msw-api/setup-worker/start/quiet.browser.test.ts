import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../setup/vitest-helpers'

const handlers = [
  http.get('/user', () => {
    return HttpResponse.json({ firstName: 'John', age: 32 })
  }),
]
const test = defineTestNetwork({ handlers, workerOptions: { quiet: true } })

test('does not log intercepted requests when "quiet" is true', async ({
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  const response = await fetch('/user')

  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({
    firstName: 'John',
    age: 32,
  })
  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()
})
