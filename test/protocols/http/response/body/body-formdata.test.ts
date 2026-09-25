import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/user', async () => {
    const data = new FormData()
    data.append('name', 'Alice')
    data.append('age', '32')

    return HttpResponse.formData(data)
  }),
]

const test = defineTestNetwork({ handlers })

test('responds to a request with FormData', async ({ fetch }) => {
  const response = await fetch('/user')

  const headers = await response.allHeaders()
  expect(headers).toHaveProperty(
    'content-type',
    expect.stringContaining('multipart/form-data'),
  )
  expect(response.fromServiceWorker()).toBe(true)

  const text = await response.text()
  expect(text).toContain('Content-Disposition: form-data; name="name"')
  expect(text).toContain('Alice')
  expect(text).toContain('Content-Disposition: form-data; name="age"')
  expect(text).toContain('32')
})
