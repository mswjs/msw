const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { until } = require('@open-draft/until')
const confirm = require('@inquirer/confirm').default
const invariant = require('./invariant')
const { SERVICE_WORKER_BUILD_PATH } = require('../config/constants')

module.exports = async function init(args) {
  const [, publicDir] = args._
  const CWD = args.cwd || process.cwd()

  const packageJsonPath = path.resolve(CWD, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const savedWorkerDirectories = Array.prototype.concat(
    (packageJson.msw && packageJson.msw.workerDirectory) || [],
  )

  if (publicDir) {
    // If the public directory was provided, copy the worker script
    // to that directory only. Even if there are paths stored in "msw.workerDirectory",
    // those will not be touched.
    await copyWorkerScript(publicDir, CWD)
    const relativePublicDir = toRelative(publicDir, CWD)
    printSuccessMessage([publicDir])

    if (args.save) {
      // Only save the public path if it's not already saved in "package.json".
      if (!savedWorkerDirectories.includes(relativePublicDir)) {
        saveWorkerDirectory(packageJsonPath, relativePublicDir)
      }
    }
    // Explicitly check if "save" was not provided (was null).
    // You can also provide the "--no-save" option, and then "args.save"
    // will equal to false.
    else if (args.save == null) {
      console.log(`\
      ${chalk.cyan(
        'INFO',
      )} In order to ease the future updates to the worker script,
      we recommend saving the path to the worker directory in your package.json.`)

      // If the "--save" flag was not provided, prompt to save
      // the public path.
      promptWorkerDirectoryUpdate(
        `Do you wish to save "${relativePublicDir}" as the worker directory?`,
        packageJsonPath,
        relativePublicDir,
      )
    }

    return
  }

  // Calling "init" without a public directory but with the "--save" flag
  // is no-op.
  invariant(
    args.save == null,
    'Failed to copy the worker script: cannot call the "init" command without a public directory but with the "--save" flag. Either drop the "--save" flag to copy the worker script to all paths listed in "msw.workerDirectory", or add an explicit public directory to the command, like "npx msw init ./public".',
  )

  // If the public directory was not provided, check any existing
  // paths in "msw.workerDirectory". When called without the public
  // directory, the "init" command must copy the worker script
  // to all the paths stored in "msw.workerDirectory".
  if (savedWorkerDirectories.length > 0) {
    const copyResults = await Promise.allSettled(
      savedWorkerDirectories.map((destination) => {
        return copyWorkerScript(destination, CWD).catch((error) => {
          // Inject the absolute destination path onto the copy function rejections
          // so it's available in the failed paths array below.
          throw [toAbsolute(destination, CWD), error]
        })
      }),
    )
    const successfulPaths = copyResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
    const failedPathsWithErrors = copyResults
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason)

    // Notify about failed copies, if any.
    if (failedPathsWithErrors.length > 0) {
      printFailureMessage(failedPathsWithErrors)
    }

    // Notify about successful copies, if any.
    if (successfulPaths.length > 0) {
      printSuccessMessage(successfulPaths)
    }
  }
}

function toRelative(absolutePath, cwd) {
  return path.relative(cwd, absolutePath)
}

function toAbsolute(maybeAbsolutePath, cwd) {
  return path.isAbsolute(maybeAbsolutePath)
    ? maybeAbsolutePath
    : path.resolve(cwd, maybeAbsolutePath)
}

async function copyWorkerScript(destination, cwd) {
  // When running as a part of "postinstall" script, "cwd" equals the library's directory.
  // The "postinstall" script resolves the right absolute public directory path.
  const absolutePublicDir = toAbsolute(destination, cwd)

  if (!fs.existsSync(absolutePublicDir)) {
    // Try to create the directory if it doesn't exist
    const createDirectoryResult = await until(() =>
      fs.promises.mkdir(absolutePublicDir, { recursive: true }),
    )

    invariant(
      createDirectoryResult.error == null,
      'Failed to copy the worker script at "%s": directory does not exist and could not be created.\nMake sure to include a relative path to the public directory of your application.\n\nSee the original error below:\n%s',
      absolutePublicDir,
      createDirectoryResult.error,
    )
  }

  console.log('Copying the worker script at "%s"...', absolutePublicDir)

  const serviceWorkerFilename = path.basename(SERVICE_WORKER_BUILD_PATH)
  const swDestFilepath = path.resolve(absolutePublicDir, serviceWorkerFilename)

  fs.copyFileSync(SERVICE_WORKER_BUILD_PATH, swDestFilepath)

  return swDestFilepath
}

function printSuccessMessage(paths) {
  console.log(`
${chalk.green('Worker script successfully copied!')}
${paths.map((path) => chalk.gray(`  - ${path}\n`))}
Continue by describing the network in your application:
  

${chalk.cyan.bold('https://mswjs.io/docs/getting-started')}
`)
}

function printFailureMessage(pathsWithErrors) {
  console.error(`\
${chalk.red('Copying the worker script failed at following paths:')}
${pathsWithErrors
  .map(([path, error]) => chalk.gray(`  - ${path}`) + '\n' + `  ${error}`)
  .join('\n\n')}
  `)
}

function saveWorkerDirectory(packageJsonPath, publicDir) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

  console.log(
    chalk.gray('Updating "msw.workerDirectory" at "%s"...'),
    packageJsonPath,
  )

  const prevWorkerDirectory = Array.prototype.concat(
    (packageJson.msw && packageJson.msw.workerDirectory) || [],
  )
  const nextWorkerDirectory = Array.from(
    new Set(prevWorkerDirectory).add(publicDir),
  )

  const nextPackageJson = Object.assign({}, packageJson, {
    msw: {
      workerDirectory: nextWorkerDirectory,
    },
  })

  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(nextPackageJson, null, 2),
    'utf8',
  )
}

function promptWorkerDirectoryUpdate(message, packageJsonPath, publicDir) {
  return confirm({
    theme: {
      prefix: chalk.yellowBright('?'),
    },
    message,
  }).then((answer) => {
    if (answer) {
      saveWorkerDirectory(packageJsonPath, publicDir)
    }
  })
}
