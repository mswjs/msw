import type { sse } from 'msw'
import type { setupWorker } from 'msw/browser'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

test('runs cleanup after the event source is closed by the client', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  const finalizedAt = new DeferredPromise<number>()
  await page.exposeFunction('notifyFinalized', () => {
    finalizedAt.resolve(Date.now())
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ finalize }) => {
        finalize(() => window.notifyFinalized())
      }),
    )
    await worker.start()
  })

  const closedAt = await page.evaluate(() => {
    const source = new EventSource('http://localhost/stream')

    return new Promise<number>((resolve) => {
      source.addEventListener('open', () => {
        source.close()
        resolve(Date.now())
      })
    })
  })

  await expect(finalizedAt).resolves.toBeGreaterThanOrEqual(closedAt)
})

test('runs cleanup after the event source is closed by the handler', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  const finalizedAt = new DeferredPromise<number>()
  await page.exposeFunction('notifyFinalized', () => {
    finalizedAt.resolve(Date.now())
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client, finalize }) => {
        setTimeout(() => client.close(), 250)
        finalize(() => window.notifyFinalized())
      }),
    )
    await worker.start()
  })

  const closedAt = await page.evaluate(() => {
    const source = new EventSource('http://localhost/stream')

    return new Promise<number>((resolve) => {
      source.addEventListener('open', () => {
        resolve(Date.now())
      })
    })
  })

  await expect(finalizedAt).resolves.toBeGreaterThanOrEqual(closedAt)
})

test('runs cleanup after the event source is errored by the handler', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  const finalizedAt = new DeferredPromise<number>()
  await page.exposeFunction('notifyFinalized', () => {
    finalizedAt.resolve(Date.now())
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client, finalize }) => {
        setTimeout(() => client.error(), 250)
        finalize(() => window.notifyFinalized())
      }),
    )
    await worker.start()
  })

  const closedAt = await page.evaluate(() => {
    const source = new EventSource('http://localhost/stream')

    return new Promise<number>((resolve) => {
      source.addEventListener('open', () => {
        resolve(Date.now())
      })
    })
  })

  await expect(finalizedAt).resolves.toBeGreaterThanOrEqual(closedAt)
})

test('runs independent cleanups for parallel event sources', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  const finalizedIds: Array<string> = []
  await page.exposeFunction('notifyFinalized', (id: string) => {
    finalizedIds.push(id)
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ request, finalize }) => {
        const url = new URL(request.url)
        finalize(() => window.notifyFinalized(url.searchParams.get('id')))
      }),
    )
    await worker.start()
  })

  await page.evaluate(() => {
    const sourceOne = new EventSource('http://localhost/stream?id=one')
    const sourceTwo = new EventSource('http://localhost/stream?id=two')
    Object.assign(window, { sourceOne, sourceTwo })

    return Promise.all([
      new Promise((resolve) => {
        sourceOne.addEventListener('open', resolve)
      }),
      new Promise((resolve) => {
        sourceTwo.addEventListener('open', resolve)
      }),
    ])
  })

  // Closing one event source must only run the cleanups
  // scheduled for that connection.
  await page.evaluate(() => {
    window.sourceOne.close()
  })

  await expect.poll(() => finalizedIds).toEqual(['one'])

  await page.evaluate(() => {
    window.sourceTwo.close()
  })

  await expect.poll(() => finalizedIds).toEqual(['one', 'two'])
})

test('runs cleanup when the handler closes the event source synchronously', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  const finalized = new DeferredPromise<void>()
  await page.exposeFunction('notifyFinalized', () => {
    finalized.resolve()
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client, finalize }) => {
        finalize(() => window.notifyFinalized())
        client.close()
      }),
    )
    await worker.start()
  })

  await page.evaluate(() => {
    new EventSource('http://localhost/stream')
  })

  await expect(finalized).resolves.toBeUndefined()
})
