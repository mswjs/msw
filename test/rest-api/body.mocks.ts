import {
  ResponseResolver,
  RestContext,
  setupWorker,
  rest,
  HttpResponse,
} from 'msw'

const handleRequestBody: ResponseResolver<RestContext> = async ({
  request,
}) => {
  const text = await request.text()
  console.log({ request, text })

  return new Response(text, { headers: request.headers })
}

const handleMultipartRequestBody: ResponseResolver<RestContext> = async ({
  request,
}) => {
  const body = await request.json()

  // if (typeof body !== 'object') {
  //   throw new Error(
  //     'Expected multipart request body to be parsed but got string',
  //   )
  // }

  const responseBody: Record<string, unknown> = {}

  for (const [name, value] of Object.entries(body)) {
    if (value instanceof File) {
      responseBody[name] = await value.text()
    } else {
      responseBody[name] = value
    }
  }

  return HttpResponse.json(responseBody)
}

const worker = setupWorker(
  rest.get('/login', handleRequestBody),
  rest.post('/login', handleRequestBody),
  rest.post('/upload', handleMultipartRequestBody),
)

worker.start()
