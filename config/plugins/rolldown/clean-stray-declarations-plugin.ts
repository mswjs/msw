import fs from 'node:fs'
import * as glob from 'glob'
import type { TsdownPlugin } from 'tsdown'

let pluginInstanceCount = 0
let closedBundleCount = 0

/**
 * Removes the declaration files emitted next to the source modules
 * during the build. The "rolldown-plugin-dts" declaration resolver
 * writes through to disk when resolving the externalized (aliased)
 * imports, leaving stray ".d.ts" files across "./src".
 *
 * @note The removal must only happen once the last build config has
 * finished. The configs build concurrently, and removing the stray
 * declarations mid-build breaks the declaration resolution of the
 * still-running configs (they read those files from disk).
 */
export function cleanStrayDeclarationsPlugin(): TsdownPlugin {
  pluginInstanceCount += 1

  return {
    name: 'cleanStrayDeclarationsPlugin',
    closeBundle() {
      closedBundleCount += 1

      if (closedBundleCount < pluginInstanceCount) {
        return
      }

      closedBundleCount = 0

      const strayDeclarationPaths = glob
        .sync('./src/**/*.d.ts', { posix: true, dotRelative: true })
        .filter((declarationPath) => {
          /**
           * @note A generated declaration always has a sibling ".ts"
           * source. Hand-written declaration sources
           * (e.g. "global.browser.d.ts") do not, and must be preserved.
           */
          const sourcePath = declarationPath.replace(/\.d\.ts$/, '.ts')
          return fs.existsSync(sourcePath)
        })

      for (const declarationPath of strayDeclarationPaths) {
        fs.rmSync(declarationPath, { force: true })
        fs.rmSync(`${declarationPath}.map`, { force: true })
      }
    },
  }
}
