import {
  ResponseResolver,
  RestContext,
  MockedRequest,
  setupWorker,
  rest,
} from 'msw'

const handleRequestBody: ResponseResolver<MockedRequest, RestContext> = (
  req,
  res,
  ctx,
) => {
  const { body } = req

  return res(ctx.json({ body }))
}

const handleMultipartRequestBody: ResponseResolver<MockedRequest, RestContext> =
  async (req, res, ctx) => {
    const { body } = req

    if (typeof body !== 'object') {
      throw new Error(
        'Expected multipart request body to be parsed but got string',
      )
    }

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
