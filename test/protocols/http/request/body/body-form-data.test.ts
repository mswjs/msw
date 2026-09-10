import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.post('*/text', async ({ request }) => {
    return HttpResponse.text(await request.text())
  }),
  http.post('*/json', async ({ request }) => {
    return HttpResponse.json(await request.json())
  }),
  http.post('*/arrayBuffer', async ({ request }) => {
    return HttpResponse.arrayBuffer(await request.arrayBuffer())
  }),
  http.post('*/formData', async ({ request }) => {
    const data = await request.formData()
    const name = data.get('name')
    const file = data.get('file') as File
    const fileText = await file.text()
    const ids = data.get('ids') as File
    const idsJson = JSON.parse(await ids.text())

    return HttpResponse.json({
      name,
      file: fileText,
      ids: idsJson,
    })
  }),
]

const test = defineNetwork({ handlers })

test('handles FormData as a request body', async ({ fetch }) => {
  const body = new FormData()
  body.set('name', 'Alice')
  body.set('file', new File(['hello world'], 'file.txt'))
  body.set('ids', new File([JSON.stringify([1, 2, 3])], 'ids.json'))

  const res = await fetch('/formData', { method: 'POST', body })
  const status = res.status()
  const json = await res.json()

  expect(status).toBe(200)
  expect(json).toEqual({
    name: 'Alice',
    file: 'hello world',
    ids: [1, 2, 3],
  })
})
