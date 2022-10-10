import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('https://test.mswjs.io/api/binary', async (req, res, ctx) => {
    const body = await req.arrayBuffer()
    const hexNumbers = Array.from(new Uint8Array(body))
      .map((byte) => byte.toString(16))
      .join(' ')

    return res(ctx.json({ result: hexNumbers }))
  }),
)

worker.start()
