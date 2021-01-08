import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'
import { sleep } from '../../../support/utils'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'null-body.mocks.ts'))
}

test('lifecycle mothod should support null body', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  await runtime.request({
    url: 'https://test.mswjs.io/api/books',
  })
  await sleep(500)

  expect(messages.warning).toEqual([`[response:mocked] null`])

  return runtime.cleanup()
})
