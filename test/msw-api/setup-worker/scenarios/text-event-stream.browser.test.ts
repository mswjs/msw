import { test, expect } from '../../../setup/vitest-helpers'

test('bypasses the unhandled request with the "Accept" header containing "text/event-stream"', async ({
  page,
  testServer,
}) => {
  const messages = await page.evaluate((endpointUrl) => {
    return new Promise<Array<string>>((resolve, reject) => {
      const source = new EventSource(endpointUrl)
      const messages: Array<string> = []

      source.addEventListener('message', (message) => {
        messages.push(message.data)

        if (messages.length === 3) {
          source.close()
          resolve(messages)
        }
      })
      source.addEventListener('error', () => {
        source.close()
        reject(new Error('The event stream failed'))
      })
    })
  }, testServer.http.url('/text-event-stream').href)

  expect(messages).toEqual(['hello', 'beautiful', 'world'])
})
