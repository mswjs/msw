import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { spawnSync } from 'node:child_process'
import { createTeardown } from 'fs-teardown'
import { fromTemp } from '../support/utils'

const fsMock = createTeardown({
  rootDir: fromTemp('cli/init'),
})

const CLI_PATH = url.fileURLToPath(
  new URL('../../cli/index.js', import.meta.url),
)

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
  spawnSync('pnpm', ['build'])
  await fsMock.prepare()
})

beforeEach(async () => {
  await fsMock.reset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(async () => {
  await fsMock.cleanup()
})

async function init(inlineArgs: Array<string>): ReturnType<typeof fsMock.exec> {
  const result = await fsMock.exec(
    `node ${CLI_PATH} init ${inlineArgs.join(' ')}`,
  )

  return {
    ...result,
    // Strip stdout from color unicode characters:
    stdout: result.stdout.replace(/\x1b\[\d+m/gi, ''),
    stderr: result.stderr.replace(/\x1b\[\d+m/gi, ''),
  }
}

test('copies the script to a given path without saving', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'test',
    }),
  })

  const initCommand = await init([
    fsMock.resolve('./public'),
    /**
     * @note Pass the "--no-save" flag to prevent the "init" command
     * from spawning a "Would you like to save the path" prompt.
     */
    '--no-save',
  ])

  expect(initCommand.stderr).toBe('')
  expect(initCommand.stdout).toContain(
    `Worker script successfully copied!\n  - ${fsMock.resolve('public')}`,
  )
  expect(fs.existsSync(fsMock.resolve('public/mockServiceWorker.js'))).toBe(
    true,
  )
  // Must not write anything to package.json
  expect(readJson(fsMock.resolve('package.json'))).toEqual({
    name: 'test',
  })
})

test('saves the path in "msw.workerDirectory" if the "--save" flag was provided', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'test',
    }),
  })

  const initCommand = await init([fsMock.resolve('./public'), '--save'])

  expect(initCommand.stderr).toBe('')
  expect(initCommand.stdout).toContain(
    `Worker script successfully copied!\n  - ${fsMock.resolve('public')}`,
  )
  expect(fs.existsSync(fsMock.resolve('public/mockServiceWorker.js'))).toBe(
    true,
  )
  expect(readJson(fsMock.resolve('package.json'))).toMatchObject({
    msw: {
      workerDirectory: ['public'],
    },
  })
})

test('deduplicates saved paths in "msw.workerDirectory" (using plain string)', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'test',
      msw: {
        /**
         * @note Use the plain string value that most users have.
         */
        workerDirectory: 'public',
      },
    }),
  })

  const initCommand = await init(['./public', '--save'])

  expect(initCommand.stderr).toBe('')
  expect(fs.existsSync(fsMock.resolve('public/mockServiceWorker.js'))).toBe(
    true,
  )
  expect(readJson(fsMock.resolve('package.json'))).toMatchObject({
    msw: {
      // The plain string value will be left as-is because no
      // updates are necessary to package.json
      workerDirectory: 'public',
    },
  })
})

test('deduplicates saved paths in "msw.workerDirectory" (using array)', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'test',
      msw: {
        workerDirectory: ['public', 'another'],
      },
    }),
  })

  const initCommand = await init(['./public', '--save'])

  expect(initCommand.stderr).toBe('')
  expect(fs.existsSync(fsMock.resolve('public/mockServiceWorker.js'))).toBe(
    true,
  )
  expect(readJson(fsMock.resolve('package.json'))).toMatchObject({
    msw: {
      workerDirectory: ['public', 'another'],
    },
  })
})

test('does not save the path if the "--no-save" flag was provided', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'test',
      msw: {
        workerDirectory: ['public'],
      },
    }),
  })

  const initCommand = await init(['./static', '--no-save'])

  expect(initCommand.stderr).toBe('')
  expect(fs.existsSync(fsMock.resolve('static/mockServiceWorker.js'))).toBe(
    true,
  )
  expect(readJson(fsMock.resolve('package.json'))).toMatchObject({
    msw: {
      workerDirectory: ['public'],
    },
  })
})

