import axios from 'axios'
import type { AxiosProgressEvent } from 'axios'
import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../setup/vitest-helpers'

const handlers = [
  http.post('*/upload', async ({ request }) => {
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
]

const test = defineNetwork({ handlers })

test('responds with a mocked response to an upload request', async () => {
  const progressEvents: Array<AxiosProgressEvent> = []
  const request = axios.create({
    baseURL: '/',
    onDownloadProgress(event) {
      progressEvents.push(event)
    },
  })
  const formData = new FormData()
  const file = new Blob(['Hello', 'world'], { type: 'text/plain' })
  formData.set('file', file, 'doc.txt')

  const response = await request.post<{
    message: string
    content: string
  }>('/upload', formData)

  expect(response.data).toEqual({
    message: 'Successfully uploaded "doc.txt"!',
    content: 'Helloworld',
  })
  expect(progressEvents.length).toBeGreaterThan(0)
  expect(progressEvents[0]).toMatchObject({
    bytes: expect.any(Number),
    loaded: expect.any(Number),
  })
})
