// @vitest-environment node
import * as path from 'path'
import * as fs from 'fs'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

function getImageBuffer() {
  return fs.readFileSync(path.resolve(__dirname, '../../../fixtures/image.jpg'))
}

const server = setupServer(
  http.get('http://test.mswjs.io/image', () => {
    const imageBuffer = getImageBuffer()

    return HttpResponse.arrayBuffer(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    })
  }),
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('returns given buffer in the mocked response', async () => {
  const response = await fetch('http://test.mswjs.io/image')
  const actualImageBuffer = await response.arrayBuffer()
  const expectedImageBuffer = getImageBuffer()

  expect(response.status).toBe(200)
  expect(response.headers.get('content-length')).toBe(
    actualImageBuffer.byteLength.toString(),
  )
  expect(
    Buffer.compare(Buffer.from(actualImageBuffer), expectedImageBuffer),
  ).toBe(0)
})

test('returns given blob in the mocked response', async () => {
  const response = await fetch('http://test.mswjs.io/image')
  const blob = await response.blob()
  const expectedImageBuffer = getImageBuffer()

  expect(response.status).toBe(200)
  expect(blob.type).toBe('image/jpeg')
  expect(blob.size).toBe(Number(response.headers.get('content-length')))
  expect(
    Buffer.compare(Buffer.from(await blob.arrayBuffer()), expectedImageBuffer),
  ).toBe(0)
})
