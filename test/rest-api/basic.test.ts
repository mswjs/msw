import * as path from 'path'
import { BootstrapApi, bootstrap } from '../support/bootstrap'

// Increase the test timeout to allow webpack build
// and Puppeteer bootstrapping to take place.
jest.setTimeout(9999999)

describe('REST: Basic example', () => {
  let api: BootstrapApi

  beforeAll(async () => {
    api = await bootstrap(path.resolve(__dirname, 'basic.client.tsx'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  it('should receive mocked response', async () => {
    await api.page.click('button')
    const res = await api.page.waitForResponse(
      'https://api.github.com/users/octocat',
    )
    expect(res.fromServiceWorker()).toBe(true)

    const body = await res.json()
    expect(body).toEqual({
      name: 'John Maverick',
      originalUsername: 'octocat',
    })
  })
})
