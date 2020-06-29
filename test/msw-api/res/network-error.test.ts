import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'network-error.mocks.ts'),
  )
})

afterAll(() => runtime.cleanup())

test('res.networkError causes Fetch API to throw error', async () => {
  expect(runtime.request({ url: `${runtime.origin}/user` })).toThrow()
})
