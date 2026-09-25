// @vitest-environment node
/**
 * @see https://github.com/mswjs/msw/issues/2792
 */
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as http from 'node:http'
import type { AddressInfo } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { writeHeapSnapshot } from 'node:v8'
import { setupServer } from 'msw/node'

const WARMUP_REQUESTS = 500
const TOTAL_REQUESTS = 1_500
const FRAME_CONSTRUCTOR_NAME = 'InterceptorHttpNetworkFrame'

/**
 * A real HTTP server that reads the request and destroys
 * the socket without responding. Every passthrough request
 * to it fails with a network error and never produces a response.
 */
const backend = http.createServer((request) => {
  request.resume()
  request.on('end', () => {
    request.socket.destroy()
  })
})

const server = setupServer()

let backendUrl: string

async function fireFailingRequests(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await expect(fetch(backendUrl)).rejects.toThrow(TypeError)
  }
}

async function forceGc(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    global.gc?.()
    await delay(30)
  }
}

function countConstructors(snapshotPath: string): Map<string, number> {
  const json = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  const meta = json.snapshot.meta
  const fieldCount = meta.node_fields.length
  const typeFieldIndex = meta.node_fields.indexOf('type')
  const nameFieldIndex = meta.node_fields.indexOf('name')
  const objectTypeIndex = meta.node_types[0].indexOf('object')
  const counts = new Map<string, number>()

  for (let i = 0; i < json.snapshot.node_count; i++) {
    const base = i * fieldCount

    if (json.nodes[base + typeFieldIndex] !== objectTypeIndex) {
      continue
    }

    const name = json.strings[json.nodes[base + nameFieldIndex]]
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return counts
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    backend.listen(0, '127.0.0.1', () => {
      resolve()
    })
  })

  const { port } = backend.address() as AddressInfo
  backendUrl = `http://127.0.0.1:${port}/`

  server.listen({ onUnhandledFrame: 'bypass' })
})

afterAll(async () => {
  server.close()
  backend.closeAllConnections()

  await new Promise<void>((resolve) => {
    backend.close(() => {
      resolve()
    })
  })
})

test('does not retain a network frame after a passthrough request fails without a response', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'msw-frame-retention-'))

  // Warm-up so JIT settles and we don't count startup allocation.
  await fireFailingRequests(WARMUP_REQUESTS)
  await forceGc()

  const baselineSnapshot = path.join(tmp, 'baseline.heapsnapshot')
  writeHeapSnapshot(baselineSnapshot)
  const baselineCounts = countConstructors(baselineSnapshot)

  // The actual measurement burst.
  await fireFailingRequests(TOTAL_REQUESTS)
  await delay(2000)
  await forceGc()
  await delay(1000)
  await forceGc()

  const settledSnapshot = path.join(tmp, 'settled.heapsnapshot')
  writeHeapSnapshot(settledSnapshot)
  const settledCounts = countConstructors(settledSnapshot)

  const baselineFrames = baselineCounts.get(FRAME_CONSTRUCTOR_NAME) ?? 0
  const settledFrames = settledCounts.get(FRAME_CONSTRUCTOR_NAME) ?? 0
  const frameDelta = settledFrames - baselineFrames

  console.log(
    `\n${FRAME_CONSTRUCTOR_NAME} count after ${TOTAL_REQUESTS} failed requests:\n` +
      `  baseline: ${baselineFrames}\n` +
      `  settled:  ${settledFrames}\n` +
      `  delta:    ${frameDelta >= 0 ? '+' : ''}${frameDelta}\n` +
      `\nHeap snapshots written to: ${tmp}\n`,
  )

  // A failed passthrough request never emits a "response" event,
  // so its frame must still be released once the request has settled.
  // Threshold: 5% of request count to allow for noise.
  expect(frameDelta).toBeLessThan(TOTAL_REQUESTS * 0.05)
})
