import { setupWorker, graphql } from 'msw'

interface UploadFileMutation {
  multipart: {
    file1?: string
    file2?: string
    files?: string[]
    otherVariable?: string
  }
}

interface UploadFileVariables {
  file1?: File
  file2?: File
  files?: File[]
  otherVariable?: string
}

const worker = setupWorker(
  graphql.mutation<UploadFileMutation, UploadFileVariables>(
    'UploadFile',
    async (req, res, ctx) => {
      const { file1, file2, files = [], otherVariable } = req.variables
      const filesResponse = await Promise.all(files.map((file) => file.text()))

      return res(
        ctx.data({
          multipart: {
            file1: await file1?.text(),
            file2: await file2?.text(),
            files: filesResponse,
            otherVariable,
          },
        }),
      )
    },
  ),
)

worker.start()
