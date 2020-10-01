import { rest } from 'msw'
import { setupServer } from 'msw/node'

test('should throw an error if setupServer is called with a wrong arg', async () => {
  let message
  try {
    // The next line will be ignored because we want to test that an Error
    // should be trown when `setupServer` parameters are not valid
    // @ts-ignore
    setupServer([
      rest.get('https://test.mswjs.io/book/:bookId', (req, res, ctx) => {
        return res(ctx.json({ title: 'Original title' }))
      }),
    ])
  } catch (error) {
    if (
      error.message.startsWith(
        `[MSW] Failed to call "setupServer": received a list of request handlers (setupServer([a, b])), expected to receive each handler individually: setupServer(a, b).`,
      )
    )
      message = error.message
  }

  expect(message).toBeTruthy()
})
