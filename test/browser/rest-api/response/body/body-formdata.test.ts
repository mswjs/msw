import { test, expect } from '../.././../playwright.extend'

test('responds to a request with FormData', async ({ loadExample, fetch }) => {
  await loadExample(new URL('./body-formdata.mocks.ts', import.meta.url))
  const res = await fetch('/user')

  const headers = await res.allHeaders()
  expect(headers).toHaveProperty(
    'content-type',
    expect.stringContaining('multipart/form-data'),
  )
  expect(res.fromServiceWorker()).toBe(true)

  const text = await res.text()
  expect(text).toMatch(
    /------WebKitFormBoundary.+?\r\nContent-Disposition: form-data; name="name"\r\n\r\nAlice\r\n------WebKitFormBoundary.+?\r\nContent-Disposition: form-data; name="age"\r\n\r\n32\r\n------WebKitFormBoundary.+?--/gm,
  )
})
