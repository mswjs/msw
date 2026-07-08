import fs from 'node:fs'
import path from 'node:path'
import crypto from 'crypto'
import minify from 'babel-minify'
import { invariant } from 'outvariant'
import type { TsdownPlugin } from 'tsdown'
import copyServiceWorker from '../../copyServiceWorker.ts'

const SERVICE_WORKER_ENTRY_PATH = path.resolve(
  process.cwd(),
  './src/mockServiceWorker.js',
)

const SERVICE_WORKER_OUTPUT_PATH = path.resolve(
  process.cwd(),
  './lib/mockServiceWorker.js',
)

function getChecksum(contents: string): string {
  const { code } = minify(contents, {}, { comments: false })

  return crypto.createHash('md5').update(code, 'utf8').digest('hex')
}

export function getWorkerChecksum(): string {
  const workerContents = fs.readFileSync(SERVICE_WORKER_ENTRY_PATH, 'utf8')
  return getChecksum(workerContents)
}

export function copyWorkerPlugin(checksum: string): TsdownPlugin {
  return {
    name: 'copyWorkerPlugin',
    async buildStart() {
      invariant(
        SERVICE_WORKER_ENTRY_PATH,
        'Failed to locate the worker script source file',
      )
    },
    async writeBundle() {
      if (fs.existsSync(SERVICE_WORKER_OUTPUT_PATH)) {
        console.warn(
          'Skipped copying the worker script to "%s": already exists',
          SERVICE_WORKER_OUTPUT_PATH,
        )
        return
      }

      // eslint-disable-next-line no-console
      console.log('worker script checksum:', checksum)

      await copyServiceWorker(
        SERVICE_WORKER_ENTRY_PATH,
        SERVICE_WORKER_OUTPUT_PATH,
        checksum,
      )
    },
  }
}
