import fs from 'node:fs'
import { inject } from 'vitest'
import { createTeardown } from 'fs-teardown'
import { fromTemp } from '../support/utils'

const tarballPath = inject('tarballPath')

const fsMock = createTeardown({
  rootDir: fromTemp('worker-script-auto-update'),
})

describe(
  'worker script auto-update',
  {
    sequential: true,
    // These tests actually build, pack, and install MSW so they may take time.
    timeout: 60_000,
  },
  () => {
    beforeAll(async () => {
      await fsMock.prepare()
    })

    afterEach(async () => {
      await fsMock.reset()
    })

    afterAll(async () => {
      await fsMock.cleanup()
    })

    it('updates the worker script on the "postinstall" hook', async () => {
      await fsMock.create({
        'package.json': JSON.stringify({
          name: 'example',
          msw: {
            workerDirectory: 'public',
          },
        }),
      })

      // Install "msw" from the tarball into the dummy project.
      const installCommand = await fsMock.exec(`npm install ${tarballPath}`)
      expect(installCommand.stderr).toBe('')

      // Asset the worker script has been created/updated.
      expect(
        fs.existsSync(fsMock.resolve('public/mockServiceWorker.js')),
      ).toEqual(true)
    })

    it('updates multiple directories on the "postinstall" hook', async () => {
      await fsMock.create({
        'package.json': JSON.stringify({
          name: 'example-multiple-dirs',
          msw: {
            workerDirectory: ['./packages/one', './packages/two'],
          },
        }),
      })

      const installCommand = await fsMock.exec(`npm install ${tarballPath}`)
      /**
       * @note Cannot assert on the empty stderr because npm
       * writes to stderr if there's a new version of npm available.
       */
      // expect(installCommand.stderr).toBe('')

      expect(
        fs.existsSync(fsMock.resolve('packages/one/mockServiceWorker.js')),
      ).toEqual(true)
      expect(
        fs.existsSync(fsMock.resolve('packages/two/mockServiceWorker.js')),
      ).toEqual(true)
    })
  },
)
