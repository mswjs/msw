import * as path from 'path'
import { pageWith } from 'page-with'

test('executes a given callback on an unhandled request', async () => {
  const { request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'callback.mocks.ts'),
  })

  const res = await request('https://mswjs.io/non-existing-page')
  const status = res.status()

  // Request is performed as-is.
  expect(status).toBe(404)

  // Custom callback executed.
  expect(consoleSpy.get('log')).toContain(
    'Oops, unhandled GET https://mswjs.io/non-existing-page',
  )

  // No warnings/errors produced by MSW.
  expect(consoleSpy.get('error')).toBeUndefined()
  expect(consoleSpy.get('warning')).toBeUndefined()
})
