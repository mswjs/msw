import * as path from 'path'
import { pageWith } from 'page-with'
import { waitFor } from '../../support/waitFor'

test('supports a ReadableStream as the mocked response body', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'stream.mocks.ts'),
  })

  runtime.page.evaluate(() => {
    document.body.click()
  })

  const req = await runtime.page.waitForRequest(/\/video$/)
  const res = await runtime.page.waitForResponse(/\/video$/)
  const timing = req.timing()

  await waitFor(() => {
    expect(runtime.consoleSpy.get('log')).toEqual(
      expect.arrayContaining([expect.stringMatching('stream chunk')]),
    )
  })

  expect(await res.text()).toBe('helloworld')

  // Ensure the data was streamed from the worker
  // and not responded instantly.
  expect(runtime.consoleSpy.get('log')).toContain('stream chunk: hello')
  expect(runtime.consoleSpy.get('log')).toContain('stream chunk: world')
  expect(timing.responseEnd).toBeGreaterThan(600)
})
