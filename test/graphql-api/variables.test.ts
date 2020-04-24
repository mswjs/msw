import * as path from 'path'
import { Response } from 'puppeteer'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

describe('GraphQL: Variables', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'variables.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given a query with variables', () => {
    let res: Response
    let body: Record<string, any>

    beforeAll(async () => {
      res = await executeOperation(test.page, {
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
      body = await res.json()
    })

    it('should return 200 status code', () => {
      expect(res.status()).toBe(200)
    })

    it('should mock the response data', () => {
      expect(body).toEqual({
        data: {
          user: {
            firstName: 'John',
            username: 'octocat',
          },
        },
      })
    })
  })

  describe('given a mutation with variables', () => {
    let res: Response
    let body: Record<string, any>

    beforeAll(async () => {
      res = await executeOperation(test.page, {
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
      body = await res.json()
    })

    it('should return 200 status code', () => {
      expect(res.status()).toBe(200)
    })

    it('should mock the response data', () => {
      expect(body).toEqual({
        data: {
          deletePost: {
            postId: 'abc-123',
          },
        },
      })
    })
  })

  describe('given GraphQL operation without variables', () => {
    let res: Response
    let body: Record<string, any>

    beforeAll(async () => {
      res = await executeOperation(test.page, {
        query: `
            query GetActiveUser {
              user {
                id
              }
            }
          `,
      })
      body = await res.json()
    })

    it('should return 200 status code', () => {
      expect(res.status()).toBe(200)
    })

    it('should mock the response data', () => {
      expect(body).toEqual({
        data: {
          user: {
            id: 1,
          },
        },
      })
    })
  })
})
