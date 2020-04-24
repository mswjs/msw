import * as fs from 'fs'
import * as path from 'path'
import { SERVICE_WORKER_SOURCE_PATH } from '../../config/constants'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import copyServiceWorker from '../../config/copyServiceWorker'

describe('Integrity check', () => {
  describe('given a Service Worker with the latest published integrity', () => {
    let test: TestAPI

    beforeAll(async () => {
      test = await runBrowserWith(
        path.resolve(__dirname, 'integrity-check-valid.mocks.ts'),
      )
    })

    afterAll(() => {
      return test.cleanup()
    })

    it('should activate without errors', async () => {
      const errorMessages: string[] = []

      test.page.on('console', function (message) {
        if (message.type() === 'error') {
          errorMessages.push(message.text())
        }
      })

      await test.reload()

      expect(errorMessages).toHaveLength(0)
    })

    it('should have the mocking enabled', async () => {
      const res = await test.request({
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
    let test: TestAPI
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

      test = await runBrowserWith(
        path.resolve(__dirname, 'integrity-check-invalid.mocks.ts'),
      )
    })

    afterAll(() => {
      fs.unlinkSync(TEMP_SERVICE_WORKER_PATH)
      return test.cleanup()
    })

    it('should throw a meaningful error in the console', async () => {
      const errors: string[] = []

      test.page.on('console', function (message) {
        if (message.type() === 'error') {
          errors.push(message.text())
        }
      })

      // Open the page anew to trigger the console listener
      await test.reload()

      const integrityError = errors.find((message) => {
        return message.includes('[MSW] Detected outdated Service Worker')
      })

      expect(integrityError).toBeTruthy()
    })

    it('should still leave the mocking enabled', async () => {
      const res = await test.request({
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
