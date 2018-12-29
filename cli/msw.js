#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const prompt = require('prompt')
const cwd = process.cwd()

console.log('Creating Mock Service Worker...\n')

prompt.message = null
prompt.start()

prompt.get(
  {
    properties: {
      appDir: {
        type: 'string',
        required: true,
        description: 'Server root directory (relative)',
        message: `Please provide an existing directory relative to "${cwd}"\n`,
        conform(data) {
          const absolutePath = path.resolve(cwd, data)
          const dirExists = fs.existsSync(absolutePath)

          if (!dirExists) {
            console.error(
              `${chalk.red('error')}:`,
              "\t Directory doesn't exist:",
              path.resolve(cwd, chalk.red(data)),
            )
          }

          return dirExists
        },
      },
    },
  },
  (error, data) => {
    if (error) {
      console.error(chalk.red.bold('\n\nFailed to create Mock Service Worker!'))
      console.log(
        chalk.yellow(
          `Note that you can't use MSW without its Service Worker created and registered properly.\nRun ${chalk.cyan(
            'msw setup',
          )} to create Mock Service Worker.`,
        ),
      )
      console.log('')
      console.log(
        'If you think this error has nothing to do with you, please create an issue (https://github.com/kettanaito/msw/issues/new) and attach the next stack trace as its description:',
      )
      console.log(chalk.red(error))
      console.log('')
      process.exit(1)
    }

    const { appDir } = data
    const srcFilepath = path.resolve(__dirname, '../mockServiceWorker.js')
    const destFilepath = path.resolve(cwd, appDir, 'mockServiceWorker.js')

    fs.copyFile(srcFilepath, destFilepath, (error) => {
      if (error) {
        console.error(error)
        process.exit(1)
      }

      console.log(chalk.green.bold('\nService Worker successfully created!'))
      console.log('Located at: %s', chalk.magenta(destFilepath))
      console.log('\nYou now need to register it in your application:')
      console.log(
        `\n\tmsw.start(navigator.serviceWorker.register('mockServiceWorker.js'))`,
      )
      console.log('')
    })
  },
)
