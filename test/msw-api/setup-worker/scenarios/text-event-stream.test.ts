import * as path from 'path'
import { pageWith } from 'page-with'
import { createServer, ServerApi } from '@open-draft/test-server'
import { sleep } from '../../../support/utils'
import { waitFor } from '../../../support/waitFor'

let httpServer: ServerApi

beforeAll(async () => {
  httpServer = await createServer((app) => {
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
})

afterAll(async () => {
  await httpServer.close()
})

test('bypasses the unhandled request with the "Accept" header containing "text/event-stream"', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'text-event-stream.mocks.ts'),
  })

  await runtime.page.evaluate((endpointUrl) => {
    const source = new EventSource(endpointUrl)
    source.addEventListener('message', (message) => {
      console.log(message.data)
    })
  }, httpServer.http.makeUrl('/user'))

  await waitFor(() => {
    expect(runtime.consoleSpy.get('error')).toBeUndefined()
    expect(runtime.consoleSpy.get('log')).toEqual(
      expect.arrayContaining(['hello', 'beautiful', 'world']),
    )
  })
})
