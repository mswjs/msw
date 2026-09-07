import { http } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/greeting', () => {
    return new Response('Hello, world!')
  }),
]

const test = defineNetwork({ handlers })

test('returns a plain Response as a mocked response', async ({
  fetch,
  spyOnConsole,
  task,
}) => {
  const consoleSpy = spyOnConsole()

  const response = await fetch('/greeting')
  const status = response.status()
  const body = await response.text()

  // Must return the correct response.
  expect(status).toBe(200)
  expect(response.fromServiceWorker()).toBe(true)
  expect(body).toEqual('Hello, world!')

  if (task.file.projectName === 'browser') {
    // Must print the correct log message in the console.
    expect(consoleSpy.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /\[MSW\] \d{2}:\d{2}:\d{2} GET \/greeting 200 OK/,
        ),
      ]),
    )
  }
})
