import * as fs from 'fs'
import { execSync } from 'child_process'
import { createTeardown, addFile, addDirectory } from 'fs-teardown'

test('updates the worker script on the postinstall hook', async () => {
  const { prepare, cleanup, getPath } = createTeardown(
    'tmp/auto-update-worker',
    addDirectory('public'),
    addFile('package.json', {
      name: 'example',
      msw: {
        workerDirectory: 'public',
      },
    }),
  )
  await prepare()

  // Pack the current state of the `msw` package.
  execSync(`yarn pack --filename ${getPath('msw.tgz')}`, {
    stdio: 'inherit',
  })

  // Install `msw` from the tarball into the dummy project.
  execSync('npm install msw.tgz', {
    cwd: getPath('.'),
    stdio: 'inherit',
  })

  // Asset the worker script has been created/updated.
  expect(fs.existsSync(getPath('public/mockServiceWorker.js'))).toBe(true)

  await cleanup()
})
