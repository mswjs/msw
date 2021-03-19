import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'error.mocks.ts'),
  })
}

test('error on an unhandled REST API request', async () => {
  const { request, consoleSpy } = await createRuntime()

  const res = await request('https://mswjs.io/non-existing-page')
  const status = res.status()

  expect(status).toBe(404)

  const unhandledRequestError = consoleSpy.get('error').find((text) => {
    return /\[MSW\] Error: captured a request without a matching request handler/.test(
      text,
    )
  })

  expect(unhandledRequestError).toBeDefined()
})
