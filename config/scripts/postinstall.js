const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { globSync } = require('glob')

// When executing the "postinstall" script, the "process.cwd" equals
// the package directory, not the parent project where the package is installed.
// NPM stores the parent project directory in the "INIT_CWD" env variable.
const parentPackageCwd = process.env.INIT_CWD

function executeInitForDir(exePath, packageCwd) {
  try {
    /**
     * @note Call the "init" command directly. It will now copy the worker script
     * to all saved paths in "msw.workerDirectory"
     */
    execSync(`node ${exePath} init`, {
      cwd: packageCwd,
    })
  } catch (error) {
    console.error(
      `[MSW] Failed to automatically update the worker script.\n\n${error}`,
    )
  }
}

function postInstall() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(parentPackageCwd, 'package.json'), 'utf8'),
  )

  const cliExecutable = path.resolve(process.cwd(), 'cli/index.js')

  if (packageJson.workspaces) {
    const dirs = globSync(packageJson.workspaces, { cwd: parentPackageCwd })
    for (let dir of dirs) {
      const dirPath = path.resolve(parentPackageCwd, dir)
      const childPackageJson = JSON.parse(
        fs.readFileSync(path.resolve(dirPath, 'package.json'), 'utf8'),
      )
      if (childPackageJson.msw && childPackageJson.msw) {
        executeInitForDir(cliExecutable, dirPath)
      }
    }
  }

  if (!packageJson.msw || !packageJson.msw.workerDirectory) {
    return
  }

  executeInitForDir(cliExecutable, parentPackageCwd)
}

postInstall()
