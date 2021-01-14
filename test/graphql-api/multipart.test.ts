import * as path from 'path'
import { runBrowserWith, TestAPI } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'multipart.mocks.ts'))
}

let runtime: TestAPI

beforeAll(async () => {
  runtime = await createRuntime()
})
afterAll(async () => {
  await runtime.cleanup()
})

test('accepts a file from a GraphQL mutation', async () => {
  const UPLOAD_MUTATION = `
    mutation UploadFile($file: Upload!) {
      file
    }
  `
  const res = await executeOperation(
    runtime.page,
    {
      query: UPLOAD_MUTATION,
      variables: {
        file: null,
      },
    },
    { map: { '0': ['variables.file'] }, fileContents: ['file content'] },
  )
  const body = await res.json()
  expect(res.status()).toEqual(200)
  expect(body).toEqual({
    data: {
      file: 'file content',
    },
  })
})
