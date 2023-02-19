import {
  ResponseTransformer,
  setupWorker,
  rest,
  context,
  compose,
  createResponseComposition,
} from 'msw'
import base64Image from 'url-loader!../../../fixtures/image.jpg'

async function jpeg(base64: string): Promise<ResponseTransformer> {
  const buffer = await fetch(base64).then((res) => res.arrayBuffer())

  return compose(
    context.set('Content-Length', buffer.byteLength.toString()),
    context.set('Content-Type', 'image/jpeg'),
    context.body(buffer),
  )
}

const customResponse = createResponseComposition(null, [
  async (res) => {
    res.statusText = 'Custom Status Text'
    return res
  },
  async (res) => {
    res.headers.set('x-custom', 'yes')
    return res
  },
])

const worker = setupWorker(
  rest.get('/image', async (req, res, ctx) => {
    return res(ctx.status(201), await jpeg(base64Image))
  }),
  rest.post('/search', (req, res, ctx) => {
    return customResponse(ctx.status(301))
  }),
)

worker.start()
