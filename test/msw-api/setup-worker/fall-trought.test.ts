import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'
import { captureConsole } from '../../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'fall-trought.mocks.ts'),
  )
})

afterAll(() => {
  return runtime.cleanup()
})

it('should fall-trought until a response is found', async () => {
  const { messages } = captureConsole(runtime.page)

  const res = await runtime.request({
    url: `${runtime.origin}/user`,
  })
  const body = await res.json()
  expect(body).toMatchObject({ firstName: 'John' })
  expect(
    messages.log.filter((message) => message === '[test] first caught'),
  ).toHaveLength(1)
  expect(
    messages.log.filter((message) => message === '[test] second caught'),
  ).toHaveLength(1)
})
