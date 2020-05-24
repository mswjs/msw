import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'

const PROJECT_ROOT = path.resolve(__dirname, '../../..')
const TMP_DIR_PATH = path.resolve(PROJECT_ROOT, 'tmp')
const TEST_DIR_PATH = path.resolve(TMP_DIR_PATH, 'cli/init')

describe('init', () => {
  beforeAll(() => {
    return fs.promises.mkdir(TEST_DIR_PATH, { recursive: true })
  })

  afterAll(() => {
    return fs.promises.rmdir(TEST_DIR_PATH, { recursive: true })
  })

  describe('given an existing public directory', () => {
    let capturedError: Error
    let capturedStdout: string

    beforeAll((done) => {
      // Create a public directory
      fs.mkdirSync(path.resolve(TEST_DIR_PATH, 'public'), {
        recursive: true,
      })

      // Run the CLI command
      exec(
        'cli/index.js init ./tmp/cli/init/public',
        {
          cwd: PROJECT_ROOT,
        },
        (error, stdout) => {
          capturedError = error
          capturedStdout = stdout
          done()
        },
      )
    })

    it('should execute without errors', () => {
      expect(capturedError).toBeNull()
    })

    it('should copy the service worker file to the given directory', () => {
      expect(
        fs.existsSync(
          path.resolve(TEST_DIR_PATH, 'public/mockServiceWorker.js'),
        ),
      ).toBe(true)
    })

    it('should print a success message into stdout', () => {
      expect(capturedStdout).toContain('Service Worker successfully created')
    })
  })

  describe('given a non-existing public directory', () => {
    let capturedError: Error

    beforeAll((done) => {
      exec(
        'cli/index.js init ./tmp/cli/init/missing-public',
        {
          cwd: PROJECT_ROOT,
        },
        (error) => {
          capturedError = error
          done()
        },
      )
    })

    it('should return an exception', () => {
      expect(capturedError).not.toBeNull()
      expect(capturedError.message).toContain(
        'Provided directory does not exist',
      )
    })

    it('should not copy the service worker file', () => {
      expect(
        fs.existsSync(
          path.resolve(TEST_DIR_PATH, 'missing-public/mockServiceWorker.js'),
        ),
      ).toBe(false)
    })
  })
})
