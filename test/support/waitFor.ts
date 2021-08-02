import { sleep } from './utils'

const RETRY_INTERVAL = 500
const MAX_RETRIES = 5

export async function waitFor(fn: () => unknown): Promise<void> {
  for (let retryCount = 1; retryCount <= MAX_RETRIES; retryCount++) {
    await sleep(RETRY_INTERVAL)

    try {
      await fn()
      return
    } catch (error) {
      if (retryCount === MAX_RETRIES) {
        throw error
      }
    }
  }
}
