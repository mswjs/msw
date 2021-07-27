import * as path from 'path'
import { pageWith } from 'page-with'

test('warns on unhandled requests by default', async () => {
  const { request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'default.mocks.ts'),
  })

  const res = await request('https://mswjs.io/non-existing-page')
  const status = res.status()

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /\[MSW\] Warning: captured a request without a matching request handler/,
      ),
    ]),
  )

  expect(consoleSpy.get('error')).toBeUndefined()

  // Performs the request as-is.
  expect(status).toBe(404)
})
