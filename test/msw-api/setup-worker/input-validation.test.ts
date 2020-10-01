import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'

test('should throw an error if setupWorker is called with a wrong arg', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'input-validation.mocks.ts'),
  )

  const exceptions: string[] = []

  runtime.page.on('pageerror', (error) => {
    exceptions.push(error.message)
  })
  await runtime.reload()

  const nodeMessage = exceptions.find((message) => {
    return message.startsWith(
      `Error: [MSW] Failed to call "setupWorker": received a list of request handlers (setupWorker([a, b])), expected to receive each handler individually: setupWorker(a, b).`,
    )
  })

  expect(nodeMessage).toBeTruthy()

  return runtime.cleanup()
})
