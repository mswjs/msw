import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

test('mocks a GraphQL error response', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'errors.mocks.ts'),
  )

  const res = await executeOperation(runtime.page, {
    query: `
      query Login {
        user {
          id
        }
      }
    `,
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).not.toHaveProperty('data')
  expect(body).toHaveProperty('errors', [
    {
      message: 'This is a mocked error',
      locations: [
        {
          line: 1,
          column: 2,
        },
      ],
    },
  ])

  return runtime.cleanup()
})
