import { http } from 'msw'
import { defineNetwork, expect } from '../setup/vitest-helpers'

const handlers = [
  http.get('https://api.github.com/users/:username', () => {
    // @ts-expect-error nonExisting should not be defined
    nonExisting()
    return
  }),
]

const test = defineNetwork({ handlers })

test('activates the worker without errors', async ({ spyOnConsole }) => {
  const consoleSpy = spyOnConsole()

  expect(consoleSpy.get('error')).toBeUndefined()
})

test('transforms uncaught exceptions into a 500 response', async ({
  fetch,
  spyOnConsole,
  task,
}) => {
  const consoleSpy = spyOnConsole()

  const res = await fetch('https://api.github.com/users/octocat')

  expect(res.status()).toBe(500)
  expect(res.statusText()).toBe(
    task.file.projectName === 'browser'
      ? 'Request Handler Error'
      : 'Unhandled Exception',
  )
  expect(res.fromServiceWorker()).toBe(true)

  expect(await res.json()).toEqual({
    name: 'ReferenceError',
    message: 'nonExisting is not defined',
    stack: expect.stringContaining(
      'ReferenceError: nonExisting is not defined',
    ),
  })

  const errors = consoleSpy.get('error')

  if (task.file.projectName === 'browser') {
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('nonExisting is not defined'),
        expect.stringContaining(
          'Encountered an unhandled exception during the handler lookup',
        ),
      ]),
    )
  }
})
