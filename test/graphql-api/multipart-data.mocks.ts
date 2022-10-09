import { setupWorker, graphql, HttpResponse } from 'msw'

const worker = setupWorker(
  graphql.mutation<
    {
      multipart: {
        file1?: string
        file2?: string
        files?: Array<string>
        plainText?: string
      }
    },
    {
      file1?: File
      file2?: File
      files?: Array<File>
      plainText?: string
    }
  >('UploadFile', async ({ variables }) => {
    const { file1, file2, files = [], plainText } = variables
    const filesResponse = await Promise.all(files.map((file) => file.text()))

    return HttpResponse.json({
      data: {
        multipart: {
          file1: await file1?.text(),
          file2: await file2?.text(),
          files: filesResponse,
          plainText,
        },
      },
    })
  }),
)

worker.start()
