import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'binary.mocks.ts'),
  })
}

test('transfers binary data without corruption', async () => {
  const runtime = await createRuntime()

  const payload = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]
  const expectedResult = payload.map((byte) => byte.toString(16)).join(' ')

  runtime.page.evaluate((payload) => {
    return fetch('https://test.mswjs.io/api/binary', {
      method: 'POST',
      body: new Uint8Array(payload).buffer,
    })
  }, payload)

  const res = await runtime.page.waitForResponse(
    'https://test.mswjs.io/api/binary',
  )
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({ result: expectedResult })
})
