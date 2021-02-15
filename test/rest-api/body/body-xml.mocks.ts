import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(
      ctx.xml(`
<user>
  <id>abc-123</id>
  <firstName>John</firstName>
  <lastName>Maverick</lastName>
</user>`),
    )
  }),
)

worker.start()
