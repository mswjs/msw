import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.mutation('UploadFile', async (req, res, ctx) => {
    const file: File = req.variables.file
    return res(
      ctx.data({
        file: await file.text(),
      }),
    )
  }),
)

worker.start()
