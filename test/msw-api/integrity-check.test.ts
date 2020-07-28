import * as fs from 'fs'
import * as path from 'path'
import { SERVICE_WORKER_SOURCE_PATH } from '../../config/constants'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import { captureConsole } from '../support/captureConsole'
import copyServiceWorker from '../../config/copyServiceWorker'

describe('Integrity check', () => {
  describe('given a Service Worker with the latest published integrity', () => {
    let runtime: TestAPI

    beforeAll(async () => {
      runtime = await runBrowserWith(
        path.resolve(__dirname, 'integrity-check-valid.mocks.ts'),
      )
    })

    afterAll(() => {
      return runtime.cleanup()
    })

    it('should activate without errors', async () => {
      const { messages } = captureConsole(runtime.page)
      await runtime.reload()

      expect(messages.error).toHaveLength(0)
    })

    it('should have the mocking enabled', async () => {
      const res = await runtime.request({
        url: 'https://api.github.com/users/octocat',
      })
      const headers = res.headers()
      const body = await res.json()

      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        mocked: true,
      })
    })
  })

  describe('given a Service Worker with a non-matching integrity', () => {
    let runtime: TestAPI
    const TEMP_SERVICE_WORKER_PATH = path.resolve(
      __dirname,
      '../..',
      'tmp/mockServiceWorker-outdated.js',
    )

    beforeAll(async () => {
      // Manually create a Service Worker file with invalid integrity
      await copyServiceWorker(
        SERVICE_WORKER_SOURCE_PATH,
        TEMP_SERVICE_WORKER_PATH,
        'intentionally-invalid-checksum',
      )

      runtime = await runBrowserWith(
        path.resolve(__dirname, 'integrity-check-invalid.mocks.ts'),
      )
    })

    afterAll(() => {
      fs.unlinkSync(TEMP_SERVICE_WORKER_PATH)
      return runtime.cleanup()
    })

    it('should throw a meaningful error in the console', async () => {
      const { messages } = captureConsole(runtime.page)

      // Open the page anew to trigger the console listener
      await runtime.reload()

      const integrityError = messages.error.find((text) => {
        return text.includes('[MSW] Detected outdated Service Worker')
      })

      expect(integrityError).toBeTruthy()
    })

    it('should still leave the mocking enabled', async () => {
      const res = await runtime.request({
        url: 'https://api.github.com/users/octocat',
      })
      const headers = res.headers()
      const body = await res.json()

      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        mocked: true,
      })
    })
  })
})
