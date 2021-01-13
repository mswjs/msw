import * as path from 'path'
import { runBrowserWith, TestAPI } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'variables.mocks.ts'))
}

let runtime: TestAPI

beforeAll(async () => {
  runtime = await createRuntime()
})
afterAll(async () => {
  await runtime.cleanup()
})

test('can access variables from a GraphQL query', async () => {
  const res = await executeOperation(runtime.page, {
    query: `
      query GetGithubUser($username: String!) {
        user(login: $username) {
          firstName
          username
        }
      }
    `,
    variables: {
      username: 'octocat',
    },
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual({
    data: {
      user: {
        firstName: 'John',
        username: 'octocat',
      },
    },
  })
})

test('can access variables from a GraphQL mutation', async () => {
  const res = await executeOperation(runtime.page, {
    query: `
      mutation DeletePost($postId: String!) {
        deletePost(id: $postId) {
          postId
        }
      }
    `,
    variables: {
      postId: 'abc-123',
    },
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual({
    data: {
      deletePost: {
        postId: 'abc-123',
      },
    },
  })
})

test('returns an empty object when accessing variables from a GraphQL operation without them', async () => {
  const res = await executeOperation(runtime.page, {
    query: `
        query GetActiveUser {
          user {
            id
          }
        }
      `,
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual({
    data: {
      user: {
        id: 1,
      },
    },
  })
})
