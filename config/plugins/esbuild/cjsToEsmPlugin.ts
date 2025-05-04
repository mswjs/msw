import * as fs from 'node:fs'
import * as url from 'node:url'
import * as path from 'node:path'
import { type Plugin } from 'esbuild'
import { rollup } from 'rollup'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'

const ROOT_DIR = url.fileURLToPath(new URL('../../../', import.meta.url))
const SHIMS_DIR = new URL('../../../lib/shims', import.meta.url)

export function cjsToEsmPlugin(dependencies: Array<string>): Plugin {
  const matchingModules: {
    [modulePath: string]: {
      [dependency: string]: {
        shimFilePath: string
      }
    }
  } = {}

  return {
    name: 'cjs-to-esm',
    async setup(build) {
      if (build.initialOptions.format !== 'esm') {
        return
      }

      const dependencyRegex = new RegExp(
        `^import\\s*[\\s\\S]*?\\s*from\\s*['"](${dependencies.join('|')})['"]`,
        'dgm',
      )

      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        const contents = await fs.promises.readFile(args.path, 'utf8')

        for (const match of contents.matchAll(dependencyRegex)) {
          const dependency = match[1]
          const shimOutputPath = path.join(
            url.fileURLToPath(SHIMS_DIR),
            `${dependency}.mjs`,
          )

          const bundle = await rollup({
            input: dependency,
            plugins: [
              resolve({
                preferBuiltins: true,
              }),
              commonjs(),
            ],
            external: [],
          })

          await bundle.write({
            format: 'esm',
            file: shimOutputPath,
          })

          const modulePath = path.relative(ROOT_DIR, args.path)

          matchingModules[modulePath] ??= {}
          matchingModules[modulePath][dependency] = {
            shimFilePath: path.relative(ROOT_DIR, shimOutputPath),
          }
        }

        return undefined
      })

      build.onEnd(async (result) => {
        if (result.errors.length > 0) {
          return
        }

        const getOutputFile = (filePath: string) => {
          return result.outputFiles?.find((file) => {
            const outputFilePath = path.relative(ROOT_DIR, file.path)
            return outputFilePath === filePath
          })
        }

        for (const outputFilePath in result.metafile!.outputs) {
          const metafile = result.metafile!.outputs[outputFilePath]
          if (!metafile.entryPoint) {
            continue
          }

          const shims = matchingModules[metafile.entryPoint]
          if (!shims) {
            continue
          }

          console.log('Found shims for %s', outputFilePath)

          const file = getOutputFile(outputFilePath)
          if (!file) {
            console.log('No output file found for %s', outputFilePath)
            continue
          }

          const textContents = file.text

          for (const match of textContents.matchAll(dependencyRegex)) {
            const dependency = match[1]

            console.log('Found dependency %s', dependency)

            const shim = shims[dependency]
            if (!shim) {
              console.log('No shim found for %s', dependency)
              continue
            }

            console.log('Found shim for %s', dependency, shim)

            const relativeShimFilePath = path.relative(
              path.dirname(outputFilePath),
              shim.shimFilePath,
            )

            console.log(
              'Shim path for "%s": %s',
              dependency,
              relativeShimFilePath,
            )

            file.contents = Buffer.from(
              file.text.replace(
                file.text.slice(match.indices![1][0], match.indices![1][1]),
                relativeShimFilePath,
              ),
            )

            console.log(
              'Updated "%s" to use shim import of the CJS dependency "%s"!',
              outputFilePath,
              dependency,
            )
          }
        }
      })
    },
  }
}
