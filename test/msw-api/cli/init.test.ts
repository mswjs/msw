import * as fsExtra from 'fs-extra'
import * as path from 'path'
import { exec } from 'child_process'

const PROJECT_ROOT = path.resolve(__dirname, '../../..')
const TMP_DIR_PATH = path.resolve(PROJECT_ROOT, 'tmp')
const TEST_DIR_PATH = path.resolve(TMP_DIR_PATH, 'cli/init')

beforeAll(() => {
  fsExtra.mkdirSync(TEST_DIR_PATH, { recursive: true })
})

afterEach(() => {
  fsExtra.rmdirSync(TEST_DIR_PATH, { recursive: true })
})

test('copies the worker script into an existing directory without errors', (done) => {
  // Create a public directory.
  fsExtra.mkdirSync(path.resolve(TEST_DIR_PATH, 'public'), {
    recursive: true,
  })

  // Run the CLI command.
  exec(
    'node cli/index.js init ./tmp/cli/init/public',
    {
      cwd: PROJECT_ROOT,
    },
    (error, stdout) => {
      expect(error).toBeNull()
      expect(
        fsExtra.existsSync(
          path.resolve(TEST_DIR_PATH, 'public/mockServiceWorker.js'),
        ),
      ).toBe(true)
      expect(stdout).toContain('Service Worker successfully created')

      done()
    },
  )
})

test('returns an exception and does not copy the worker script given a non-existing directory', (done) => {
  exec(
    'node cli/index.js init ./tmp/cli/init/missing-public',
    {
      cwd: PROJECT_ROOT,
    },
    (error) => {
      expect(error).not.toBeNull()
      expect(error.message).toContain('Provided directory does not exist')
      expect(
        fsExtra.existsSync(
          path.resolve(TEST_DIR_PATH, 'missing-public/mockServiceWorker.js'),
        ),
      ).toBe(false)

      done()
    },
  )
})
