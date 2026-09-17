import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/user', async () => {
    const data = new FormData()
    data.append('name', 'Alice')
    data.append('age', '32')

    return HttpResponse.formData(data)
  }),
]

const test = defineNetwork({ handlers })

test('responds to a request with FormData', async ({ fetch }) => {
  const res = await fetch('/user')

  const headers = await res.allHeaders()
  expect(headers).toHaveProperty(
    'content-type',
    expect.stringContaining('multipart/form-data'),
  )
  expect(res.fromServiceWorker()).toBe(true)

  const text = await res.text()
  expect(text).toContain('Content-Disposition: form-data; name="name"')
  expect(text).toContain('Alice')
  expect(text).toContain('Content-Disposition: form-data; name="age"')
  expect(text).toContain('32')
})