test('adds multiple paths to "msw.workerDirectory"', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'example',
    }),
  })

  await init(['one', '--save'])

  expect(fs.existsSync(fsMock.resolve('one/mockServiceWorker.js'))).toBe(true)
  expect(readJson(fsMock.resolve('package.json'))).toMatchObject({
    msw: {
      workerDirectory: ['one'],
    },
  })

  await init(['two', '--save'])
  expect(fs.existsSync(fsMock.resolve('two/mockServiceWorker.js'))).toBe(true)
  expect(readJson(fsMock.resolve('package.json'))).toMatchObject({
    msw: {
      workerDirectory: ['one', 'two'],
    },
  })
})

test('throws if creating a directory under path failed', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'example',
    }),
  })

  /**
   * @note Require the "init" command source
   * so that the "fs" mocks could apply.
   */
  // @ts-expect-error
  const { init } = await import('../../cli/init.js')

  // Mock the "mkdir" method throwing an error.
  const error = new Error('Failed to create directory')
  vi.spyOn(fs.promises, 'mkdir').mockRejectedValue(error)

  const exitSpy = vi.spyOn(process, 'exit').mockImplementationOnce(() => {
    throw error
  })
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementationOnce(() => void 0)

  const initCommandPromise = init({
    _: [null, './does/not/exist'],
    save: false,
  })

  await expect(initCommandPromise).rejects.toThrowError(error)
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining(`Failed to copy the worker script at`),
    // The absolute public directory path will be resolved
    // against CWD, and not "fsMock". No need to assert it.
    expect.any(String),
    error,
  )
  expect(exitSpy).toHaveBeenCalledWith(1)
})

test('does not copy the script to saved paths if public directory was provided', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'example',
      msw: {
        workerDirectory: ['one', 'two'],
      },
    }),
  })

  const initCommand = await init(['three', '--save'])

  expect(initCommand.stderr).toBe('')
  expect(initCommand.stdout).toContain('- three')
  expect(initCommand.stdout).not.toContain('- one')
  expect(initCommand.stdout).not.toContain('- two')

  // Must not copy the worker script to stored paths
  // when the "init" command is called with a new path.
  expect(fs.existsSync(fsMock.resolve('one/mockServiceWorker.js'))).toBe(false)
  expect(fs.existsSync(fsMock.resolve('two/mockServiceWorker.js'))).toBe(false)

  // Must copy the worker sript only to the provided path.
  expect(fs.existsSync(fsMock.resolve('three/mockServiceWorker.js'))).toBe(true)
})

test('copies the script to all saved paths if the public directory was not provided', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'test',
      msw: {
        workerDirectory: ['packages/one/public', 'packages/two/static'],
      },
    }),
  })

  const initCommand = await init([])

  expect(initCommand.stderr).toBe('')
  expect(
    fs.existsSync(fsMock.resolve('packages/one/public/mockServiceWorker.js')),
  ).toBe(true)
  expect(
    fs.existsSync(fsMock.resolve('packages/two/static/mockServiceWorker.js')),
  ).toBe(true)
  expect(readJson(fsMock.resolve('package.json'))).toMatchObject({
    msw: {
      workerDirectory: ['packages/one/public', 'packages/two/static'],
    },
  })
})

test('throws when called with "--save" flag and without the public directory', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'test',
      msw: {
        workerDirectory: ['public'],
      },
    }),
  })

  const initCommandPromise = init(['--save'])

  // Must throw a meaningful arrow about a no-op "--save" flag.
  await expect(initCommandPromise).rejects.toThrowError(
    `Failed to copy the worker script: cannot call the "init" command without a public directory but with the "--save" flag. Either drop the "--save" flag to copy the worker script to all paths listed in "msw.workerDirectory", or add an explicit public directory to the command, like "npx msw init ./public".`,
  )

  // Must not modify the package.json.
  expect(readJson(fsMock.resolve('package.json'))).toEqual({
    name: 'test',
    msw: {
      workerDirectory: ['public'],
    },
  })

  // Must not copy the worker script.
  expect(
    expect(fs.existsSync(fsMock.resolve('public/mockServiceWorker.js'))).toBe(
      false,
    ),
  )
})

