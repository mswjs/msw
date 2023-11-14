import { test, expect } from '../../../playwright.extend'
import { sleep } from '../../../../support/utils'

test('bypasses the unhandled request with the "Accept" header containing "text/event-stream"', async ({
  loadExample,
  spyOnConsole,
  createServer,
  page,
  waitFor,
}) => {
  const server = await createServer((app) => {
    app.get('/user', async (req, res) => {
      res.set({
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
      })
      res.flushHeaders()

      const chunks = ['hello', 'beautiful', 'world']

      for (const chunk of chunks) {
        res.write(`data: ${chunk}\n\n`)
        await sleep(150)
      }
    })
  })

  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./text-event-stream.mocks.ts'))

  await page.evaluate((endpointUrl) => {
    const source = new EventSource(endpointUrl)
    source.addEventListener('message', (message) => {
      console.log(message.data)
    })
  }, server.http.url('/user'))

  await waitFor(() => {
    expect(consoleSpy.get('error')).toBeUndefined()
    expect(consoleSpy.get('log')).toEqual(
      expect.arrayContaining(['hello', 'beautiful', 'world']),
    )
  })
})
