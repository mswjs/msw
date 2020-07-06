import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'

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
  const messages = []
  runtime.page.on('console', function (message) {
    messages.push(message)
  })
  const res = await runtime.request({
    url: `${runtime.origin}/user`,
  })
  const body = await res.json()
  expect(body).toMatchObject({ firstName: 'John' })
  expect(
    messages.filter((message) => message.text() === '[test] first caught'),
  ).toHaveLength(1)
  expect(
    messages.filter((message) => message.text() === '[test] second caught'),
  ).toHaveLength(1)
})
