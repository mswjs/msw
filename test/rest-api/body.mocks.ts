import { setupWorker, rest } from 'msw'

function handleRequestBody(req, res, ctx) {
  const { body } = req

  return res(ctx.json({ body }))
}

const worker = setupWorker(
  rest.get('/login', handleRequestBody),
  rest.post('/login', handleRequestBody),
)

worker.start()
