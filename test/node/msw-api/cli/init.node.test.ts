/**
 * @jest-environment node
 */
import * as path from 'path'
import * as fs from 'fs-extra'
import { exec } from 'child_process'
import { createTeardown } from 'fs-teardown'
import { fromTemp, promisifyChildProcess } from '../../../support/utils'

const fsMock = createTeardown({
  rootDir: fromTemp('cli/init'),
  paths: {
    'package.json': JSON.stringify({
      name: 'package-name',
    }),
  },
})

const cliPath = require.resolve('../../../../cli/index.js')

function readJson(filePath: string) {
  const rawContent = fs.readFileSync(filePath, 'utf8')
  try {
    const content = JSON.parse(rawContent)
    return content
  } catch (error) {
    return rawContent
  }
}

beforeAll(async () => {
  await fsMock.prepare()
})

beforeEach(async () => {
  await fsMock.reset()
})

afterAll(async () => {
  jest.restoreAllMocks()
  await fsMock.cleanup()
})

test('copies the worker script into an existing directory without errors', async () => {
  await fsMock.create({
    public: null,
  })

  const init = await promisifyChildProcess(
    exec(`node ${cliPath} init ${fsMock.resolve('public')} --no-save`),
  )

  // Does not produce any errors.
  expect(init.stderr).toEqual('')

  // Creates the worker script at the given path.
  expect(fs.existsSync(fsMock.resolve('public/mockServiceWorker.js'))).toEqual(
    true,
  )

  // Notifies the user about the created script.
  expect(init.stdout).toContain('Service Worker successfully created')

  // Does not change the package.json.
  expect(readJson(fsMock.resolve('package.json'))).toEqual({
    name: 'package-name',
  })
})

test('creates the directory if it does not exist', async () => {
  const { stderr } = await promisifyChildProcess(
    exec(
      `node ${cliPath} init ${fsMock.resolve('public/nested/path')} --no-save`,
    ),
  )

  // Does not produce any errors.
  expect(stderr).toEqual('')
  expect(
    fs.existsSync(fsMock.resolve('public/nested/path/mockServiceWorker.js')),
  ).toEqual(true)
})

test('saves the worker directory in package.json when none are present', async () => {
  await fsMock.create({
    public: null,
  })

  const init = await promisifyChildProcess(
    exec(`node ${cliPath} init ${fsMock.resolve('public')} --save`, {
      cwd: fsMock.resolve(),
    }),
  )

  expect(init.stderr).toEqual('')
  expect(init.stdout).toContain(
    'In order to ease the future updates to the worker script,\nwe recommend saving the path to the worker directory in your package.json.',
  )
  expect(init.stdout).toContain(
    `Writing "msw.workerDirectory" to "${fsMock.resolve('package.json')}"...`,
  )
  expect(fs.existsSync(fsMock.resolve('public/mockServiceWorker.js')))
  expect(readJson(fsMock.resolve('package.json'))).toEqual({
    name: 'package-name',
    msw: {
      workerDirectory: 'public',
    },
  })
})

test('warns when current public directory does not match the saved directory from package.json', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'package-name',
      msw: {
        workerDirectory: 'dist',
      },
    }),
    public: null,
  })

  const init = await promisifyChildProcess(
    exec(`node ${cliPath} init ${fsMock.resolve('public')} --save`, {
      cwd: fsMock.resolve('.'),
    }),
  )

  expect(init.stderr).toEqual('')
  expect(init.stdout).toContain(
    'The "msw.workerDirectory" in your package.json ("dist")\nis different from the worker directory used right now ("public").',
  )
  expect(init.stdout).toContain(
    `Writing "msw.workerDirectory" to "${fsMock.resolve('package.json')}"...`,
  )
  expect(fs.existsSync(fsMock.resolve('public/mockServiceWorker.js')))
  expect(readJson(fsMock.resolve('package.json'))).toEqual({
    name: 'package-name',
    msw: {
      workerDirectory: 'public',
    },
  })
})

test('does not produce eslint errors or warnings', async () => {
  await fsMock.create({
    '.eslintrc.json': JSON.stringify({
      rules: {
        'no-warning-comments': [
          'warn',
          // intentionally degenerate config to cause a warning in the initial comment
          { terms: ['mock'], location: 'anywhere' },
        ],
      },
    }),
    public: null,
  })

  const init = await promisifyChildProcess(
    exec(`node ${cliPath} init ${fsMock.resolve('public')} --no-save`),
  )
  expect(init.stderr).toEqual('')

  const eslint = await promisifyChildProcess(
    exec(path.resolve(`node_modules/.bin/eslint ${fsMock.resolve()}`)),
  )
  expect(eslint.stdout).toEqual('')
  expect(eslint.stderr).toEqual('')
})

test('errors and shuts down if creating a directory fails', async () => {
  const init = require('../../../../cli/init')
  const error = new Error('Could not create this directory')
  jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(error)

  const exitSpy = jest.spyOn(process, 'exit').mockImplementationOnce(() => {
    throw error
  })

  const consoleSpy = jest
    .spyOn(console, 'error')
    .mockImplementationOnce(jest.fn())

  const publicDir = 'public'

  await expect(init({ publicDir, save: false })).rejects.not.toBeUndefined()

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('Failed to create a Service Worker'),
    expect.stringContaining(publicDir),
    error,
  )
  expect(exitSpy).toHaveBeenCalledWith(1)
})
