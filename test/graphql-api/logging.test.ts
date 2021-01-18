import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'
import { captureConsole, filterLibraryLogs } from '../support/captureConsole'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'logging.mocks.ts'))
}

test('logs out GraphQL queries', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page, filterLibraryLogs)

  await executeOperation(runtime.page, {
    query: `
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
  })

  const queryMessage = messages.startGroupCollapsed.find((text) => {
    return text.includes('GetUserDetail')
  })

  expect(queryMessage).toMatch(/\d{2}:\d{2}:\d{2}/)
  expect(queryMessage).toContain('GetUserDetail')
  expect(queryMessage).toContain('200')

  return runtime.cleanup()
})

test('logs out GraphQL mutations', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page, filterLibraryLogs)

  await executeOperation(runtime.page, {
    query: `
      mutation Login {
        user {
          id
        }
      }
    `,
  })

  const mutationMessage = messages.startGroupCollapsed.find((text) => {
    return text.includes('Login')
  })

  expect(mutationMessage).toMatch(/\d{2}:\d{2}:\d{2}/)
  expect(mutationMessage).toContain('Login')
  expect(mutationMessage).toContain('200')

  return runtime.cleanup()
})
