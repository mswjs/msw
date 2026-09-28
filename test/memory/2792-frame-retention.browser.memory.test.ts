/**
 * @see https://github.com/mswjs/msw/issues/2792
 */
import { commands } from 'vitest/browser'
import { defineTestNetwork, expect } from '../setup/vitest'

const WARMUP_REQUESTS = 50
const TOTAL_REQUESTS = 200
const FRAME_CONSTRUCTOR_NAME = 'ServiceWorkerHttpNetworkFrame'

const test = defineTestNetwork()

let unresponsiveServerUrl: string

test.beforeAll(async () => {
  unresponsiveServerUrl = await commands.startUnresponsiveServer()
})

test.afterAll(async () => {
  await commands.stopUnresponsiveServer(unresponsiveServerUrl)
})

async function fireFailingRequests(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await expect(fetch(unresponsiveServerUrl)).rejects.toThrow(TypeError)
  }
}

test('does not retain a network frame after a passthrough request fails without a response', async () => {
  // Warm-up so we don't count startup allocation.
  await fireFailingRequests(WARMUP_REQUESTS)
  const baselineFrames = await commands.countHeapObjects(FRAME_CONSTRUCTOR_NAME)

  // The actual measurement burst.
  await fireFailingRequests(TOTAL_REQUESTS)
  const settledFrames = await commands.countHeapObjects(FRAME_CONSTRUCTOR_NAME)
  const frameDelta = settledFrames - baselineFrames

  console.log(
    `\n${FRAME_CONSTRUCTOR_NAME} count after ${TOTAL_REQUESTS} failed requests:\n` +
      `  baseline: ${baselineFrames}\n` +
      `  settled:  ${settledFrames}\n` +
      `  delta:    ${frameDelta >= 0 ? '+' : ''}${frameDelta}\n`,
  )

  // A failed passthrough request never produces a "RESPONSE" message
  // from the worker, so its frame must still be released once
  // the request has settled.
  // Threshold: 5% of request count to allow for noise.
  expect(frameDelta).toBeLessThan(TOTAL_REQUESTS * 0.05)
})
