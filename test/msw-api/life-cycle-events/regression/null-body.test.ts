import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'
import { sleep } from '../../../support/utils'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'null-body.mocks.ts'))
}

test('lifecycle mothod should support null body', async () => {
  let error
  const runtime = await createRuntime()

  runtime.page.on('pageerror', (err) => {
    error = err
  })

  await runtime.request({
    url: 'https://test.mswjs.io/api/books',
  })
  await sleep(500)

  expect(error).not.toBeDefined()

  return runtime.cleanup()
})
