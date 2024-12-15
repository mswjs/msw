import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { createTeardown } from 'fs-teardown'
import { fromTemp } from '../support/utils'
import * as packageJson from '../../package.json'

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

      // Pack the current state of the "msw" package.
      execSync(`pnpm pack --pack-destination ${fsMock.resolve('.')}`, {
        stdio: [null, null, 'inherit'],
      })

      // Install "msw" from the tarball into the dummy project.
      const installCommand = await fsMock.exec(
        `npm install msw-${packageJson.version}.tgz`,
      )
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

      execSync(`pnpm pack --pack-destination ${fsMock.resolve('.')}`, {
        stdio: [null, null, 'inherit'],
      })

      const installCommand = await fsMock.exec(
        `npm install msw-${packageJson.version}.tgz`,
      )
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
