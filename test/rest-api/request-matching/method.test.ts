import * as path from 'path'
import { bootstrap, BootstrapApi } from '../../support/bootstrap'

describe('REST: Request matching (method)', () => {
  let api: BootstrapApi

  beforeAll(async () => {
    api = await bootstrap(path.resolve(__dirname, 'method.client'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  describe('given mocked a POST request to "https://api.github.com/users/:username"', () => {
    it('should mock a POST request to the matched URL', async () => {
      await api.page.click('[data-test-id="button-post"]')
      const res = await api.page.waitForResponse(
        'https://api.github.com/users/octocat',
      )
      const responseBody = await res.json()

      expect(res.fromServiceWorker()).toBe(true)
      expect(responseBody).toEqual({
        mocked: true,
      })
    })

    it('should not mock a GET request to the matched URL', async () => {
      await api.page.click('[data-test-id="button-get"]')
      const res = await api.page.waitForResponse(
        'https://api.github.com/users/octocat',
      )

      // All outgoing requests go through the Service Worker,
      // thus their responses, even if real, are marked as those
      // sent by the Service Worker.
      expect(res.fromServiceWorker()).toBe(true)

      const responseBody = await res.json()
      expect(responseBody).not.toHaveProperty('mocked', true)
    })
  })
})
