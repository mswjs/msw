import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.mutation<
    {
      multipart: {
        file1?: string
        file2?: string
        files?: string[]
        plainText?: string
      }
    },
    {
      file1?: File
      file2?: File
      files?: File[]
      plainText?: string
    }
  >('UploadFile', async (req, res, ctx) => {
    const { file1, file2, files = [], plainText } = req.variables
    const filesResponse = await Promise.all(files.map((file) => file.text()))
    return res(
      ctx.data({
        multipart: {
          file1: await file1?.text(),
          file2: await file2?.text(),
          files: filesResponse,
          plainText,
        },
      }),
    )
  }),
)

worker.start()
