import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  // Use wildcard so that we capture any "GET /user" requests
  // regardless of the origin, and can assert "same-origin" credentials.
  rest.get('*/user', (req, res, ctx) => {
    return res(ctx.json({ cookies: req.cookies }))
  }),
)

worker.start()
