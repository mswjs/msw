import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import base64Image from 'url-loader!../../../../fixtures/image.jpg'

const worker = setupWorker(
  rest.get('/images/:imageId', async () => {
    const imageBuffer = await fetch(base64Image).then((res) =>
      res.arrayBuffer(),
    )

    return HttpResponse.arrayBuffer(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    })
  }),
)

worker.start()
