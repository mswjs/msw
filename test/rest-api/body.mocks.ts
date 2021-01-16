import { setupWorker, rest } from 'msw'

function handleRequestBody(req, res, ctx) {
  const { body } = req

  return res(ctx.json({ body }))
}

async function handleMultipartRequestBody(req, res, ctx) {
  const { body } = req
  const resBody: Record<string, string> = {}
  for (const [name, value] of Object.entries(body)) {
    if (value instanceof File) {
      resBody[name] = await value.text()
    } else {
      resBody[name] = value as string
    }
  }

  return res(ctx.json({ body: resBody }))
}

const worker = setupWorker(
  rest.get('/login', handleRequestBody),
  rest.post('/login', handleRequestBody),
  rest.post('/upload', handleMultipartRequestBody),
)

worker.start()
