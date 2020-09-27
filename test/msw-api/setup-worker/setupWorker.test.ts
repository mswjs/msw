import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'

test('should throw an error if setupWorker is called with a wrong arg', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'setupWorker.mocks.ts'),
  )

  const exceptions: string[] = []

  runtime.page.on('pageerror', (error) => {
    exceptions.push(error.message)
  })
  await runtime.reload()

  const nodeMessage = exceptions.find((message) => {
    return message.startsWith(
      `Error: [MSW] setupWorker function receive every handler as an arg. You should call it as setupWorker(...requestHandlers) with requestHandlers the array of handlers.`,
    )
  })

  expect(nodeMessage).toBeTruthy()

  return runtime.cleanup()
})
