/**
 * @jest-environment node
 */
import * as fs from 'fs'
import { execSync } from 'child_process'
import { createTeardown } from 'fs-teardown'
import { fromTemp } from '../../support/utils'

const fsMock = createTeardown({
  rootDir: fromTemp('auto-update-worker'),
  paths: {
    'package.json': JSON.stringify({
      name: 'example',
      msw: {
        workerDirectory: 'public',
      },
    }),
    public: null,
  },
})

beforeAll(async () => {
  await fsMock.prepare()
})

afterAll(async () => {
  await fsMock.cleanup()
})

test('updates the worker script on the postinstall hook', async () => {
  // Pack the current state of the "msw" package.
  execSync(`yarn pack --filename ${fsMock.resolve('msw.tgz')}`, {
    stdio: 'inherit',
  })

  // Install "msw" from the tarball into the dummy project.
  execSync('npm install msw.tgz', {
    cwd: fsMock.resolve(),
    stdio: 'inherit',
  })

  // Asset the worker script has been created/updated.
  expect(fs.existsSync(fsMock.resolve('public/mockServiceWorker.js'))).toEqual(
    true,
  )
})
