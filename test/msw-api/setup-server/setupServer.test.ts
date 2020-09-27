import { rest } from 'msw'
import { setupServer } from 'msw/node'

test('should throw an error if setupServer is called with a wrong arg', async () => {
  let message
  try {
    // @ts-ignore
    setupServer([
      rest.get('https://test.mswjs.io/book/:bookId', (req, res, ctx) => {
        return res(ctx.json({ title: 'Original title' }))
      }),
    ])
  } catch (error) {
    if (
      error.message.startsWith(
        '[MSW] setupServer function receive every handler as an arg. You should call it as setupServer(...requestHandlers) with requestHandlers the array of handlers.',
      )
    )
      message = error.message
  }

  expect(message).toBeTruthy()
})
