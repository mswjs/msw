// @vitest-environment node
import { File } from 'node:buffer'
import axios from 'axios'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.post('https://example.com/upload', async ({ request }) => {
    const data = await request.formData()
    const file = data.get('file')

    if (!file) {
      return new HttpResponse('Missing document upload', { status: 400 })
    }

    if (!(file instanceof File)) {
      return new HttpResponse('Uploaded document is not a File', {
        status: 400,
      })
    }

    return HttpResponse.json({
      message: `Successfully uploaded "${file.name}"!`,
      content: await file.text(),
    })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('responds with a mocked response to an upload request', async () => {
  const onUploadProgress = vi.fn()
  const request = axios.create({
    baseURL: 'https://example.com',
    onUploadProgress,
  })

  const formData = new FormData()
  const file = new Blob(['Hello', 'world'], { type: 'text/plain' })
  formData.set('file', file, 'doc.txt')

  await expect(request.post('/upload', formData)).resolves.toMatchObject({
    data: {
      message: 'Successfully uploaded "doc.txt"!',
      content: 'Helloworld',
    },
  })

  expect(onUploadProgress.mock.calls.length).toBeGreaterThan(0)
  expect(onUploadProgress).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      loaded: expect.any(Number),
      total: expect.any(Number),
      bytes: expect.any(Number),
    }),
  )
})
