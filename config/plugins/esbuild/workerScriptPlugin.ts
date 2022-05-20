import fs from 'fs-extra'
import path from 'path'
import { invariant } from 'outvariant'
import type { Plugin } from 'esbuild'
import minify from 'babel-minify'
import crypto from 'crypto'
import copyServiceWorker from '../../copyServiceWorker'

function getChecksum(contents: string): string {
  const { code } = minify(
    contents,
    {},
    {
      // @ts-ignore
      comments: false,
    },
  )

  return crypto.createHash('md5').update(code, 'utf8').digest('hex')
}

export function workerScriptPlugin(): Plugin {
  return {
    name: 'workerScriptPlugin',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async (args) => {
        return {
          // Do not emit the worker script because "tsup"
          // transpiles it, adding extra things to the source.
          contents: 'function hello() { world }',
        }
      })

      build.onEnd(async (result) => {
        const workerSourcePath = path.resolve(
          process.cwd(),
          build.initialOptions.entryPoints[0],
        )
        invariant(
          workerSourcePath,
          'Failed to locate the worker script source file',
        )

        const workerOutputPath = result.outputFiles[0].path
        invariant(
          workerOutputPath,
          'Failed to locate the worker script output file',
        )

        const workerContents = await fs.readFile(workerSourcePath, 'utf8')
        const checksum = getChecksum(workerContents)

        // Copy the worker script on the next tick.
        setTimeout(async () => {
          await copyServiceWorker(workerSourcePath, workerOutputPath, checksum)
        }, 100)
      })
    },
  }
}
