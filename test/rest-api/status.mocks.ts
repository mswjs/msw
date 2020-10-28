import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/posts', (req, res, ctx) => {
    // Setting response status code without status text
    // implicitly sets the correct status text.
    return res(ctx.status(403))
  }),
  rest.get('/user', (req, res, ctx) => {
    // Response status text can be overridden
    // to an arbitrary string value.
    return res(ctx.status(401, 'Custom text'))
  }),
)

worker.start()
