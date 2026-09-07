import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const api = graphql.link('*')

const handlers = [
  api.mutation<
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
]

const test = defineNetwork({ handlers })

test('accepts a file from a GraphQL mutation', async ({ query }) => {
  const UPLOAD_MUTATION = `
    mutation UploadFile(
      $file1: Upload
      $file2: Upload
      $plainText: String
      ) {
      multipart(
        file1: $file1
        file2: $file2
        plainText: $plainText
        ){
        file1
        file2
        plainText
      }
    }
  `

  const res = await query('/graphql', {
    query: UPLOAD_MUTATION,
    variables: {
      file1: null,
      file2: null,
      files: [null, null],
      plainText: 'text',
    },
    multipartOptions: {
      map: {
        '0': ['variables.file1', 'variables.files.0'],
        '1': ['variables.file2', 'variables.files.1'],
      },
      fileContents: ['file1 content', 'file2 content'],
    },
  })

  const body = await res.json()

  expect(res.status()).toEqual(200)
  expect(body).toEqual({
    data: {
      multipart: {
        file1: 'file1 content',
        file2: 'file2 content',
        files: ['file1 content', 'file2 content'],
        plainText: 'text',
      },
    },
  })
})
