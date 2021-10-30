import * as fs from 'fs'
import * as path from 'path'
import { pageWith } from 'page-with'

test('responds with a given binary body', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'body-binary.mocks.ts'),
  })

  const res = await runtime.request('/images/abc-123')
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.body()

  const expectedBuffer = fs.readFileSync(
    path.resolve(__dirname, '../../../fixtures/image.jpg'),
  )

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(new Uint8Array(body)).toEqual(new Uint8Array(expectedBuffer))
})
