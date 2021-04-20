import * as path from 'path'
import { pageWith } from 'page-with'

test('warns on unhandled requests by default', async () => {
  const { request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'default.mocks.ts'),
  })

  const res = await request('https://mswjs.io/non-existing-page')
  const status = res.status()

  const unhandledRequestWarning = consoleSpy.get('warning').find((text) => {
    return /\[MSW\] Warning: captured a request without a matching request handler/.test(
      text,
    )
  })

  expect(consoleSpy.get('error')).toBeUndefined()
  expect(unhandledRequestWarning).toBeDefined()

  // Performs the request as-is.
  expect(status).toBe(404)
})
