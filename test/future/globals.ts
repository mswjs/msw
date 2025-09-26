import * as vitest from 'vitest'
import { type SetupWorker, setupWorker } from 'msw/browser'

interface Fixtures {
  worker: SetupWorker
}

const worker = setupWorker()

export const it = vitest.it.extend<Fixtures>({
  worker: async ({}, use) => {
    await worker.start({
      quiet: true,
    })

    await use(worker)
    worker.resetHandlers()
  },
})

export const beforeAll = vitest.beforeAll
export const beforeEach = vitest.beforeEach<Fixtures>
export const afterEach = vitest.afterEach<Fixtures>
export const afterAll = vitest.afterAll
