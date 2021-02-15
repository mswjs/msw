import { setupWorker, rest } from 'msw'
import base64Image from 'url-loader!../../../fixtures/image.jpg'

const worker = setupWorker(
  rest.get('/images/:imageId', async (_, res, ctx) => {
    const imageBuffer = await fetch(base64Image).then((res) =>
      res.arrayBuffer(),
    )

    return res(
      ctx.set('Content-Length', imageBuffer.byteLength.toString()),
      ctx.set('Content-Type', 'image/jpeg'),
      ctx.body(imageBuffer),
    )
  }),
)

worker.start()
