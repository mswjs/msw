/**
 * @jest environment-node
 */
import * as path from 'path'
import * as fs from 'fs'
import fetch from 'node-fetch'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'

function getImageBuffer() {
  return fs.readFileSync(path.resolve(__dirname, '../../../fixtures/image.jpg'))
}

const server = setupServer(
  rest.get('http://test.mswjs.io/image', () => {
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
  const { status, headers } = response
  const actualImageBuffer = await response.buffer()
  const expectedImageBuffer = getImageBuffer()

  expect(status).toBe(200)
  expect(headers.get('x-powered-by')).toBe('msw')
  expect(headers.get('content-length')).toBe(
    actualImageBuffer.byteLength.toString(),
  )
  expect(Buffer.compare(actualImageBuffer, expectedImageBuffer)).toBe(0)
})

test('returns given blob in the mocked response', async () => {
  const response = await fetch('http://test.mswjs.io/image')
  const { status, headers } = response
  const blob = await response.blob()

  const [, blobBufferSymbol] = Object.getOwnPropertySymbols(blob)
  const actualImageBuffer = blob[blobBufferSymbol] as Buffer
  const expectedImageBuffer = getImageBuffer()

  expect(status).toBe(200)
  expect(headers.get('x-powered-by')).toBe('msw')
  expect(blob.type).toBe('image/jpeg')
  expect(blob.size).toBe(Number(headers.get('content-length')))
  expect(Buffer.compare(actualImageBuffer, expectedImageBuffer)).toBe(0)
})
