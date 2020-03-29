import * as fs from 'fs'
import * as path from 'path'
import { SERVICE_WORKER_SOURCE_PATH } from '../../config/constants'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

const copyServiceWorker = require('../../config/IntegrityWebpackPlugin/utils/copyServiceWorker')

describe('Integrity check', () => {
  describe('given a Service Worker with the latest published integrity', () => {
    let api: TestAPI

    beforeAll(async () => {
      api = await runBrowserWith(
        path.resolve(__dirname, 'integrity-check-valid.mocks.ts'),
      )
    })

    afterAll(() => {
      return api.cleanup()
    })

    it('should activate without errors', async () => {
      const errorMessages: string[] = []

      api.page.on('console', function(message) {
        if (message.type() === 'error') {
          errorMessages.push(message.text())
        }
      })

      await api.page.goto(api.origin, {
        waitUntil: 'networkidle0',
      })

      expect(errorMessages).toHaveLength(0)
    })

    it('should have the mocking enabled', async () => {
      const REQUEST_URL = 'https://api.github.com/users/octocat'
      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(body).toEqual({
        mocked: true,
      })
    })
  })

  describe('given a Service Worker with a non-matching integrity', () => {
    let api: TestAPI
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

      api = await runBrowserWith(
        path.resolve(__dirname, 'integrity-check-invalid.mocks.ts'),
      )
    })

    afterAll(() => {
      fs.unlinkSync(TEMP_SERVICE_WORKER_PATH)
      return api.cleanup()
    })

    it('should throw a meaningful error in the console', async () => {
      const errors: string[] = []

      api.page.on('console', function(message) {
        if (message.type() === 'error') {
          errors.push(message.text())
        }
      })

      // Open the page anew to trigger the console listener
      await api.page.goto(api.origin, {
        waitUntil: 'networkidle0',
      })

      const integrityError = errors.find((message) => {
        return message.startsWith(`[MSW] Detected outdated Service Worker`)
      })

      expect(integrityError).toBeTruthy()
    })

    it('should still leave the mocking enabled', async () => {
      const REQUEST_URL = 'https://api.github.com/users/octocat'
      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(body).toEqual({
        mocked: true,
      })
    })
  })
})
