import * as path from 'path'
import { pageWith } from 'page-with'

test('bypasses an unhandled request by default', async () => {
  const { request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'bypass.mocks.ts'),
  })

  const res = await request('https://mswjs.io/non-existing-page')
  const status = res.status()

  // Produces no MSW warnings/errors.
  expect(consoleSpy.get('error')).toBeUndefined()
  expect(consoleSpy.get('warning')).toBeUndefined()

  // Performs the request as-is.
  expect(status).toBe(404)
})
