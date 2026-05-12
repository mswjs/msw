// @vitest-environment node
/**
 * @see https://github.com/mswjs/msw/issues/2735
 */
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { writeHeapSnapshot } from 'node:v8'
import { http } from 'msw'
import { setupServer } from 'msw/node'

const TOTAL_REQUESTS = 5_000
const CONCURRENCY = 20
const URL = 'https://localhost/leak'

async function fireBatch(count: number, concurrency: number): Promise<void> {
  let inflight = 0
  let started = 0
  let failed = false

  return new Promise((resolve, reject) => {
    const next = () => {
      if (failed) {
        return
      }
      if (started >= count && inflight === 0) {
        return resolve()
      }

      while (inflight < concurrency && started < count) {
        started++
        inflight++
        fetch(URL)
          .then((r) => r.text())
          .catch((error) => {
            failed = true
            reject(error)
          })
          .finally(() => {
            inflight--
            next()
          })
      }
    }
    next()
  })
}

async function forceGc(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    global.gc?.()
    await delay(30)
  }
}

function countConstructors(snapPath: string): Map<string, number> {
  const json = JSON.parse(fs.readFileSync(snapPath, 'utf8'))
  const meta = json.snapshot.meta
  const F = meta.node_fields.length
  const fT = meta.node_fields.indexOf('type')
  const fN = meta.node_fields.indexOf('name')
  const objIdx = meta.node_types[0].indexOf('object')
  const counts = new Map<string, number>()

  for (let i = 0; i < json.snapshot.node_count; i++) {
    const b = i * F
    if (json.nodes[b + fT] !== objIdx) {
      continue
    }
    const name = json.strings[json.nodes[b + fN]]
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return counts
}

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('does not retain a per-request Emitter after the response is delivered', async () => {
  server.use(
    http.get('https://localhost/leak', () => {
      return new Response()
    }),
  )

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'msw-emitter-leak-'))

  // Warm-up so JIT settles and we don't count startup allocation.
  await fireBatch(200, CONCURRENCY)
  await forceGc()

  const baseSnap = path.join(tmp, 'baseline.heapsnapshot')
  writeHeapSnapshot(baseSnap)
  const baseCounts = countConstructors(baseSnap)

  // The actual measurement burst.
  await fireBatch(TOTAL_REQUESTS, CONCURRENCY)
  await delay(2000)
  await forceGc()
  await delay(1000)
  await forceGc()

  const settledSnap = path.join(tmp, 'settled.heapsnapshot')
  writeHeapSnapshot(settledSnap)
  const settledCounts = countConstructors(settledSnap)

  const watch = [
    'Emitter',
    'Listener',
    'LensList',
    'WeakMap',
    'WeakSet',
  ] as const
  console.log(`\nConstructor count after ${TOTAL_REQUESTS} requests:\n`)
  console.log(
    '  ' +
      'name'.padEnd(12) +
      'baseline'.padStart(10) +
      'settled'.padStart(10) +
      'delta'.padStart(10),
  )
  console.log('  ' + '-'.repeat(42))
  for (const name of watch) {
    const b = baseCounts.get(name) ?? 0
    const s = settledCounts.get(name) ?? 0
    const d = s - b
    const dStr = (d >= 0 ? '+' : '') + d
    console.log(
      '  ' +
        name.padEnd(12) +
        String(b).padStart(10) +
        String(s).padStart(10) +
        dStr.padStart(10),
    )
  }
  console.log(`\nHeap snapshots written to: ${tmp}\n`)

  const emitterDelta =
    (settledCounts.get('Emitter') ?? 0) - (baseCounts.get('Emitter') ?? 0)

  // After the fix, this delta is essentially 0. Today, it's ~= TOTAL.
  // Threshold: 5% of request count to allow for noise.
  expect(emitterDelta).toBeLessThan(TOTAL_REQUESTS * 0.05)
})
