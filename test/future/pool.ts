import { ProcessPool, RunnerTestCase, Vitest } from 'vitest/node'
import { createFileTask } from '@vitest/runner/utils'
import { chromium } from '@playwright/test'
import { Tinypool } from 'tinypool'

export default async function createPool(
  vitest: Vitest,
): Promise<Partial<ProcessPool>> {
  const browser = await chromium.launch({
    headless: true,
  })

  vitest.onCancel(async () => {
    await browser.close()
  })

  const pool = new Tinypool()

  return {
    name: 'browser-pool',
    async runTests(specs, invalidates) {
      const { project, moduleId } = specs[0]

      const fileTask = createFileTask(
        moduleId,
        project.config.root,
        project.name,
        'browser-pool',
      )
      fileTask.mode = 'run'
      fileTask.result = { state: 'pass' }

      const testTask: RunnerTestCase = {
        type: 'test',
        name: 'custom test',
        id: `${fileTask.id}_0`,
        context: {} as any,
        suite: fileTask,
        mode: 'run',
        meta: {},
        annotations: [],
        timeout: 0,
        file: fileTask,
      }

      fileTask.tasks.push(testTask)

      try {
        await pool.run(
          {
            files: [moduleId],
            invalidates,
            projectName: project.name,
            pool: 'browser-pool',
          },
          {
            filename: moduleId,
          },
        )

        testTask.result = {
          state: 'pass',
        }
      } catch (error) {
        if (error instanceof Error) {
          testTask.result = {
            state: 'fail',
            errors: [{ message: error.message }],
          }
        }
      }

      /**
       * @see https://github.com/vitest-dev/vitest/blob/7aebe5633a49675b4088ea70e2bb8e37dace55ee/test/cli/fixtures/custom-pool/pool/custom-pool.ts#L43
       */
      // @ts-expect-error Vitest internals.
      vitest._reportFileTask(fileTask)
    },
    async close() {
      await Promise.all([pool.destroy(), browser.close()])
    },
  }
}
