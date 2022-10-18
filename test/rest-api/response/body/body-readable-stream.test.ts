import { pageWith } from 'page-with'

it('supports mocking ReadableStream responses', async () => {
  const runtime = await pageWith({
    example: require.resolve('./body-readable-stream.mocks.ts'),
  })

  const res = await runtime.request('/video')
  const body = await res.text()

  // Must respond with a stream.
  expect(res.status()).toBe(200)
  expect(body).toBe('helloworld')
  expect(res.request().timing().responseEnd).toBeGreaterThanOrEqual(400)

  // Must print the response log, indicating that the response
  // has been successfully cloned and read for this log.
  expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^\[MSW\] \d{2}:\d{2}:\d{2} GET \/video 200 OK$/),
    ]),
  )
})
