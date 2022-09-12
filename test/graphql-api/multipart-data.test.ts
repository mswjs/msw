import { test, expect } from '../playwright.extend'
import { gql } from '../support/graphql'

test('accepts a file from a GraphQL mutation', async ({
  loadExample,
  query,
}) => {
  await loadExample(require.resolve('./multipart-data.mocks.ts'))

  const UPLOAD_FILE_MUTATION = gql`
    mutation UploadFile($file1: Upload, $file2: Upload, $plainText: String) {
      multipart(file1: $file1, file2: $file2, plainText: $plainText) {
        file1
        file2
        plainText
      }
    }
  `
  const res = await query('/graphql', {
    query: UPLOAD_FILE_MUTATION,
    variables: {
      file1: null,
      file2: null,
      files: [null, null],
      otherVariable: 'value',
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
        otherVariable: 'value',
      },
    },
  })
})
