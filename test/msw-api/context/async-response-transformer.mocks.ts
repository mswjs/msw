import { ResponseTransformer, setupWorker, rest, context, compose } from 'msw'
import base64Image from 'url-loader!../../fixtures/image.jpg'

async function jpeg(base64: string): Promise<ResponseTransformer> {
  const buffer = await fetch(base64).then((res) => res.arrayBuffer())

  return compose(
    context.set('Content-Length', buffer.byteLength.toString()),
    context.set('Content-Type', 'image/jpeg'),
    context.body(buffer),
  )
}

const worker = setupWorker(
  rest.get('/image', async (req, res, ctx) => {
    return res(ctx.status(201), await jpeg(base64Image))
  }),
)

worker.start()
