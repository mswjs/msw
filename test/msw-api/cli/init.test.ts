import * as fs from 'fs-extra'
import { exec } from 'child_process'
import { createTeardown, addFile, addDirectory } from 'fs-teardown'
import { promisifyChildProcess } from '../../support/utils'

function getFileContent(filePath: string) {
  const rawContent = fs.readFileSync(filePath, 'utf8')
  try {
    const content = JSON.parse(rawContent)
    return content
  } catch (error) {
    return rawContent
  }
}

test('copies the worker script into an existing directory without errors', async () => {
  const { prepare, getPath, cleanup } = createTeardown(
    './tmp/cli/init/success',
    addFile('package.json', {
      name: 'package-name',
    }),
    addDirectory('public'),
  )
  await prepare()

  const { stderr, stdout } = await promisifyChildProcess(
    exec(`node cli/index.js init ${getPath('public')} --no-save`),
  )

  // Does not produce any errors.
  expect(stderr).toBe('')

  // Creates the worker script at the given path.
  expect(fs.existsSync(getPath('public/mockServiceWorker.js'))).toBe(true)

  // Notifies the user about the created script.
  expect(stdout).toContain('Service Worker successfully created')

  // Does not change the package.json.
  expect(getFileContent(getPath('package.json'))).toEqual({
    name: 'package-name',
  })

  await cleanup()
})

test('throws an exception and does not copy the worker script given a non-existing directory', async () => {
  const { prepare, getPath, cleanup } = createTeardown(
    'tmp/cli/init/non-existing',
  )
  await prepare()

  const { stderr } = await promisifyChildProcess(
    exec(`node cli/index.js init ${getPath('non-existing-public')} --no-save`),
  )

  expect(stderr).not.toBe('')
  expect(stderr).toContain('directory does not exist')
  expect(
    fs.existsSync(getPath('non-existing-public/mockServiceWorker.js')),
  ).toBe(false)

  await cleanup()
})

test('saves the worker directory in package.json when none are present', async () => {
  const { prepare, getPath, cleanup } = createTeardown(
    'tmp/cli/init/save-directory-new',
    addFile('package.json', {
      name: 'package-name',
    }),
    addDirectory('public'),
  )
  await prepare()

  const { stderr, stdout } = await promisifyChildProcess(
    exec(`node ../../../../cli/index.js init ${getPath('public')} --save`, {
      cwd: getPath('.'),
    }),
  )

  expect(stderr).toBe('')
  expect(stdout).toContain(
    'In order to ease the future updates to the worker script,\nwe recommend saving the path to the worker directory in your package.json.',
  )
  expect(stdout).toContain(
    `Writing "msw.workerDirectory" to "${getPath('package.json')}"...`,
  )
  expect(fs.existsSync(getPath('public/mockServiceWorker.js')))
  expect(getFileContent(getPath('package.json'))).toEqual({
    name: 'package-name',
    msw: {
      workerDirectory: 'public',
    },
  })

  await cleanup()
})

test('warns when current public directory does not match the saved directory from package.json', async () => {
  const { prepare, getPath, cleanup } = createTeardown(
    'tmp/cli/init/save-directory-override',
    addFile('package.json', {
      name: 'package-name',
      msw: {
        workerDirectory: 'dist',
      },
    }),
    addDirectory('public'),
  )
  await prepare()

  const { stderr, stdout } = await promisifyChildProcess(
    exec(`node ../../../../cli/index.js init ${getPath('public')} --save`, {
      cwd: getPath('.'),
    }),
  )

  expect(stderr).toBe('')
  expect(stdout).toContain(
    'The "msw.workerDirectory" in your package.json ("dist")\nis different from the worker directory used right now ("public").',
  )
  expect(stdout).toContain(
    `Writing "msw.workerDirectory" to "${getPath('package.json')}"...`,
  )
  expect(fs.existsSync(getPath('public/mockServiceWorker.js')))
  expect(getFileContent(getPath('package.json'))).toEqual({
    name: 'package-name',
    msw: {
      workerDirectory: 'public',
    },
  })

  await cleanup()
})
