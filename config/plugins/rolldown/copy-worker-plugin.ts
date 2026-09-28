import fs from 'node:fs'
import url from 'node:url'
import crypto from 'node:crypto'
import { invariant } from 'outvariant'
import { Rolldown, type TsdownPlugin } from 'tsdown'
import copyServiceWorker from '../../copy-service-worker.ts'

const SERVICE_WORKER_ENTRY_PATH = url.fileURLToPath(
  new URL('../../../src/mockServiceWorker.js', import.meta.url),
)

const SERVICE_WORKER_OUTPUT_PATH = url.fileURLToPath(
  new URL('../../../lib/mockServiceWorker.js', import.meta.url),
)

/**
 * Compute the integrity checksum of the worker script.
 * The script is normalized before hashing so that cosmetic changes
 * (comments, including legal ones, and whitespace) do not invalidate
 * the checksum. Compression and mangling are disabled to keep the
 * checksum stable across minifier updates.
 */
export async function getWorkerChecksum(): Promise<string> {
  const bundle = await Rolldown.rolldown({
    input: SERVICE_WORKER_ENTRY_PATH,
    platform: 'browser',
    treeshake: false,
    logLevel: 'silent',
  })
  const { output } = await bundle.generate({
    format: 'iife',
    comments: false,
    minify: {
      compress: false,
      mangle: false,
      codegen: {
        removeWhitespace: true,
      },
    },
  })
  await bundle.close()

  const [chunk] = output

  invariant(chunk, 'Failed to normalize the worker script: empty output')

  return crypto.createHash('md5').update(chunk.code, 'utf8').digest('hex')
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
