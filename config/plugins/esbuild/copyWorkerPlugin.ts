import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import minify from 'babel-minify'
import { invariant } from 'outvariant'
import type { Plugin } from 'esbuild'
import copyServiceWorker from '../../copyServiceWorker'

const SERVICE_WORKER_ENTRY_PATH = path.resolve(
  process.cwd(),
  './src/mockServiceWorker.js',
)

const SERVICE_WORKER_OUTPUT_PATH = path.resolve(
  process.cwd(),
  './lib/mockServiceWorker.js',
)

function getChecksum(contents: string): string {
  const { code } = minify(
    contents,
    {},
    {
      // @ts-ignore "babel-minify" has no type definitions.
      comments: false,
    },
  )

  return crypto.createHash('md5').update(code, 'utf8').digest('hex')
}

export function getWorkerChecksum(): string {
  const workerContents = fs.readFileSync(SERVICE_WORKER_ENTRY_PATH, 'utf8')
  return getChecksum(workerContents)
}

export function copyWorkerPlugin(checksum: string): Plugin {
  return {
    name: 'copyWorkerPlugin',
    async setup(build) {
      invariant(
        SERVICE_WORKER_ENTRY_PATH,
        'Failed to locate the worker script source file',
      )

      if (fs.existsSync(SERVICE_WORKER_OUTPUT_PATH)) {
        console.warn(
          'Skipped copying the worker script to "%s": already exists',
          SERVICE_WORKER_OUTPUT_PATH,
        )
        return
      }

      // Generate the checksum from the worker script's contents.
      // const workerContents = await fs.readFile(workerSourcePath, 'utf8')
      // const checksum = getChecksum(workerContents)

      build.onLoad({ filter: /mockServiceWorker\.js$/ }, async () => {
        return {
          // Prevent the worker script from being transpiled.
          // But, generally, the worker script is not in the entrypoints.
          contents: '',
        }
      })

      build.onEnd(() => {
        console.log('worker script checksum:', checksum)

        // Copy the worker script on the next tick.
        process.nextTick(async () => {
          await copyServiceWorker(
            SERVICE_WORKER_ENTRY_PATH,
            SERVICE_WORKER_OUTPUT_PATH,
            checksum,
          )
        })
      })
    },
  }
}
