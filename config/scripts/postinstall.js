const fs = require('fs')
const path = require('path')
const cwd = process.env.INIT_CWD

// 1. Check if "package.json" has "msw.workerDirectory" property set.
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(cwd, 'package.json'), 'utf8'),
)

if (!packageJson.msw || !packageJson.msw.workerDirectory) {
  return
}

// 2. Check if the worker directory is an existing path.
const { workerDirectory } = packageJson.msw
const absoluteWorkerDirectory = path.resolve(cwd, workerDirectory)

if (!fs.existsSync(absoluteWorkerDirectory)) {
  return console.error(
    `[MSW] Failed to automatically update the worker script at "%s": given path does not exist.`,
    workerDirectory,
  )
}

// 3. Update the worker script.
const init = require('../../cli/init')

try {
  init({ publicDir: absoluteWorkerDirectory })
} catch (error) {
  console.error(
    `[MSW] Failed to automatically update the worker script:\n${error}`,
  )
}