test('prints the list of failed paths to copy', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'example',
      msw: {
        workerDirectory: ['one', 'problematic'],
      },
    }),
  })

  vi.spyOn(fs, 'copyFileSync').mockImplementation((_, dest) => {
    // Only fail one of the stored paths.
    if (dest.toString().includes('/problematic/')) {
      throw copyFileError
    }
  })

  // @ts-expect-error
  const { init } = await import('../../cli/init.js')
  const copyFileError = new Error('Failed to copy file')

  const consoleLogSpy = vi
    .spyOn(console, 'log')
    .mockImplementation(() => void 0)
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementationOnce(() => void 0)

  await init({
    // Calling "init" without the public directory
    // to trigger it to copy the worker script to all
    // stored paths at "msw.workerDirectory".
    _: [null],
    // Use a custom CWD so that the direct call to "init"
    // resolves the "package.json" from the "fsMock".
    cwd: fsMock.resolve('.'),
  })

  // Must still print the successful message if any paths succeeded.
  expect(consoleLogSpy).toHaveBeenCalledWith(
    expect.stringContaining('Worker script successfully copied!'),
  )
  expect(consoleLogSpy).toHaveBeenCalledWith(
    expect.stringContaining(
      `  - ${fsMock.resolve('one/mockServiceWorker.js')}`,
    ),
  )

  // Must print the failed paths.
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining(
      `Copying the worker script failed at following paths:`,
    ),
  )
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining(`  - ${fsMock.resolve('problematic')}`),
  )
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining(copyFileError.message),
  )
})

test('supports a mix of unix/windows paths in "workerDirectory"', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'example',
      msw: {
        // Use a mix of different path styles to emulate multiple developers
        // working from different operating systems.
        workerDirectory: [
          path.win32.join('public', 'windows-style'),
          'unix/style',
        ],
      },
    }),
  })

  const initCommand = await init([''])

  expect(initCommand.stderr).toBe('')
  expect(
    fs.existsSync(fsMock.resolve('public/windows-style/mockServiceWorker.js')),
  ).toBe(true)
  expect(fs.existsSync(fsMock.resolve('unix/style/mockServiceWorker.js'))).toBe(
    true,
  )

  const normalizedPaths = readJson(fsMock.resolve('package.json')).msw
    .workerDirectory

  // Expect normalized paths
  expect(normalizedPaths).toContain('public\\windows-style')
  expect(normalizedPaths).toContain('unix/style')
})

test('copies the script only to provided windows path in args', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'example',
      msw: {
        workerDirectory: ['unix/style'],
      },
    }),
  })

  const initCommand = await init([
    `"${path.win32.join('.', 'windows-style', 'new-folder')}"`,
    '--save',
  ])

  expect(initCommand.stderr).toBe('')
  expect(
    fs.existsSync(
      fsMock.resolve('windows-style/new-folder/mockServiceWorker.js'),
    ),
  ).toBe(true)
  expect(fs.existsSync(fsMock.resolve('unix/style/mockServiceWorker.js'))).toBe(
    false,
  )
})

test('copies the script only to provided unix path in args', async () => {
  await fsMock.create({
    'package.json': JSON.stringify({
      name: 'example',
      msw: {
        workerDirectory: [path.win32.join('windows-style', 'new-folder')],
      },
    }),
  })

  const initCommand = await init(['./unix/style', '--save'])

  expect(initCommand.stderr).toBe('')
  expect(fs.existsSync(fsMock.resolve('unix/style/mockServiceWorker.js'))).toBe(
    true,
  )
  expect(
    fs.existsSync(
      fsMock.resolve('windows-style/new-folder/mockServiceWorker.js'),
    ),
  ).toBe(false)
})
