import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'

test('errors when attempting to run the worker in a NodeJS environment', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'browser.mocks.ts'),
  )

  const exceptions: string[] = []

  runtime.page.on('pageerror', (error) => {
    exceptions.push(error.message)
  })
  await runtime.reload()

  const nodeMessage = exceptions.find((message) => {
    return message.startsWith(
      'Error: [MSW] Failed to execute `setupServer` in the environment that is not NodeJS',
    )
  })

  expect(nodeMessage).toBeTruthy()

  return runtime.cleanup()
})
