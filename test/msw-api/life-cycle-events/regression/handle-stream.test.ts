import * as path from 'path'
import { pageWith } from 'page-with'
import { waitUntil } from '../../../support/utils'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'handle-stream.mocks.ts'),
    routes(app) {
      app.get('/stream', (req, res) => {
        res.write('first-chunk')

        setTimeout(() => {
          res.write(' last-chunk')
          res.end()
        }, 250 * 6)
      })
    },
  })
}

test('handles a stream response without throwing a timeout error', async () => {
  const runtime = await createRuntime()

  const getStreamResponse = () => {
    return runtime.page.evaluate(() => {
      const abortController = new AbortController()
      const abortTimeout = setTimeout(() => abortController.abort(), 250 * 5)

      return new Promise<string>((resolve, reject) => {
        let textResponse = ''
        const decoder = new TextDecoder()
        return fetch('/stream', { signal: abortController.signal })
          .then((response) => {
            const reader = response.body.getReader()
            clearTimeout(abortTimeout)
            reader.read().then(function processStream({ done, value }) {
              if (done) {
                resolve(textResponse)
                return
              }

              textResponse += decoder.decode(value, { stream: true })
              return reader.read().then(processStream)
            })
          })
          .catch(reject)
      })
    })
  }

  const response = await getStreamResponse()

  await waitUntil(() => {
    expect(runtime.consoleSpy.get('warning')).toEqual([
      `[response:bypass] first-chunk last-chunk`,
    ])
  })

  expect(response).toEqual('first-chunk last-chunk')
})
