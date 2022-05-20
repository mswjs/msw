import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'
import minify from 'babel-minify'
import { invariant } from 'outvariant'
import type { Plugin } from 'esbuild'
import copyServiceWorker from '../../copyServiceWorker'

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

let hasRunAlready = false

export function workerScriptPlugin(): Plugin {
  return {
    name: 'workerScriptPlugin',
    async setup(build) {
      if (hasRunAlready) {
        return
      }

      hasRunAlready = true

      const workerSourcePath = path.resolve(
        process.cwd(),
        './src/mockServiceWorker.js',
      )
      const workerOutputPath = path.resolve(
        process.cwd(),
        './lib/mockServiceWorker.js',
      )

      invariant(
        workerSourcePath,
        'Failed to locate the worker script source file',
      )
      invariant(
        workerOutputPath,
        'Failed to locate the worker script output file',
      )

      // Generate the checksum from the worker script's contents.
      const workerContents = await fs.readFile(workerSourcePath, 'utf8')
      const checksum = getChecksum(workerContents)

      // Inject the global "SERVICE_WORKER_CHECKSUM" variable
      // for runtime worker integrity check.
      build.initialOptions.define = {
        SERVICE_WORKER_CHECKSUM: JSON.stringify(checksum),
      }

      build.onLoad({ filter: /mockServiceWorker\.js$/ }, async () => {
        return {
          // Prevent the worker script from being transpiled.
          // But, generally, the worker script is not in the entrypoints.
          contents: '',
        }
      })

      build.onEnd(() => {
        // Copy the worker script on the next tick.
        setTimeout(async () => {
          await copyServiceWorker(workerSourcePath, workerOutputPath, checksum)
        }, 100)
      })
    },
  }
}
