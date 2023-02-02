import { test, expect } from '../../playwright.extend'

test('handles a stream response without throwing a timeout error', async ({
  createServer,
  loadExample,
  spyOnConsole,
  fetch,
  page,
  waitFor,
}) => {
  const server = await createServer((app) => {
    app.get('/stream', (_, res) => {
      res.write('first-chunk')

      setTimeout(() => {
        res.write(' last-chunk')
        res.end()
      }, 250 * 6)
    })
  })

  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./handle-stream.mocks.ts'))

  const getStreamResponse = () => {
    return page.evaluate(
      ([endpointUrl]) => {
        const abortController = new AbortController()
        const abortTimeout = setTimeout(() => abortController.abort(), 250 * 5)

        return new Promise<string>((resolve, reject) => {
          let textResponse = ''
          const decoder = new TextDecoder()

          return fetch(endpointUrl, {
            signal: abortController.signal,
          })
            .then((response) => {
              // @ts-expect-error Response is a runtime object.
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
      },
      [server.http.url('/stream')],
    )
  }

  const response = await getStreamResponse()

  await waitFor(() => {
    expect(consoleSpy.get('warning')).toEqual([
      `[response:bypass] first-chunk last-chunk`,
    ])
  })

  expect(response).toEqual('first-chunk last-chunk')
})
