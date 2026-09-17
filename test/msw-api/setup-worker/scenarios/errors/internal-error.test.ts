import { http } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/user', () => {
    throw new Error('Custom error message')
  }),
]

const test = defineNetwork({ handlers })

test('propagates the exception originating from a handled request', async ({
  spyOnConsole,
  fetch,
  makeUrl,
  task,
}) => {
  const consoleSpy = spyOnConsole()

  const endpointUrl = makeUrl('/user')
  const response = await fetch(endpointUrl)

  // Expect the exception to be handled as a 500 error response.
  expect.soft(response.status()).toBe(500)
  expect
    .soft(response.statusText())
    .toBe(
      task.file.projectName === 'browser'
        ? 'Request Handler Error'
        : 'Unhandled Exception',
    )
  await expect(response.json()).resolves.toEqual({
    name: 'Error',
    message: 'Custom error message',
    stack: expect.stringContaining('Error: Custom error message'),
  })

  if (task.file.projectName === 'browser') {
    // Expect standard request failure message from the browser.
    await expect
      .poll(() => consoleSpy.get('error'))
      .toEqual(
        expect.arrayContaining([
          expect.stringContaining('Custom error message'),
          expect.stringContaining(
            'Encountered an unhandled exception during the handler lookup',
          ),
        ]),
      )

    expect(consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `This exception has been gracefully handled as a 500 response, however, it's strongly recommended to resolve this error, as it indicates a mistake in your code. If you wish to mock an error response, please see this guide: https://mswjs.io/docs/http/mocking-responses/error-responses`,
        ),
      ]),
    )
  }
})
