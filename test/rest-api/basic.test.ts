import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Basic example', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'basic.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  it('should receive mocked response', async () => {
    const res = await test.request({
      url: 'https://api.github.com/users/octocat',
    })
    const body = await res.json()

    expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
    expect(res.status()).toBe(200)
    expect(body).toEqual({
      name: 'John Maverick',
      originalUsername: 'octocat',
    })
  })
})
