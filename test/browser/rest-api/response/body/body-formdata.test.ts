import { test, expect } from '../.././../playwright.extend'

test('sends a FormData in a mocked response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./body-formdata.mocks.ts'))
  const res = await fetch('/user')

  const headers = await res.allHeaders()
  expect(headers).toHaveProperty(
    'content-type',
    expect.stringContaining('multipart/form-data'),
  )
  expect(headers).toHaveProperty('x-powered-by', 'msw')

  const text = await res.text()
  expect(text).toMatch(
    /------WebKitFormBoundary.+?\r\nContent-Disposition: form-data; name="name"\r\n\r\nAlice\r\n------WebKitFormBoundary.+?\r\nContent-Disposition: form-data; name="age"\r\n\r\n32\r\n------WebKitFormBoundary.+?--/gm,
  )
})
