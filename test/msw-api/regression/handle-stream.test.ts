import { test, expect } from '../../setup/vitest-helpers'

test('handles a stream response without throwing a timeout error', async ({
  network,
  page,
  testServer,
}) => {
  const bypassedResponse = Promise.withResolvers<string>()
  network.events.on('response:bypass', async ({ response }) => {
    bypassedResponse.resolve(await response.clone().text())
  })

  const response = await page.evaluate(async (endpointUrl) => {
    const abortController = new AbortController()
    const abortTimeout = setTimeout(() => abortController.abort(), 1_250)
    const response = await fetch(endpointUrl, {
      signal: abortController.signal,
    })
    clearTimeout(abortTimeout)

    if (!response.body) {
      throw new Error('Expected the response to have a body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let textResponse = ''

    while (true) {
      const chunk = await reader.read()

      if (chunk.done) {
        return textResponse
      }

      textResponse += decoder.decode(chunk.value, { stream: true })
    }
  }, testServer.http.url('/stream').href)

  await expect(bypassedResponse.promise).resolves.toBe('first-chunk last-chunk')
  expect(response).toBe('first-chunk last-chunk')
})
