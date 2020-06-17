import { rest } from 'msw'
import { setupServer } from 'msw/node'

// This mock is intentionally incorrect.
// It's meant to serve as a test case to confirm
// we provide a useful error message. If setup server
// is accidentally called in the browser. Do not use
// this as an actual example for real code.
const server = setupServer(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.status(200))
  }),
)
